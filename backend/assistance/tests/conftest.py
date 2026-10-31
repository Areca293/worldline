"""Provider tests must never reach a live or billable endpoint, even with a stale patch."""

import pytest
import urllib3


@pytest.fixture(autouse=True)
def block_live_provider_http(monkeypatch):
    def unexpected_request(*args, **kwargs):
        pytest.fail("Unexpected live provider HTTP call; patch the actual transport boundary.")

    monkeypatch.setattr(urllib3.PoolManager, "request", unexpected_request)
