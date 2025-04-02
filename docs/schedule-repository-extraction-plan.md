# Plan: Extract ScheduleRepository (Cycle 2 of data.js Refactoring)

**Reference:** `docs/refactoring-plan.md` (lines 177-180)

**Goal:** Extract schedule management logic and state from `src/data.js` into a new `src/repositories/schedule-repository.js` module, ensuring the application remains functional throughout the process.

**Detailed Steps:**

1.  **Create `ScheduleRepository.js`:**
    *   Create a new file: `src/repositories/schedule-repository.js`.
    *   Define a `ScheduleRepository` class.
    *   The constructor should accept dependencies: `DataStore`, `PersistenceService`, `DateUtils`, and `ClassRepository`.

2.  **Move Logic & State to `ScheduleRepository`:**
    *   **State:** Move the management of `scheduleWeeks`, `teacherUnavailability`, `scheduleStartDate`, and `currentWeekOffset` from `DataManager`/`DataStore` interactions *into* `ScheduleRepository`. The repository will use the `DataStore` instance passed to it for the actual storage but will contain the primary logic for accessing and modifying this state.
    *   **Methods:** Move the following methods from `src/data.js` into `ScheduleRepository.js`, adapting them to use the injected dependencies and internal state management:
        *   `setStartDate`
        *   `initializeEmptyWeek`
        *   `getCurrentWeekSchedule`
        *   `getCurrentWeekDates`
        *   `changeWeek`
        *   `getSchedule`
        *   `scheduleClass`
        *   `unscheduleClass`
        *   `resetSchedule`
        *   `resetAllSchedules`
        *   `getUnscheduledClasses`
        *   `getCurrentWeekScheduledClasses`
        *   `isTeacherUnavailable`
        *   `toggleTeacherUnavailability`
    *   **Refactor Internal Calls:** Update the moved methods within `ScheduleRepository` to call each other directly.

3.  **Update `DataManager.js`:**
    *   Import `ScheduleRepository`.
    *   In the constructor, instantiate `ScheduleRepository`, passing dependencies (`this.dataStore`, `this.persistenceService`, `DateUtils`, `this.classRepository`). Assign to `this.scheduleRepository`.
    *   Remove the definitions of the moved methods.
    *   Update any remaining internal logic in `DataManager` that *used* the moved methods.

4.  **Update Caller Modules:**
    *   Modify `config-controller.js`, `event-handler-service.js`, `what-if-controller.js`, `scheduler.js`, `ui-manager.js` to access schedule functions via `ScheduleRepository`.
    *   **Dependency Injection:** Update `AppInitializer` to get the `scheduleRepository` instance from `DataManager` and pass it to the constructors/initialization methods of the controllers/services that need it.
    *   **Code Changes:** Replace calls like `this.dataManager.scheduleClass(...)` with `this.scheduleRepository.scheduleClass(...)`.

5.  **Testing & Verification:**
    *   **Automated Tests:** Run the full test suite. Add new unit tests for `ScheduleRepository`.
    *   **Manual Testing:** Perform targeted manual testing focusing on schedule manipulation, week navigation, teacher mode, reset, start date, loading schedules, and unscheduled class list updates.

**Proposed Dependency Structure Change:**

```mermaid
graph TD
    subgraph Core Services
        DataStore
        PersistenceService
        DateUtils
        ClassRepository
        ScheduleRepository((ScheduleRepository))
        ConfigManager((ConfigManager))
        SavedStateRepository((SavedStateRepository))
    end

    subgraph Controllers & UI
        AppInitializer
        EventHandlerService
        UIManager
        Scheduler
        ConfigController
        WhatIfController
        SaveLoadController
        AnalyticsController
    end

    AppInitializer --> DataManager --> DataStore & PersistenceService & ClassRepository & ScheduleRepository & ConfigManager & SavedStateRepository;
    DataManager -- creates --> ScheduleRepository;
    ScheduleRepository --> DataStore & PersistenceService & DateUtils & ClassRepository;

    AppInitializer -- passes repo --> EventHandlerService;
    AppInitializer -- passes repo --> UIManager;
    AppInitializer -- passes repo --> Scheduler;
    AppInitializer -- passes repo --> ConfigController;
    AppInitializer -- passes repo --> WhatIfController;
    AppInitializer -- passes repo --> SaveLoadController;
    AppInitializer -- passes repo --> AnalyticsController;

    EventHandlerService -- uses --> ScheduleRepository;
    UIManager -- uses --> ScheduleRepository;
    Scheduler -- uses --> ScheduleRepository;
    ConfigController -- uses --> ScheduleRepository;
    WhatIfController -- uses --> ScheduleRepository;
    SaveLoadController -- uses --> ScheduleRepository;
    AnalyticsController -- uses --> ScheduleRepository;

    %% Existing dependencies shown lightly for context
    DataManager -.-> DateUtils; %% Likely removed or reduced
    EventHandlerService -.-> DataManager; %% Reduced scope
    UIManager -.-> DataManager; %% Reduced scope
    Scheduler -.-> DataManager; %% Reduced scope
    ConfigController -.-> DataManager; %% Reduced scope
    WhatIfController -.-> DataManager; %% Reduced scope
    SaveLoadController -.-> DataManager; %% Reduced scope
    AnalyticsController -.-> DataManager; %% Reduced scope

    classDef new fill:#ccffcc,stroke:#333,stroke-width:2px;
    class ScheduleRepository,ConfigManager,SavedStateRepository new;
```

**Risk Mitigation:**

*   Incremental Steps
*   Frequent Automated Testing
*   Targeted Manual Checks
*   Version Control