# Standmate Frontend Coding Guidelines & Architecture Standards

This document serves as the absolute source of truth for frontend development in the StanMate repository. As an AI coding agent, you MUST adhere to these rules. Evaluate these rules contextually against the task at hand. Ask yourself: "Does applying this rule improve the architecture of *this specific feature*?"

## 1. Core Architecture (SOLID & Polymorphism)

When building complex or dynamic UI, you must adhere to the Open/Closed Principle (OCP) and Single Responsibility Principle (SRP).

### The Gold Standard: Factory & Builder Patterns
Refer to `components/properties/` for the ideal implementation of dynamic UI:
*   **The Problem**: Rendering tables dynamically based on backend schema definitions.
*   **The Solution**: Instead of hardcoding columns with massive `if/else` blocks, the system uses a **Builder** (`table-builder.tsx`) that reads schema metadata and calls specific **Factories** (`table.tsx`) to generate the correct UI cell renderers (`factory.tsx`).
*   **Your Goal**: When implementing new features that depend on variable data structures (e.g., dynamic forms, dashboards), use Factories and Builders. The core component should remain "closed for modification," while the factories remain "open for extension" when new data types are introduced.

### Avoid If-Else for State Management
*   **Object Literals over If-Else**: You must strongly avoid using `if-else` or `switch` statements for state-based or type-based logic. Instead, use the **Object Literal pattern** (or Maps) to map keys (states/types) to their corresponding values, functions, or components. This ensures O/C principle is maintained.
*   **Functional Programming**: Embrace a functional programming style throughout. Avoid mutating state directly. Strive for pure functions and composition.
*   **Single Responsibility Principle (SRP)**: Each function, component, or module should have exactly one reason to change.

## 2. Loading States Strategy (Skeletons vs. Spinners)

You must actively evaluate the appropriate user experience during asynchronous operations. Do not default to spinners for everything.

*   **Skeleton Loaders (Preferred for Predictable UI)**: If the final layout of the content is structurally predictable (e.g., Data Tables, Cards, Dashboards, Lists), you **MUST** use a Skeleton Loader.
    *   *Check existing assets*: Look for `components/data-table-skeleton.tsx` or build upon `components/ui/skeleton.tsx`.
*   **Spinners (Fallback for Unpredictable/Small UI)**: Use spinners only when a skeleton loader is inappropriate, such as for unpredictable content, small isolated actions (e.g., a "Save" button loading state), or generic full-page initial loads where structure isn't known yet.
    *   *Single Source of Truth*: Never create new spinner SVGs. Always use the existing, reusable `components/spinner-empty.tsx` or `components/ui/spinner.tsx`.

## 3. State Management (Redux Toolkit)

When global state or complex side effects are required:
*   **Slice Architecture**: Global state must reside in `lib/redux/slices/`.
*   **Type-Safe Hooks ONLY**: Never use raw `useDispatch`/`useSelector`. You MUST import and use `useAppDispatch` and `useAppSelector` from `@/lib/redux/hooks.ts`.
*   **No Raw Fetches in Components**: UI components must not contain `fetch()` calls. Wrap all data fetching in `createAsyncThunk` inside the relevant slice, or use the RTK Query `baseApi`.
*   **Standardized State**: Asynchronous slices must maintain `loading` and `error` states in their `initialState` to handle UI feedback.

## 4. Styling, Theme, & Constants Governance

*   **Design Reference**: The application *Linear* is the primary design reference for everything that is designed in this project. Use it as a guiding star for layout, component aesthetics, interactions, and overall user experience.
*   **Zero Magic Numbers/Colors**: You are strictly forbidden from hardcoding hex codes (e.g., `#FF0000`), arbitrary RGB values, or custom pixel values (e.g., `w-[300px]`).
*   **Theme Tokens Only**: You must use semantic tokens defined in the Tailwind configuration and CSS variables (e.g., `bg-primary`, `text-muted-foreground`, `border-border`).
*   **Centralized Constants**: Any string, number, or configuration object used in multiple places (e.g., status options, dropdown lists) must be extracted to the `constants/` directory. Do not hardcode recurring lists inside components.

## 5. Service Layer & Third-Party Integrations

*   **Common Service Abstraction**: Any interaction with third-party APIs (e.g., GCP, Atlassian/Jira) must be abstracted into a dedicated service file inside the `services/` directory. Do not leak third-party SDK calls directly into UI components.

## 6. Rich Text & Content Editing (Tiptap)

You are STRICTLY FORBIDDEN from using standard HTML `<textarea>` and basic `<input>` text fields across the application. To ensure a consistent, Notion-like user experience, you MUST use the existing reusable Tiptap editor components for all text entry.

*   **TiptapEditor**: For full-featured rich-text editing, replacing multi-line `<textarea>` elements (located in `components/editor/tiptap-editor.tsx`).
*   **InlineEditor**: For lightweight, single-line rich-text editing, replacing standard text `<input>` elements (located in `components/editor/inline-editor.tsx`).
*   **Rule of Thumb**: Default to `TiptapEditor` or `InlineEditor` universally instead of raw inputs or basic text areas.

## 7. Pre-Execution Evaluation (Self-Check)

Before finalizing code, silently ask yourself:
1.  **Architecture**: Am I hardcoding conditional logic that will break if a new data type is introduced? Should I use a Factory/Builder pattern here?
2.  **Loading UX**: Is a skeleton loader appropriate here, or a spinner? Did I reuse the existing skeleton/spinner components?
3.  **State**: Did I use the typed Redux hooks? Are my fetches centralized in a Thunk or Service?
4.  **Styling & Constants**: Did I avoid magic numbers and raw hex codes? Are my recurring strings moved to `@/constants`?
5.  **Rich Text**: Did I completely avoid standard text inputs and `<textarea>` elements and use a Tiptap component instead?
