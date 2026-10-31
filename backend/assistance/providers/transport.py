"""One bounded HTTP attempt; no redirects, retries or raw provider errors."""

import json

import urllib3

from .errors import AssistanceError


def request_json(method, url, headers, body=None, *, timeout_seconds=30):
    pool = urllib3.PoolManager()
    response = None
    try:
        response = pool.request(
            method,
            url,
            headers={"Accept": "application/json", **headers},
            body=json.dumps(body).encode() if body is not None else None,
            timeout=urllib3.Timeout(
                connect=min(3, timeout_seconds), read=timeout_seconds, total=timeout_seconds
            ),
            retries=False,
            redirect=False,
            preload_content=False,
        )
        if response.status == 429:
            raise AssistanceError(
                "provider_limit", "The provider's limit was reached. Try later.", 429
            )
        if response.status in {401, 403}:
            raise AssistanceError(
                "provider_access", "Provider access is unavailable. Check local configuration."
            )
        if response.status != 200:
            raise AssistanceError(
                "provider_error", "The provider could not complete this request. Try again later."
            )
        raw = response.read(1_000_001)
        if len(raw) > 1_000_000:
            raise ValueError("oversized")
        data = json.loads(raw)
        if not isinstance(data, dict):
            raise ValueError("shape")
        return data
    except urllib3.exceptions.NewConnectionError:
        # urllib3 inherits this from ConnectTimeoutError even for ECONNREFUSED.
        raise AssistanceError(
            "provider_unavailable", "The provider is unavailable. Please try again later."
        ) from None
    except urllib3.exceptions.TimeoutError:
        raise AssistanceError("timeout", "The provider timed out. Please try again.", 504) from None
    except urllib3.exceptions.HTTPError:
        raise AssistanceError(
            "provider_unavailable", "The provider is unavailable. Please try again later."
        ) from None
    except (ValueError, UnicodeError):
        raise AssistanceError(
            "invalid_response", "The provider returned an unreadable response.", 502
        ) from None
    finally:
        if response is not None:
            response.close()
        pool.clear()
