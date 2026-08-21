# Huzlr Agents

Persistent LiveKit workers are deployed from this module. The FastAPI service remains
request-driven on Vercel and communicates with these workers through explicit LiveKit
dispatch and the protected internal agent API.

## Agent types

| Type | LiveKit dispatch name |
| --- | --- |
| `brainstorm` | `huzlr-brainstorm` |
| `founder` | `huzlr-founder` |
| `scrum_master` | `huzlr-scrum-master` |

One image serves every agent type. Each LiveKit deployment sets `HUZLR_AGENT_TYPE` to
select its worker at startup, which keeps deployments and scaling independent without
duplicating the image definition.

## Local development

Create `.env` from `.env.example`, then install the package into a virtual environment:

```bash
python -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python -m livekit.agents download-files
PYTHONPATH=src HUZLR_AGENT_TYPE=brainstorm .venv/bin/python -m huzlr_agents.runner dev --no-reload
```

Founder and Scrum Master additionally require `HUZLR_API_URL` and
`HUZLR_AGENT_SERVICE_KEY`. The service key must match `AGENT_SERVICE_KEY` in FastAPI.

## LiveKit Cloud deployments

Authenticate and select the LiveKit project first:

```bash
lk cloud auth
lk project set-default "<project-name>"
```

Create the two new deployments from this directory. Provide all provider and LiveKit
secrets through a non-committed secrets file, plus the agent type shown below:

```bash
lk agent create --config livekit.brainstorm.toml --secrets-file .env --secrets HUZLR_AGENT_TYPE=brainstorm .
lk agent create --config livekit.founder.toml --secrets-file .env --secrets HUZLR_AGENT_TYPE=founder .
```

The existing Scrum Master deployment configuration was moved to
`livekit.scrum-master.toml`:

```bash
lk agent deploy --config livekit.scrum-master.toml --secrets-file .env --secrets HUZLR_AGENT_TYPE=scrum_master .
```

For later releases, deploy each configuration independently with `lk agent deploy`.
