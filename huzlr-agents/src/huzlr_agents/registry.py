from livekit.agents import WorkerOptions


SUPPORTED_AGENT_TYPES = ("brainstorm", "founder", "scrum_master")


def get_worker_options(agent_type: str) -> WorkerOptions:
    if agent_type == "brainstorm":
        from huzlr_agents.agents.brainstorm import build_worker_options
    elif agent_type == "founder":
        from huzlr_agents.agents.founder import build_worker_options
    elif agent_type == "scrum_master":
        from huzlr_agents.agents.scrum_master import build_worker_options
    else:
        supported = ", ".join(SUPPORTED_AGENT_TYPES)
        raise ValueError(f"Unsupported HUZLR_AGENT_TYPE '{agent_type}'. Expected one of: {supported}")
    return build_worker_options()
