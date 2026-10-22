"""Bounded RSS/Atom imports: never fetch article bodies or URLs supplied by readers."""

import calendar
import hashlib
import ipaddress
import socket
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from html.parser import HTMLParser
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from xml.etree.ElementTree import ParseError

import feedparser
import urllib3
from defusedxml.common import DefusedXmlException
from defusedxml.ElementTree import fromstring
from django.db import transaction
from django.db.models import Q

from .catalog import APPROVED_FEED_URLS, GITHUB_COLLECTIONS
from .images import feed_image
from .models import Article, Source

MAX_FEED_BYTES = 2 * 1024 * 1024
MAX_ENTRIES = 100


class FeedError(ValueError):
    """Safe, bounded error text suitable for operator output."""


class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.hidden = 0

    def handle_starttag(self, tag, attrs):
        if tag in {"script", "style"}:
            self.hidden += 1
        elif not self.hidden:
            self.parts.append(" ")

    def handle_endtag(self, tag):
        if tag in {"script", "style"}:
            self.hidden = max(0, self.hidden - 1)
        elif not self.hidden:
            self.parts.append(" ")

    def handle_data(self, data):
        if not self.hidden:
            self.parts.append(data)


def plain_text(value, limit):
    parser = TextExtractor()
    parser.feed(str(value or ""))
    text = " ".join("".join(parser.parts).split()).replace("\x00", "")
    return text if len(text) <= limit else text[: limit - 1].rsplit(" ", 1)[0] + "…"


def canonical_url(value):
    """Conservative normalization: remove known tracking only, retain meaningful query order."""
    try:
        url = urlsplit(str(value).strip())
        if url.scheme.lower() not in {"http", "https"} or not url.hostname:
            raise ValueError
        if url.username or url.password or url.port not in {None, 80, 443}:
            raise ValueError
        host = url.hostname.encode("idna").decode("ascii").lower()
        # Article links are not fetched, but do not send readers to local services either.
        if host == "localhost" or "." not in host or host.endswith((".local", ".localhost")):
            raise ValueError
        try:
            address = ipaddress.ip_address(host)
        except ValueError:
            address = None
        if address and not address.is_global:
            raise ValueError
        port = url.port
        netloc = f"[{host}]" if ":" in host else host
        if port and not (
            url.scheme.lower() == "https"
            and port == 443
            or url.scheme.lower() == "http"
            and port == 80
        ):
            netloc += f":{port}"
        query = urlencode(
            [
                (k, v)
                for k, v in parse_qsl(url.query, keep_blank_values=True)
                if not k.lower().startswith("utm_") and k.lower() not in {"fbclid", "gclid"}
            ]
        )
        result = urlunsplit((url.scheme.lower(), netloc, url.path or "/", query, ""))
        if len(result.encode("utf-8")) > 2048 or any(ord(c) < 32 for c in result):
            raise ValueError
        return result
    except (ValueError, UnicodeError):
        raise FeedError("Invalid article URL.") from None


def fetch_feed(url):
    if url not in APPROVED_FEED_URLS:
        raise FeedError("Feed URL is not on the reviewed allowlist.")
    github = url in GITHUB_COLLECTIONS
    if github:
        from .repositories import collection_url

        url = collection_url(url)
    host = urlsplit(url).hostname
    try:
        addresses = [item[4][0] for item in socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)]
        if not addresses or any(not ipaddress.ip_address(ip).is_global for ip in addresses):
            raise FeedError("Feed resolves to a non-public address.")
        # Connect to the validated IP, retaining TLS SNI and hostname verification.
        # This prevents a second DNS lookup (DNS rebinding) and ignores proxy env vars.
        with urllib3.HTTPSConnectionPool(
            addresses[0],
            port=443,
            server_hostname=host,
            assert_hostname=host,
            cert_reqs="CERT_REQUIRED",
            timeout=urllib3.Timeout(connect=5, read=10),
            retries=False,
        ) as pool:
            response = pool.urlopen(
                "GET",
                urlsplit(url).path + ("?" + urlsplit(url).query if urlsplit(url).query else ""),
                headers={
                    "Host": host,
                    "User-Agent": "Worldline/0.2 (personal RSS reader)",
                    "Accept": "application/vnd.github+json"
                    if github
                    else "application/rss+xml, application/atom+xml, application/xml, text/xml",
                    "Accept-Encoding": "identity",
                },
                redirect=False,
                preload_content=False,
            )
            try:
                if response.status != 200:
                    raise FeedError(
                        f"Feed returned HTTP {response.status}; redirects are not followed."
                    )
                if response.headers.get("Content-Encoding", "identity").lower() != "identity":
                    raise FeedError("Compressed feed responses are not accepted.")
                data = bytearray()
                deadline = time.monotonic() + 30
                for chunk in response.stream(16384, decode_content=False):
                    data.extend(chunk)
                    if len(data) > MAX_FEED_BYTES:
                        raise FeedError("Feed exceeds the 2 MiB limit.")
                    if time.monotonic() > deadline:
                        raise FeedError("Feed download exceeded its time limit.")
                return bytes(data)
            finally:
                response.close()
    except (OSError, urllib3.exceptions.HTTPError) as exc:
        raise FeedError(f"Feed download failed ({type(exc).__name__}).") from None


def parsed_date(entry, key):
    # feedparser aliases updated to published for older feeds; check the original key first.
    if not dict.get(entry, key):
        return None
    value = dict.get(entry, f"{key}_parsed")
    try:
        return datetime.fromtimestamp(calendar.timegm(value), tz=timezone.utc) if value else None
    except (ValueError, OverflowError, TypeError):
        return None


@dataclass
class ImportResult:
    created: int = 0
    updated: int = 0
    unchanged: int = 0
    skipped: int = 0


def parse_entries(data):
    if len(data) > MAX_FEED_BYTES:
        raise FeedError("Feed exceeds the 2 MiB limit.")
    try:
        root = fromstring(data, forbid_dtd=True, forbid_entities=True, forbid_external=True)
    except (ParseError, DefusedXmlException, ValueError):
        raise FeedError("Feed is not safe, well-formed XML.") from None
    if root.tag.rsplit("}", 1)[-1].lower() not in {"rss", "feed", "rdf"}:
        raise FeedError("Response is not an RSS or Atom feed.")
    parsed = feedparser.parse(data)
    if root.tag.rsplit("}", 1)[-1].lower() == "rss":
        originals = root.findall("./channel/item")
    else:
        originals = [child for child in root if child.tag.rsplit("}", 1)[-1] in {"entry", "item"}]
    if len(originals) != len(parsed.entries):
        raise FeedError("Feed entries could not be matched to their XML provenance.")
    for entry, original in zip(parsed.entries, originals):
        # feedparser may synthesize summary from Atom content. Only keep a real
        # RSS description or Atom summary, never a full-text content element.
        if not any(
            child.tag.rsplit("}", 1)[-1] in {"description", "summary"} for child in original
        ):
            entry["summary"] = ""
    return parsed.entries[:MAX_ENTRIES]


def import_feed(source, data):
    if source.feed_url in GITHUB_COLLECTIONS:
        from .repositories import import_repositories

        return import_repositories(source, data)
    entries = parse_entries(data)
    result = ImportResult()
    # Lock the source so two manual imports cannot race on its stable entry IDs.
    with transaction.atomic():
        source = Source.objects.select_for_update().get(pk=source.pk)
        if not source.is_active or not source.topic_id:
            raise FeedError("Source is inactive or has no topic.")
        for entry in entries:
            try:
                url = canonical_url(entry.get("link", ""))
                title = plain_text(entry.get("title"), 300)
                if not title:
                    raise FeedError("Entry has no title.")
            except FeedError:
                result.skipped += 1
                continue
            # No fallback to content:encoded (potential full articles).
            summary = plain_text(entry.get("summary", ""), 600)
            entry_id = str(entry.get("id", ""))
            if len(entry_id) > 4096 or "\x00" in entry_id:
                result.skipped += 1
                continue
            entry_hash = hashlib.sha256(entry_id.encode()).hexdigest() if entry_id else ""
            match = Q(original_url=url)
            if entry_hash:
                match |= Q(source=source, source_entry_hash=entry_hash)
            matches = list(Article.objects.filter(match).order_by("pk")[:2])
            if len(matches) > 1 or matches and matches[0].source_id != source.pk:
                # A canonical URL already belongs to another identity: preserve provenance.
                result.skipped += 1
                continue
            image_url, image_credit = feed_image(entry, source)
            values = {
                "title": title,
                "summary": summary,
                "image_url": image_url,
                "image_credit": image_credit,
                "original_url": url,
                "topic_id": source.topic_id,
                "published_at": parsed_date(entry, "published"),
                "source_updated_at": parsed_date(entry, "updated"),
            }
            if entry_hash:
                values.update(source_entry_id=entry_id, source_entry_hash=entry_hash)
            if matches:
                article = matches[0]
                # Reused URLs with conflicting stable IDs must not overwrite an existing story.
                if (
                    entry_hash
                    and article.source_entry_hash
                    and article.source_entry_hash != entry_hash
                ):
                    result.skipped += 1
                    continue
                # A missing publication date must not erase the original known date.
                values = {k: v for k, v in values.items() if k != "published_at" or v is not None}
                changed = [k for k, v in values.items() if getattr(article, k) != v]
                if changed:
                    for key in changed:
                        setattr(article, key, values[key])
                    article.save(update_fields=changed)
                    result.updated += 1
                else:
                    result.unchanged += 1
            else:
                # A concurrent different source may insert the same URL; unique constraint wins.
                _, created = Article.objects.get_or_create(
                    original_url=url, defaults={"source": source, **values}
                )
                if created:
                    result.created += 1
                else:
                    result.skipped += 1
    return result
