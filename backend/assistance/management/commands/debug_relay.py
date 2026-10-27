"""Explicit local-only diagnostics; no response capture in normal web requests."""

import json

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from assistance import providers

EVIDENCE = [
    {
        "id": 1,
        "title": "Synthetic diagnostic fixture (not a real news report)",
        "url": "https://example.com/worldline-diagnostic",
        "publisher": "Worldline diagnostic fixture",
        "text": "A fictional research team received $12 million for a trial involving 12 people. "
        "The preliminary results do not establish that the treatment is safe or effective.",
        "kind": "feed_excerpt",
        "published_at": None,
    }
]


class Command(BaseCommand):
    help = (
        "Preview relay prompts, or send one synthetic request and inspect answer content locally."
    )
    requires_system_checks = []

    def add_arguments(self, parser):
        parser.add_argument("--send", action="store_true", help="Send ONE possibly billed request.")
        parser.add_argument(
            "--mode", choices=["summarize", "translate", "explain", "answer"], default="summarize"
        )

    def show(self, value):
        secrets = sorted(
            {
                str(getattr(settings, name, ""))
                for name in (
                    "SECRET_KEY",
                    "RELAY_API_KEY",
                    "OPENAI_API_KEY",
                    "BRAVE_SEARCH_API_KEY",
                    "LM_STUDIO_API_KEY",
                )
            }
            - {""},
            key=len,
            reverse=True,
        )

        def redact(item):
            if isinstance(item, str):
                for secret in secrets:
                    item = item.replace(secret, "[REDACTED]")
                return item
            if isinstance(item, dict):
                return {key: redact(value) for key, value in item.items()}
            if isinstance(item, list):
                return [redact(value) for value in item]
            return item

        # JSON escaping prevents provider text from executing terminal control sequences.
        self.stdout.write(json.dumps(redact(value), ensure_ascii=False, indent=2))

    def handle(self, *args, **options):
        if settings.AI_MODEL_PROVIDER != "relay":
            raise CommandError("This command requires AI_MODEL_PROVIDER=relay.")
        if options["send"] and not settings.DEBUG:
            raise CommandError("Live diagnostics require the existing local DEBUG=true setup.")
        try:
            config = providers.model_configuration()
        except providers.AssistanceError as exc:
            raise CommandError(exc.message) from None
        mode = options["mode"]
        schema = providers.evidence_schema([1], mode)
        question = (
            "Summarize the supplied text."
            if mode == "answer"
            else "Process only the provided text."
        )
        body = providers.chat_request_body(mode, question, EVIDENCE, schema, config)
        self.stdout.write("REQUEST PREVIEW (synthetic evidence; no credentials)")
        self.show(
            {"endpoint": config["endpoint"], "key_present": bool(config["key"]), "body": body}
        )
        if not options["send"]:
            self.stdout.write(
                "DRY RUN: no network request. Add --send for ONE possibly billed call."
            )
            return
        if not settings.AI_ENABLED or not config["key"] or not config["model"]:
            raise CommandError("Enable AI and configure the relay model/key before sending.")
        self.stdout.write(
            "Sending one request. No retries, search, database usage, quota or cache writes."
        )
        try:
            data = providers.request_json(
                "POST",
                config["endpoint"],
                {"Authorization": f"Bearer {config['key']}", "Content-Type": "application/json"},
                body,
                timeout_seconds=config["timeout"],
            )
        except providers.AssistanceError as exc:
            raise CommandError(f"Transport failed: {exc.code}. {exc.message}") from None
        choices = data.get("choices")
        choice = (
            choices[0]
            if isinstance(choices, list) and choices and isinstance(choices[0], dict)
            else {}
        )
        message = choice.get("message")
        message = message if isinstance(message, dict) else {}
        content = message.get("content")
        usage = data.get("usage")
        usage = usage if isinstance(usage, dict) else {}
        self.stdout.write(
            "RESPONSE (selected fields; credential-redacted; content is not repaired)"
        )
        self.show(
            {
                "reported_model": data.get("model") if isinstance(data.get("model"), str) else None,
                "finish_reason": choice.get("finish_reason")
                if isinstance(choice.get("finish_reason"), str)
                else None,
                "content_type": type(content).__name__,
                "content": content[:20000] if isinstance(content, str) else None,
                "display_truncated": isinstance(content, str) and len(content) > 20000,
                "reasoning_present": bool(message.get("reasoning_content")),
                "refusal_present": bool(message.get("refusal")),
                "usage": {
                    k: usage.get(k) if type(usage.get(k)) is int else None
                    for k in ("prompt_tokens", "completion_tokens", "total_tokens")
                },
            }
        )
        if isinstance(content, str):
            try:
                json.loads(content)
            except json.JSONDecodeError as exc:
                self.show(
                    {
                        "json_parse_error": {
                            "line": exc.lineno,
                            "column": exc.colno,
                            "position": exc.pos,
                        }
                    }
                )
        try:
            providers.parse_chat_response(data, [1], operation=mode)
        except providers.AssistanceError as exc:
            raise CommandError(
                f"Validation failed: {exc.code}. See the response and diagnostic category."
            ) from None
        self.stdout.write(
            "Validation passed. Citation IDs and format passed; review factual accuracy manually."
        )
