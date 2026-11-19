# Huzlr AI Workers

This package contains the bounded execution engine and the outbound-only
customer-hosted Worker Node.

## Customer-hosted node

Create a node from **AI Workers → Worker nodes**, copy its one-time token, then
run:

```bash
docker build -t huzlr-worker-node .
docker run --rm \
  -e HUZLR_CONTROL_PLANE_URL=https://your-huzlr.example.com \
  -e HUZLR_NODE_TOKEN=huzlr_node_... \
  -e GEMINI_API_KEY=... \
  huzlr-worker-node
```

Provider credentials remain in the node environment. The node makes outbound
HTTPS requests only, heartbeats execution leases, and never falls back to the
Huzlr cloud runner. Revoke a token from the dashboard to stop new claims.

The standard node supports the same project-task tools as the cloud runner. Tool
requests are re-authorized by the control plane, and task mutations pause until
a project member approves them in Huzlr. The node exposes no filesystem, shell,
or arbitrary network tools; deployments may inject separately audited local
handlers into `ExecutionEngine`.

## Tests

```bash
PYTHONPATH=. python -m unittest discover -s tests -v
```
