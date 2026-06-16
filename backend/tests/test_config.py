"""Unit tests for backend configuration (no live DB required).

`config` constructs the motor client lazily, so importing it here does not open
a MongoDB connection — only the configured client options are asserted.
"""

import config


def test_mongo_client_uses_fast_server_selection_timeout():
    # Regression: a deploy restarts the backend, so the first requests during
    # warm-up must not hang on motor's 30s default while the DB connection
    # re-establishes. We pin a 5s server-selection timeout so a brief DB blip
    # errors fast instead of stalling (~30s 500s seen in the post-deploy canary).
    assert config.client.options.server_selection_timeout == 5.0
