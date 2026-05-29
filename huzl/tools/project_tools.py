import logging
from typing import Dict, Any, Callable

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("huzl.tools.project_tools")

# Mock database of active project context
MOCK_PROJECT_CONTEXT = {
    "sprint": "Sprint 42",
    "status": "In Progress (On Track)",
    "blockers": [
        {"id": "SM-104", "title": "OAuth handshake failure with Jira API", "owner": "Nirmal"},
        {"id": "SM-108", "title": "Pipewire routing configuration is missing", "owner": "Manohar"}
    ],
    "tasks": [
        {"id": "SM-101", "title": "Build Chromium Playwright meet worker", "status": "Done"},
        {"id": "SM-102", "title": "Configure 16kHz Mono Audio Capture", "status": "Done"},
        {"id": "SM-103", "title": "Implement realtime state transitions", "status": "In Progress"}
    ]
}

class ProjectTools:
    """Contains tool capabilities exposed to the Gemini real-time agent."""
    def __init__(self):
        # Map actions dynamically to avoid complex if-else logic, conforming to backend guidelines
        self.tool_registry: Dict[str, Callable[[], Any]] = {
            "get_project_status": self.get_project_status,
            "get_sprint_summary": self.get_sprint_summary,
            "get_blockers": self.get_blockers
        }

    def execute_tool(self, tool_name: str, **kwargs) -> Any:
        """Dynamically invokes the registered tool function."""
        if tool_name in self.tool_registry:
            logger.info(f"Executing tool: {tool_name}")
            return self.tool_registry[tool_name]()
        logger.warning(f"Tool {tool_name} not found in registry.")
        return f"Tool {tool_name} is not available."

    def get_project_status(self) -> Dict[str, Any]:
        """Fetches the current status of the project and active sprint."""
        return {
            "sprint": MOCK_PROJECT_CONTEXT["sprint"],
            "status": MOCK_PROJECT_CONTEXT["status"]
        }

    def get_sprint_summary(self) -> Dict[str, Any]:
        """Provides a detailed summary of completed and pending tasks in the current sprint."""
        return {
            "sprint": MOCK_PROJECT_CONTEXT["sprint"],
            "tasks": MOCK_PROJECT_CONTEXT["tasks"]
        }

    def get_blockers(self) -> Dict[str, Any]:
        """Lists active blockers in the current sprint."""
        return {
            "active_blockers": MOCK_PROJECT_CONTEXT["blockers"]
        }

    def create_task(self, title: str, description: str = "") -> Dict[str, Any]:
        """Creates a new project management task in the tracking system."""
        new_id = f"SM-{len(MOCK_PROJECT_CONTEXT['tasks']) + 101}"
        new_task = {"id": new_id, "title": title, "status": "To Do"}
        MOCK_PROJECT_CONTEXT["tasks"].append(new_task)
        logger.info(f"Successfully created task {new_id}: '{title}'")
        return {"status": "Success", "task": new_task}
