# Refactoring Plan: Cooking Class Scheduler

**Current Status (as of 2025-03-28 ~1:20 PM CT):**

*   [x] **Assessment:** Completed initial code analysis, identified large files, assessed test coverage (low for target files), reviewed documentation.
*   [ ] **Prerequisite - Enhance Test Coverage:**
    *   [ ] `app.js`: Characterization tests added (`test/app.characterization.test.js`), basic initialization and modal opening verified. Drag-and-drop and suggest button tests added, but DOM update assertions are currently commented out due to JSDOM limitations.
    *   [ ] `data.js`: Tests needed.
    *   [ ] `class-manager.js`: Tests needed.
    *   [ ] `solver-wrapper.js`: Tests needed.
    *   [ ] `visualization.js`: Tests needed.
    *   [ ] `analytics.js`: Tests needed.
*   [ ] **Refactoring `src/app.js` (Target 1):**
    *   [x] Create `src/ui-manager.js`.
    *   [x] Move helper functions (`createElementWithClass`, `showMessage`) to `UIManager`.
    *   [x] Update `app.js` to import and use `UIManager` for moved functions.
    *   [x] Fix browser module loading (`type="module"` in `index.html`, add necessary exports/imports).
    *   [x] Move `initializeUI` to `UIManager`. (Verified with tests, except known D&D issue)
    *   [x] Move `renderScheduleGrid` to `UIManager`. (Verified with tests, except known D&D issue)
    *   [x] Move `renderUnscheduledClasses` to `UIManager`. (Verified with tests, except known D&D issue)
    *   [x] Move `highlightAvailableSlots` to `UIManager`. (Verified with tests, except known D&D issue)
    *   [x] Move `clearHighlights` to `UIManager`. (Verified with tests, except known D&D issue)
    *   [x] Move `updateProgress` to `UIManager`. (Verified with tests, except known D&D issue)
    *   [x] Move `updateCurrentWeekDisplay` to `UIManager`. (Verified with tests, except known D&D issue)
    *   [x] Move `updateConstraintStatus` to `UIManager`. (Verified with tests, except known D&D issue)
    *   [x] Move `markTeacherUnavailabilityPeriods` to `UIManager`. (Verified with tests)
    *   [x] Create `AppInitializer`. (Moved init logic, updated index.html)
    *   [x] Create `EventHandlerService`. (Moved interaction handlers: drag/drop, buttons, date, teacher mode, cell click)
    *   [x] Extract Feature Controllers. (Created Config, SaveLoad, Analytics, WhatIf controllers; moved functions)
    *   [x] Decouple Globals.
*   [ ] **Refactoring `src/data.js` (Target 2)**
*   [ ] **Refactoring `src/class-manager.js` (Target 3)**
*   [ ] **Refactoring `src/solver-wrapper.js` (Target 4)**
*   [ ] **Refactoring `src/visualization.js` (Target 5)**
*   [ ] **Refactoring `src/analytics.js` (Target 6)**

---

**1. Introduction & Goals**

**Objective:** To refactor the Cooking Class Scheduler application codebase to improve modularity, testability, and maintainability by breaking down overly large or complex code files.

**Assessment Summary:**
Our analysis identified six key JavaScript files in the `src/` directory exceeding the 500-line threshold, indicating potential issues with mixed responsibilities and complexity:
*   `app.js` (2943 lines) - Main UI controller, event handler, orchestrator.
*   `class-manager.js` (1064 lines) - UI and logic for the Class Manager modal.
*   `data.js` (817 lines) - Central data management, persistence, utilities.
*   `solver-wrapper.js` (824 lines) - Interface with GLPK solver, model building, fallback logic.
*   `visualization.js` (774 lines) - Canvas-based analytics visualizations.
*   `analytics.js` (600 lines) - Calculation of schedule metrics and insights.

Furthermore, the assessment revealed low automated test coverage for these specific files, increasing the risk associated with refactoring. Documentation is primarily high-level planning documents and a manual test plan.

**Refactoring Goals & Principles:**

*   **Improve Modularity:** Adhere to the Single Responsibility Principle (SRP) by separating distinct concerns into focused modules or classes.
*   **Enhance Testability:** Structure code to facilitate unit and integration testing, reducing reliance on manual testing.
*   **Decouple Components:** Minimize direct dependencies, especially on global variables (`window`) and specific DOM element IDs. Promote interaction through well-defined interfaces, events, or dependency injection.
*   **Improve Maintainability & Readability:** Make the codebase easier to understand, modify, and debug.

**2. Prerequisite: Enhance Test Coverage**

Given the high risk associated with refactoring due to low automated test coverage for the target files, enhancing test coverage is a critical prerequisite.

*   **Action:** Before refactoring **each** target module (`app.js`, `data.js`, etc.), write **characterization tests**. These tests should aim to capture the current observable behavior of the module's public API or key functionalities, even if the internal structure is poor. Use Jest and Testing Library where appropriate.
    *   For UI-heavy modules (`app.js`, `class-manager.js`), focus on simulating user interactions and asserting the expected DOM state or calls to dependent modules (like `DataManager`).
    *   For data/logic modules (`data.js`, `analytics.js`, `solver-wrapper.js`), focus on testing function inputs/outputs, mocking external dependencies (`localStorage`, `fetch`, `glpk.js`).
*   **Action:** Run `npm run test:coverage` after adding characterization tests for a module to establish a baseline coverage score before refactoring it. The goal isn't necessarily high coverage initially, but to have *some* automated regression checks.

**3. Prioritized Refactoring Plan**

Refactoring will proceed incrementally, targeting files based on their size, complexity, and impact on overall architecture.

**Priority Order:**

1.  **`src/app.js`:** Highest priority due to extreme size, broad responsibilities, and central role in UI and orchestration. Refactoring this will provide the biggest improvement in structure.
2.  **`src/data.js`:** High priority. Centralizes many concerns (data, persistence, utils). Refactoring this will clarify data flow and improve testability of data logic.
3.  **`src/class-manager.js`:** High priority. Tightly coupled with globals and DOM. Refactoring will improve encapsulation for this distinct feature.
4.  **`src/solver-wrapper.js`:** Medium priority. Complex, but relatively isolated. Refactoring can simplify model building and fallback logic.
5.  **`src/visualization.js`:** Medium-Low priority. Primarily rendering logic, complex but contained. Focus on simplifying rendering functions.
6.  **`src/analytics.js`:** Medium-Low priority. Calculation logic. Refactor if specific calculations are overly complex or hard to test.

**4. Detailed Plan per Target Module**

**(Target 1: `src/app.js`)**

*   **Current State:** Monolithic (~2943 lines). Handles initialization, extensive UI rendering/manipulation (grid, lists, modals), complex event handling (drag/drop, buttons, forms), feature orchestration (Config, Save/Load, Analytics, What-If), and relies heavily on global variables/functions and direct DOM access. Very low testability.
*   **Proposed Structure:** Decompose into modules focused on specific concerns.

    ```mermaid
    graph TD
        AppInitializer --> DataManager & Scheduler & AnalyticsService & SolverWrapper & UIManager & EventHandlerService;
        EventHandlerService --> UIManager & FeatureControllers;
        FeatureControllers --> Services & UIManager;
        UIManager --- DOM;
        Services --> DataManager & Scheduler & AnalyticsService & SolverWrapper;

        subgraph Core Services
            DataManager
            Scheduler
            AnalyticsService
            SolverWrapper
        end

        subgraph UI Layer
            UIManager
            EventHandlerService
        end

        subgraph Controllers
            FeatureControllers(ScheduleController, ConfigController, SaveLoadController, AnalyticsController, WhatIfController, ...)
        end

        AppInitializer(App Initializer);
        DOM(HTML DOM);
    ```

    *   **`AppInitializer`:** (New Module) Handles `DOMContentLoaded`, instantiates core services (`DataManager`, `Scheduler`, `AnalyticsService`, `SolverWrapper`) and UI components (`UIManager`, `EventHandlerService`, Feature Controllers). Wires dependencies together (e.g., passing service instances to controllers).
    *   **`UIManager`:** (New Module/Class) Manages direct DOM interactions and rendering.
        *   Responsibilities: Selecting DOM elements, `initializeUI`, `renderScheduleGrid`, `renderUnscheduledClasses`, `updateProgress`, `showMessage`, `updateConstraintStatus`, `updateCurrentWeekDisplay`, `createElementWithClass`, managing modal visibility state.
        *   Interaction: Receives data from controllers to render. Emits user interaction events (e.g., `ui:cellClicked`, `ui:classDragStart`, `ui:buttonClicked(buttonId)`, `ui:formSubmitted(formId, formData)`). Should not contain complex application logic.
    *   **`EventHandlerService`:** (New Module/Class) Listens for low-level UI events from `UIManager`. Orchestrates complex interactions (like drag-and-drop sequence). Dispatches higher-level action events (e.g., `action:scheduleClass`, `action:openModal(modalId)`) to be handled by appropriate controllers.
    *   **Feature Controllers:** (New Modules/Classes, e.g., `ConfigController`, `SaveLoadController`, `AnalyticsController`, `WhatIfController`, `ScheduleInteractionController`)
        *   Responsibilities: Handle specific user actions/workflows triggered by events from `EventHandlerService`. Contain the application logic for that feature. Interact with core services (`DataManager`, `Scheduler`, etc.) to fetch/update data. Call `UIManager` to update the view based on state changes.
    *   **Core Services:** (`DataManager`, `Scheduler`, `AnalyticsService`, `SolverWrapper`) - To be refactored later, but controllers will interact with their current (or future refactored) interfaces.

*   **Refactoring Steps (Incremental):**
    1.  **Tests:** Add characterization tests for key UI flows if possible (e.g., using Testing Library to simulate clicks/drags and check resulting DOM or mock calls).
    2.  **`AppInitializer`:** Create `AppInitializer.js`. Move `DOMContentLoaded` logic here. Instantiate `DataManager`, `Scheduler`.
    3.  **`UIManager`:** Create `UIManager.js`. Move DOM element selections and rendering functions (`initializeUI`, `renderScheduleGrid`, `renderUnscheduledClasses`, etc.) into it. Modify methods to accept data arguments. Replace direct event listener attachments in rendering functions with calls to emit events (e.g., `this.emit('cellClicked', { date, period })`). Update `AppInitializer` to instantiate `UIManager`. Update original `app.js` code to call `UIManager` methods for rendering.
    4.  **`EventHandlerService`:** Create `EventHandlerService.js`. Move complex event handlers (drag/drop, modal submissions, button clicks needing orchestration) here. Listen for events emitted by `UIManager`. Initially, handlers might still contain logic that will later move to controllers, but they are now centralized.
    5.  **Extract Controllers (Iteratively):**
        *   Create `ScheduleInteractionController.js`. Move drag/drop logic, `highlightAvailableSlots`, `clearHighlights` logic from `EventHandlerService` here. Listen for relevant drag/drop events. Interact with `Scheduler`, `DataManager`, `UIManager`.
        *   Create `ConfigController.js`. Move config modal logic (`showConfigModal`, `handleConfigFormSubmit`, `resetConfigForm`) here. Listen for config button/form events. Interact with `DataManager`, `UIManager`.
        *   Create `SaveLoadController.js`. Move save/load modal logic here.
        *   Create `AnalyticsController.js`. Move analytics modal logic, `updateAnalyticsView` here.
        *   Create `WhatIfController.js`. Move What-If modal logic here.
        *   ... and so on for other distinct features (Help, Reset, Week Navigation, Teacher Mode).
    6.  **Decouple Globals:** Systematically remove `window.xxx` references. Pass necessary instances (like `DataManager`, `Scheduler`) into controllers/services via `AppInitializer` (dependency injection). Use the event system for communication instead of global function calls (`window.renderUnscheduledClasses` -> emit `scheduleUpdated` event).

*   **Dependencies (Post-Refactor):** Controllers depend on Services and `UIManager`. `EventHandlerService` depends on `UIManager` and dispatches actions to Controllers. `UIManager` depends only on the DOM. `AppInitializer` wires everything together.
*   **Risks & Mitigation:** High risk of breaking UI interactions or introducing subtle bugs during extraction. Mitigation: Add characterization tests first, refactor in small, verifiable steps, perform thorough manual testing after each step using `test-plan.md`.
*   **Verification:** Run characterization tests. Manually test all UI interactions, drag/drop, button clicks, modal flows.

**(Target 2: `src/data.js`)**

*   **Current State:** Large `DataManager` class (~817 lines) mixing data storage, persistence (`localStorage`), date utilities, CSV parsing, CRUD for multiple entities.
*   **Proposed Structure:**
    *   **`DataStore`:** Simple class or object holding in-memory state (`classes`, `scheduleWeeks`, etc.). Provides getters/setters.
    *   **`PersistenceService`:** Interface/Class abstracting storage. Initial implementation uses `localStorage`. Methods like `save(key, data)`, `load(key)`.
    *   **`DateUtils`:** Module with static date helper functions.
    *   **`CSVParser`:** Module for CSV parsing logic.
    *   **Repositories/Managers:** (e.g., `ClassRepository`, `ScheduleRepository`, `ConfigManager`, `SavedStateRepository`) Classes responsible for managing specific data entities. They use `DataStore` and `PersistenceService`.
*   **Refactoring Steps:**
    1.  **Tests:** Add characterization tests for `DataManager` methods, mocking `localStorage`.
    2.  **Extract `DateUtils`:** Move date functions (`getMondayOfWeek`, `getFormattedDate`, etc.) out. Update `DataManager` to use `DateUtils`.
    3.  **Extract `CSVParser`:** Move CSV logic (`parseCSVData`, etc.) out. Update `loadClassesFromCSV`.
    4.  **Introduce `PersistenceService`:** Create the service/interface. Update `DataManager` load/save methods to delegate.
    5.  **Introduce `DataStore`:** Create the store. Update `DataManager` methods to get/set state via the store.
    6.  **Extract Repositories (Iteratively):**
        *   Create `ClassRepository`. Move `classes` state, `addClass`, `updateClass`, `deleteClass`, `getClasses`, `loadClassesFromCSV` logic here. Use `DataStore`, `PersistenceService`, `CSVParser`.
        *   Create `ScheduleRepository`. Move `scheduleWeeks`, `teacherUnavailability`, `scheduleStartDate`, `currentWeekOffset`, `scheduleClass`, `unscheduleClass`, `resetSchedule`, `getSchedule`, `changeWeek`, `isTeacherUnavailable`, `toggleTeacherUnavailability` logic here. Use `DataStore`, `PersistenceService`, `DateUtils`.
        *   Create `ConfigManager`. Move `config` state, `getConfig`, `updateConfig` logic here. Use `DataStore`, `PersistenceService`.
        *   Create `SavedStateRepository`. Move `savedSchedules`, `savedClassCollections`, and their CRUD/persistence logic here. Use `DataStore`, `PersistenceService`.
    7.  **Refactor Dependents:** Update `AppInitializer`, Controllers, `ClassManagerUI`, etc., to use the new repositories/managers instead of the monolithic `DataManager`. `DataManager` might become a simple facade or be removed entirely.
*   **Dependencies (Post-Refactor):** Repositories depend on `DataStore`, `PersistenceService`, potentially `DateUtils`, `CSVParser`. Services depend on Repositories.
*   **Risks & Mitigation:** Breaking data integrity, persistence, or dependent features. Mitigation: Characterization tests, careful extraction, verify data consistency manually.
*   **Verification:** Run characterization tests. Manually test all features involving data: scheduling, class management, config changes, save/load, teacher mode, CSV import. Check `localStorage`.

**(Target 3: `src/class-manager.js`)**

*   **Current State:** Procedural (~1064 lines), global dependencies (`window.dataManager`, `window.showMessage`, etc.), direct DOM manipulation.
*   **Proposed Structure:** `ClassManagerUI` module/class.
    *   Takes dependencies (e.g., `ClassRepository`, `ScheduleRepository`) via constructor/init method.
    *   Manages the Class Manager modal DOM internally.
    *   Emits events (e.g., `classes:updated`, `error:show`) instead of calling global functions or manipulating external DOM.
*   **Refactoring Steps:**
    1.  **Tests:** Add characterization tests (e.g., using Testing Library) to simulate interactions within the modal and assert results or mocked calls.
    2.  **Encapsulate:** Create `ClassManagerUI.js`. Move functions inside the class/module structure.
    3.  **Inject Dependencies:** Modify to accept `ClassRepository` and `ScheduleRepository` instances. Replace `window.dataManager` calls with repository calls.
    4.  **Manage DOM Internally:** Scope DOM selections (e.g., `document.getElementById('class-list')`) to the modal's container element. Refactor DOM manipulation logic.
    5.  **Emit Events:** Replace calls like `window.renderUnscheduledClasses()` or `window.showMessage()` with emitting custom events (e.g., using `CustomEvent`). A controller (e.g., `AppController` or `ClassManagerController`) would listen for these events and trigger the appropriate UI updates via `UIManager`.
*   **Dependencies (Post-Refactor):** `ClassManagerUI` depends on `ClassRepository`, `ScheduleRepository`. Emits events listened to by a controller.
*   **Risks & Mitigation:** Breaking the Class Manager feature. Mitigation: Characterization tests, manual testing of all Class Manager functions (add, edit, delete, import, save/load collections).
*   **Verification:** Run tests. Manually test Class Manager thoroughly per `test-plan.md` section 1.

**(Target 4: `src/solver-wrapper.js`)**

*   **Current State:** Large module (~824 lines) handling solver loading, complex model building (`buildSolverModel`), execution, result interpretation, and fallback logic (`basicConstraintSimulation`, `findInvalidPlacementsWithNewConstraints`).
*   **Proposed Structure:**
    *   `SolverWrapper`: Main interface (`initialize`, `simulateConstraintChanges`).
    *   `SolverModelBuilder`: Contains the complex logic from `buildSolverModel`.
    *   `ConstraintValidator` (or integrate into `Scheduler`): Centralize the basic constraint checking logic used in the fallback (`findInvalidPlacementsWithNewConstraints`).
*   **Refactoring Steps:**
    1.  **Tests:** Add characterization tests, mocking `glpk.js` and `DataManager`. Test different solver outcomes (feasible, infeasible, timeout, error) and fallback paths.
    2.  **Extract `SolverModelBuilder`:** Move `buildSolverModel` into a separate module/class. `SolverWrapper` will instantiate and use it.
    3.  **Centralize Fallback Logic:** Move `findInvalidPlacementsWithNewConstraints` into `Scheduler.js` (since it already has similar logic) or a new `ConstraintValidator` module. Update `SolverWrapper`'s fallback path in `simulateConstraintChanges` to call this centralized function.
*   **Dependencies (Post-Refactor):** `SolverWrapper` depends on `SolverModelBuilder`, `ConstraintValidator`/`Scheduler`, `glpk.js`, `DataManager`. `SolverModelBuilder` depends on data structures.
*   **Risks & Mitigation:** Incorrect solver model translation, breaking What-If analysis. Mitigation: Characterization tests, careful extraction, testing What-If with known scenarios.
*   **Verification:** Run tests. Manually test What-If analysis feature thoroughly.

**(Target 5: `src/visualization.js`)**

*   **Current State:** Module (~774 lines) with large, complex canvas rendering functions.
*   **Proposed Structure:** `VisualizationService` class/module. Break down large `renderXYZVisualization` functions.
*   **Refactoring Steps:**
    1.  **Tests:** Difficult to unit test rendering. Focus on testing helper functions (color mapping, date formatting) if possible. Manual visual inspection is key.
    2.  **Encapsulate:** Ensure logic is within a `VisualizationService` class/module.
    3.  **Decompose Rendering Functions:** Break down `renderHeatMapVisualization`, `renderConstraintPressureVisualization`, etc., into smaller private helper functions (e.g., `_drawAxes`, `_drawBar`, `_drawLegend`, `_drawTimeline`).
    4.  **Improve Data Access:** Ensure `render` method receives all necessary data. Avoid reliance on internal `_scheduleData` if possible; if needed, ensure it's explicitly passed or accessed via a stable interface (e.g., from `ScheduleRepository`).
*   **Dependencies (Post-Refactor):** `VisualizationService` depends on metrics data structure. Called by `AnalyticsController`.
*   **Risks & Mitigation:** Breaking visualizations. Mitigation: Manual visual inspection after changes.
*   **Verification:** Manually verify all views in the Analytics dashboard render correctly with different data.

**(Target 6: `src/analytics.js`)**

*   **Current State:** Module (~600 lines) calculating various metrics, insights, and suggestions.
*   **Proposed Structure:** `AnalyticsService` class/module.
*   **Refactoring Steps:**
    1.  **Tests:** Add characterization tests for `calculateMetrics`, `generateInsights`, `generateSuggestions` with sample input data and expected outputs.
    2.  **Encapsulate:** Ensure logic is within an `AnalyticsService` class/module.
    3.  **Decompose Complex Calculations:** If functions like `calculateOverallQuality`, `generateSuggestions`, or specific metric calculations are overly complex, break them into smaller, testable private functions.
*   **Dependencies (Post-Refactor):** `AnalyticsService` depends on schedule and constraint data structures. Used by `AnalyticsController`.
*   **Risks & Mitigation:** Incorrect metric calculations. Mitigation: Characterization tests.
*   **Verification:** Run tests. Manually verify metrics displayed in the Analytics dashboard match expectations for sample schedules.

**5. Verification Strategy (Overall)**

*   **Automated Tests:** Run the full test suite (including newly added characterization tests) after each incremental refactoring step. Aim to maintain or increase test coverage throughout the process.
*   **Manual Testing:** After each significant refactoring step (e.g., refactoring a module, extracting a major component), perform targeted manual testing based on the features affected and the scenarios outlined in `test-plan.md`.
*   **Code Reviews:** Conduct code reviews for refactored code, focusing on adherence to the plan, improved structure, and testability.
*   **Coverage Reports:** Regularly generate coverage reports (`npm run test:coverage`) to monitor progress and identify gaps.

**6. Incremental Approach**

*   Refactor one module at a time, following the priority order.
*   Within each module, refactor step-by-step (e.g., extract one function/class, update callers, test, commit).
*   Merge changes frequently into a dedicated refactoring branch.
*   Ensure all automated tests pass before each merge.
*   Regularly sync with the main development branch (if applicable) to avoid large merge conflicts.

**7. Conclusion**

This refactoring plan addresses the identified issues of large, complex files and low test coverage. By systematically enhancing test coverage and then incrementally decomposing modules like `app.js`, `data.js`, and `class-manager.js` while clarifying the roles of `solver-wrapper.js`, `visualization.js`, and `analytics.js`, we can significantly improve the codebase's modularity, testability, and maintainability. This will make future development, debugging, and feature additions much safer and more efficient.