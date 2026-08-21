from huzlr_agents.config import AgentSettings

from livekit.agents import cli

from huzlr_agents.registry import get_worker_options


def main() -> None:
    settings = AgentSettings.from_environment()
    if not settings.agent_type:
        raise RuntimeError("HUZLR_AGENT_TYPE must be set before starting an agent worker")
    cli.run_app(get_worker_options(settings.agent_type))


if __name__ == "__main__":
    main()
