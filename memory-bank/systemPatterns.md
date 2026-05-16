# System Patterns

## System Architecture
- **Frontend (`standmate`)**: Next.js (App Router), React, Tailwind CSS. Used for rendering the UI, routing, and providing the interactive user experience.
- **Backend (`standmate-be`)**: FastAPI framework (Python) providing RESTful APIs, orchestrating AI workflows, and interacting with the database.
- **Database**: Likely SQL-based, managed via Alembic migrations as seen in the backend directory.

## Design Patterns
- Component-driven UI development on the frontend.
- API-first design separating client logic from backend services.
- Data fetching via defined service layers (e.g., `services/baseApi.ts`, `services/projectsApi.ts`).
- Modular Python backend with clear separation of `api`, `core`, `models`, `schemas`, and `services`.

## Component Relationships
- Frontend communicates with Backend over HTTP REST APIs.
- Next.js acts as a BFF (Backend for Frontend) for certain integrations, utilizing route handlers (`app/api/`) for features like Gemini AI interactions, save frames, etc.
- **Projects**: The central entity. Projects own `Milestones` and `Tasks` directly. Tasks can optionally belong to a Milestone. (The `Scenario` model has been removed).

## Critical Implementation Paths
- Auth integration (likely Atlassian/OAuth based on `app/atlassian-callback/`).
- AI real-time interactions (Gemini handlers).
- Project/Board state management using Redux (`lib/redux/`).
- **Dynamic Property Handling**: 
  - Using a Property Registry pattern to handle variable entity fields. 
  - The frontend maps these properties dynamically using factory functions (e.g. `components/properties/factory.tsx`) to generate standardized controls like `<ProjectStatusSelector>` or `<ProjectPrioritySelector>`. 
- **Generic View System**:
  - A `ViewContainer` component fetches data and property definitions for a given entity type.
  - A `ViewSwitcher` component renders the correct view (`KanbanBoard`, `DataTable`, `Timeline`) based on the selected `viewType` and `groupBy` property.
  - The `KanbanBoard` dynamically generates columns based on the unique values of the `groupBy` property.
  - The `DataTable` uses the `groupBy` feature of `@tanstack/react-table` to group data.
