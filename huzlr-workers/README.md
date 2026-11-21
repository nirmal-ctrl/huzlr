# Huzlr AI Workers runtime

This package contains the bounded execution engine and validated cloud worker
contracts. AI Workers run exclusively in Huzlr Cloud. The managed consumer and
provider adapters live in `huzlr-be/app`.

## Run the managed consumer

Configure the backend environment, apply its migrations, then run:

```bash
cd ../huzlr-be/app
../.venv/bin/python -m ai_worker
```

See [backend setup](../huzlr-be/README.md) and the
[managed deployment guide](../deploy/gcp/README.md).

## Tests

```bash
PYTHONPATH=. python -m unittest discover -s tests -v
```
