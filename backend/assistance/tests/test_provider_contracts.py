"""Wire/configuration fingerprints captured from 9b513dc before moving providers.

Synthetic credentials and evidence only. A prompt/parameter change needs a separate
behavior review; do not refresh these fingerprints just to make a move pass.
"""

import hashlib
import json
from unittest.mock import patch

import pytest
from django.test import override_settings

from assistance import providers
from assistance.providers import configuration

EVIDENCE = [
    {
        "id": 1,
        "title": "Synthetic title",
        "text": "A trial involved 12 people.",
        "url": "https://example.com/fixture",
        "publisher": "example.com",
        "kind": "feed_excerpt",
        "published_at": None,
    }
]

CONFIGURATION = dict(
    AI_MAX_OUTPUT_TOKENS=1200,
    OPENAI_MODEL="fixture-openai",
    OPENAI_API_KEY="fixture-key",
    LM_STUDIO_MODEL="fixture-local",
    LM_STUDIO_API_KEY="",
    LM_STUDIO_BASE_URL="http://127.0.0.1:1235/v1",
    LM_STUDIO_TIMEOUT_SECONDS=60,
    LM_STUDIO_CONFIG_REVISION="fixture-1",
    RELAY_MODEL="fixture-relay",
    RELAY_API_KEY="fixture-key",
    RELAY_BASE_URL="https://code.anyxml.com/v1",
    RELAY_TIMEOUT_SECONDS=60,
    RELAY_CONFIG_REVISION="fixture-1",
)

CONTRACTS = {
    "openai:answer": "652650f3efcc41ccec679def2de64cac1c3aefdb4398910e20a1ea92e5e0d666",
    "openai:summarize": "27631bbbac9f177e5552bf54b2aaf87f3d8c33f14d2f1403ecc4414f09aa0bfe",
    "openai:translate": "919d0812da751d5f813744eb2dff81e14f9533aed88a43abcdce49c296f5ab7a",
    "openai:explain": "407fa9f2e0f9552a0692db9bfd2eabf20da2e0707ec6f7205e3033fc64460b4e",
    "lmstudio:answer": "061749f6ff38820f4fea3a1985200e4e90a352e53d3e95f4741e34cf441518eb",
    "lmstudio:summarize": "d34ce0aab032ad882555ada68fcd18a8866458df4ed44ec2bc5a9abc1b416468",
    "lmstudio:translate": "8b1663718d61f04d83f965f9a4bbba94dcabec38c780e47b3a5295f9e5b34412",
    "lmstudio:explain": "5bd53a6cc90d268a2a4ce38ab00d4c717c10fa079d8ec8d34115539361d41cc7",
    "relay:answer": "99c1764743655a79373ad81b8b34be1eec4e6ee3129d551d96e4ac0643866664",
    "relay:summarize": "83236a356edb61f044aa323dc62483649004a2a1b61e842f7730fec9b445c12c",
    "relay:translate": "f4f8921672fc6a6b7203ab846bab9a7168e8f7597703f125774177dda8e2046d",
    "relay:explain": "c68dd0ea2720be3eaac2a912e92eb521dc2366ba126d7060c3fae96c2772abec",
}


@pytest.mark.parametrize("provider", ["openai", "lmstudio", "relay"])
@pytest.mark.parametrize("mode", ["answer", "summarize", "translate", "explain"])
def test_dispatch_preserves_complete_request_and_cache_configuration(provider, mode):
    with override_settings(AI_MODEL_PROVIDER=provider, **CONFIGURATION):
        with patch(
            "assistance.providers.transport.request_json",
            side_effect=RuntimeError("captured before network"),
        ) as request:
            with pytest.raises(RuntimeError, match="captured before network"):
                providers.generate(mode, "Synthetic question", EVIDENCE)
            request.assert_called_once()
            args, kwargs = request.call_args
        payload = [configuration.model_configuration(), args, kwargs]
        digest = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()
        assert digest == CONTRACTS[f"{provider}:{mode}"]
