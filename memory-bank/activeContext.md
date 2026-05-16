# Active Context

## Current Work Focus
- Implementing a generic and reusable view system for all entities (Projects, Tasks, etc.).
- This view system will support multiple view types (Kanban, List, Timeline) and allow for dynamic grouping of data by any property.

## Recent Changes
- The previous work on dynamic statuses for tasks has been superseded by the new plan for a generic view system.

## Next Steps
- Create a `ViewContainer` component to fetch data and property definitions for a given entity type.
- Create a `ViewSwitcher` component to render the correct view based on the selected `viewType` and `groupBy` property.
- Refactor the `KanbanBoard` and `DataTable` components to be more generic and configurable.
- Refactor the entity pages (`app/projects/page.tsx`, `app/boards/page.tsx`) to use the new `ViewContainer` component.

## Active Decisions & Considerations
- Maintaining a strict boundary between frontend (`standmate`) and backend (`standmate-be`) services.
- Ensuring the Next.js app properly connects to FastAPI endpoints.
- Storing AI conversational state (e.g. Gemini) efficiently.

## Learnings & Insights
- Standmate connects multiple data streams (Jira, brainstorms, boards) into a unified view.
- Always use the reactive text editor (`TiptapEditor` / `InlineEditor`) for input fields that require formatted text or rich content, rather than basic inputs or textareas.
