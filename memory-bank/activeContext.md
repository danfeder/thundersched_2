# Active Context

  This file tracks the project's current status, including recent changes, current goals, and open questions.
  2025-04-01 21:12:37 - Log of updates made.

*

*   [2025-04-01 21:24:52] Implementing Cycle 2 of `data.js` refactoring: Extracting `ScheduleRepository`. Currently updating caller modules, specifically `ConfigController`.
*   [2025-04-01 21:33:45] Implementing Cycle 2 of `data.js` refactoring: Extracting `ScheduleRepository`. Updated callers `ConfigController`, `EventHandlerService`, `UIManager`. Currently updating `WhatIfController`.
*   [2025-04-01 21:58:00] Implementing Cycle 2 of `data.js` refactoring: Extracting `ScheduleRepository`. Paused caller updates to debug dependency injection errors. Errors resolved, ready to resume `WhatIfController` update.
*   [2025-04-01 22:04:33] Pausing session. Completed initial updates for `ScheduleRepository` callers and fixed related dependency errors. What-If simulation runs, but `applyConstraintChangesWithRemovals` in `WhatIfController` and `solver-wrapper.js` internals still need refactoring.
## Current Focus

*   

*   [2025-04-01 21:17:08] Created `src/repositories/schedule-repository.js`.
*   [2025-04-01 21:25:36] Updated `ConfigController` to use `scheduleRepository`.
*   [2025-04-01 21:41:08] Fixed argument order mismatch for `EventHandlerService` instantiation in `AppInitializer`.
*   [2025-04-01 22:03:58] Updated `AppInitializer`, `Scheduler`, `ConfigController`, `EventHandlerService`, `UIManager`, `AnalyticsController`, `WhatIfController` constructors and relevant method calls.
*   [2025-04-01 22:03:58] Removed obsolete script from `index.html`.
*   [2025-04-01 21:44:45] Fixed `AnalyticsController` constructor and instantiation in `AppInitializer` to include `dataManager` dependency. Updated internal calls in `AnalyticsController`.
*   [2025-04-01 21:56:37] Fixed `WhatIfController` constructor and instantiation in `AppInitializer` to include `dataManager` and `classRepository` dependencies.
*   [2025-04-01 21:28:27] Updated `EventHandlerService` to use `scheduleRepository`.
*   [2025-04-01 21:32:52] Updated `UIManager` to use `scheduleRepository`.
*   [2025-04-01 22:01:56] Process Change: Will prompt for targeted user testing after completing refactoring milestones.
*   [2025-04-01 22:04:33] Need to finish updating `WhatIfController` (`applyConstraintChangesWithRemovals`). Need to refactor `solver-wrapper.js` internals (`buildSolverModel`, `basicConstraintSimulation`, `findInvalidPlacementsWithNewConstraints`) to remove `dataManager` dependency. Need to run tests.
*   [2025-04-01 21:33:11] Updated `WhatIfController` constructor.
*   [2025-04-01 21:19:30] Moved schedule-related methods from `data.js` to `schedule-repository.js`.
*   [2025-04-01 21:58:00] Need to finish updating `WhatIfController` calls (`applyConstraintChangesWithRemovals`), then refactor `solver-wrapper.js` internals, then run tests.
*   [2025-04-01 21:21:45] Updated `src/app-initializer.js` for dependency injection.
*   [2025-04-01 21:23:50] Updated `src/scheduler.js` to use `scheduleRepository` (and temporarily `dataManager` for config).
## Recent Changes
*   [2025-04-01 21:33:45] Need to finish updating `WhatIfController` calls, then run tests.

*   

*   [2025-04-01 21:24:52] Need to ensure all callers (`ConfigController`, `EventHandlerService`, `UIManager`, `WhatIfController`) are correctly updated to use `scheduleRepository` and that tests pass after each modification.
## Open Questions/Issues

*