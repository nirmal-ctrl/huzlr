# syntax=docker/dockerfile:1

ARG PYTHON_VERSION=3.13

FROM python:${PYTHON_VERSION}-slim AS build

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt ./
RUN python -m venv .venv \
    && .venv/bin/pip install --no-cache-dir --upgrade pip \
    && .venv/bin/pip install --no-cache-dir -r requirements.txt \
    && .venv/bin/python -m livekit.agents download-files

COPY src ./src

FROM python:${PYTHON_VERSION}-slim AS runtime

ENV PATH="/app/.venv/bin:${PATH}" \
    PYTHONPATH="/app/src" \
    PYTHONUNBUFFERED=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates libgomp1 \
    && rm -rf /var/lib/apt/lists/* \
    && addgroup --system --gid 10001 app \
    && adduser --system --uid 10001 --ingroup app --home /app app

WORKDIR /app
COPY --from=build --chown=app:app /app /app

USER app

CMD ["python", "-m", "huzlr_agents.runner", "start"]
