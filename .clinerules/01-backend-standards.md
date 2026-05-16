# Standmate Backend Coding Guidelines & Architecture Standards

This document serves as the absolute source of truth for backend development in the `standmate-be` repository. As an AI coding agent, you MUST adhere to these rules. Evaluate these rules contextually against the task at hand.

## 1. Core Framework & Architecture

The backend is built with **FastAPI** and **SQLAlchemy 2.0 (Async)**. 

### Structure Enforcement
*   **API Routes**: Must be placed in `app/api/v1/endpoints/` and registered in `api/v1/router.py`.
*   **Database Models**: Must be defined in `app/models/` and inherit from `Base` (`app/models/base.py`).
*   **Pydantic Schemas**: Must be defined in `app/schemas/`. Do not mix SQLAlchemy models with Pydantic validation schemas.
*   **Core Services**: Business logic, property factories, and security logic belong in `app/core/`.

### Core Architecture (SOLID & Polymorphism)
*   **Avoid If-Else for Logic**: You must strongly avoid using `if-else` or `switch` statements for state-based or type-based logic. Instead, use the **Object Literal pattern** (or Maps/Dictionaries) to map keys (states/types) to their corresponding values or functions. This ensures the Open/Closed Principle (OCP) is maintained.
*   **Functional Programming**: Embrace a functional programming style throughout the business logic. Avoid mutating state directly. Strive for pure functions and composition.
*   **Single Responsibility Principle (SRP)**: Each function, service, or module should have exactly one reason to change.

## 2. Dynamic Property Handling (The Registry Pattern)

Just as the frontend uses a Factory/Builder pattern for dynamic UI, the backend uses a Property Registry pattern to validate dynamic JSON payloads.

*   **Pydantic Factory**: When an entity (like a Project or Task) accepts arbitrary properties, use `create_pydantic_model_from_schema` in `app/core/property_factory.py`. This dynamically generates a Pydantic validation model based on the schema definitions.
*   **JSONB Updates**: When updating a JSON/JSONB column in SQLAlchemy, you MUST use `flag_modified(db_entity, "column_name")` from `sqlalchemy.orm.attributes`. SQLAlchemy does not automatically detect mutations inside a JSON dictionary.

## 3. Database Interactions (SQLAlchemy 2.0)

*   **Async Sessions ONLY**: All database interactions must use the async session injected via `Depends(get_db)` from `app/core/database.py`.
*   **Querying Format**: Use the new 2.0 style `select()` syntax. Do not use legacy `Query` objects or `session.query()`.
    *   *Correct*: `result = await db.execute(select(Project).where(Project.id == 1))`
*   **Eager Loading Relationships**: When querying an entity that requires nested data (e.g., `_property_record`), you MUST use `selectinload` to avoid synchronous N+1 lazy loading errors.
    *   *Example*: `.options(selectinload(Project._property_record))`

## 4. API Endpoints & Request Handling

*   **Dependency Injection**: Use FastAPI's `Depends` for reusable logic like `get_db` and authentication `get_current_user`.
*   **Authorization Validation**: Always verify that the entity being requested, updated, or deleted belongs to the `current_user` before performing the action. Return an `HTTPException(status_code=403)` if unauthorized.
*   **Model Dumping**: When converting Pydantic objects to dictionaries for SQLAlchemy insertion, use `.model_dump(exclude_unset=True)` (Pydantic v2 syntax). Do not use `.dict()`.
*   **Decoupled Execution (No Frontend Dependency)**: Any API endpoint that triggers an operation (especially AI tasks, large data imports, or processing) MUST NOT depend on the frontend connection staying open. 
    *   Once a request is triggered, it must continue to completion even if the user closes their browser or navigates away.
    *   For long-running operations, immediately return a status (e.g., `202 Accepted` or `task_id`) and handle the actual execution using FastAPI `BackgroundTasks` or a dedicated task queue (e.g., Celery).

## 5. Migrations (Alembic)

*   **No Auto-Committing Schema Changes**: Do not bypass Alembic. If you add or modify a column in `app/models/`, you MUST generate an Alembic migration script.

## 6. Pre-Execution Evaluation (Self-Check)

Before finalizing backend code, silently ask yourself:
1.  **Architecture**: Did I separate the SQLAlchemy model from the Pydantic schema?
2.  **Database Query**: Am I using the Async `select()` 2.0 syntax? Did I use `selectinload` for relationships?
3.  **JSON State Tracking**: Did I use `flag_modified` after mutating a JSON dictionary?
4.  **Authorization**: Is the endpoint checking if the user actually owns the resource they are trying to access?
5.  **Pydantic Syntax**: Am I using `model_dump()` instead of `dict()`?