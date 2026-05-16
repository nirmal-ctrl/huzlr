# Progress

## Current Status
- Finished implementing Tasks feature with Factory Builder pattern and hierarchical nesting.

## Completed Tasks
- **Backend**: 
  - Updated `Task` SQLAlchemy model with `_property_record` relationship.
  - Added `properties` getter/setter to model for seamless dictionary updates.
  - Updated Pydantic schemas (`TaskBase`, `TaskCreate`, `TaskUpdate`, `TaskResponse`) to handle `properties: Dict[str, Any] | None`.
  - Updated API endpoints in `tasks.py` to handle JSON mutations safely with `flag_modified`, and implemented eager loading with `selectinload` to prevent N+1 queries.
  - Registered `task` entity metadata in `PROPERTIES_REGISTRY` (`property_registry.py`).
- **Frontend**:
  - Updated UI on app sidebar ("Boards" to "Board").
  - Cleaned up the Kanban board UI by removing the redundant "Realese" header section.
  - Refactored task creation modals (`standmate/components/projects/create-task-modal.tsx`) to use the `TiptapEditor` component for description formatting and ensure robust fetching of projects if none are loaded yet.
  - Updated frontend `.clinerules/01-frontend-standards.md` coding standards to explicitly mandate `TiptapEditor` and `InlineEditor` over standard `textarea` and `input`.
  - Updated Redux `Task` type to include `properties: Record<string, any>`.
  - Integrated `metaSlice` to fetch task property schemas seamlessly.
  - Rebuilt the Tasks view in `app/projects/[projectId]/page.tsx` using `DataTable` and the `buildColumnsFromProperties` factory.
  - Filtered Tasks into main Backlog and specific Milestone tabs/sections correctly.
  - Created `TaskList` and `TaskDetailsDrawer` components to handle dynamic form generation and rich text updates seamlessly without mutating core logic.
  - Fixed RTK Query routes in `tasksApi.ts` and `milestonesApi.ts` to not duplicate the `/api/v1` prefix.

## Known Issues / Next Steps
- Refactor the Kanban board in `app/boards/page.tsx` and `components/kanban/kanban-board.tsx` to dynamically fetch columns based on the Task status property definitions.
- Integrate the reusable atomic property components (e.g. `ProjectStatusSelector`, `ProjectPrioritySelector` from `components/properties/factory.tsx`) in Task cards within the Kanban board, and Task details sections.
- Implement dragging / sorting for tasks (if re-ordering is required).
- Add filters & views for task table.
- Task status/priority could use some styling improvements for Linear-like appearance.
