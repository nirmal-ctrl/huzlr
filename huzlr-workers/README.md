# Huzlr AI Workers — Phase 1 foundation

This is the **native runtime foundation**, not a production-ready agent service.

## Included
- Validated worker and execution contracts for cloud and customer-hosted deployment
- Deny-by-default tool authorization
- Bounded asynchronous model/tool loop with injected adapters
- Deterministic unit tests without external model credentials

## Not implemented yet
Database persistence, tenant authorization, API endpoints, LLM provider adapters,
sandbox isolation, dispatch queues, checkpointing, cancellation, approvals,
customer-hosted node enrollment, and the Next.js dashboard.

## Run tests
From this directory, with Python and `pydantic>=2` installed:

```bash
PYTHONPATH=. python -m unittest discover -s tests -v
```

The runtime must never be exposed to untrusted customer tool execution until
sandbox isolation, durable state, and policy enforcement are integrated.
