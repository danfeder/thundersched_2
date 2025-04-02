# Decision Log

This file records architectural and implementation decisions using a list format.
2025-04-01 21:12:53 - Log of updates made.

*   [2025-04-01 21:21:51] During `ScheduleRepository` extraction, determined that `Scheduler` needs temporary access to both the new `scheduleRepository` (for schedule data/methods) and the existing `dataManager` (specifically for `getConfig`, until `ConfigManager` is extracted).
*

## Decision

*   [2025-04-01 21:21:51] Maintains functionality as `getConfig` is not part of the schedule responsibility being moved. Avoids premature refactoring of config access.
*

## Rationale 

*   [2025-04-01 21:21:51] Modified `Scheduler` constructor to accept both dependencies. Updated `AppInitializer` to provide both. Calls within `Scheduler` updated to use the correct dependency (`scheduleRepository` for schedule methods, `dataManager` for `getConfig`).
*
*   [2025-04-01 21:57:32] Debugged TypeErrors after initial `ScheduleRepository` extraction. Root cause was incorrect/incomplete dependency injection updates in `AppInitializer` for `EventHandlerService`, `AnalyticsController`, and `WhatIfController`.

## Implementation Details

*
*   [2025-04-01 21:57:32] Ensure all necessary dependencies (including potentially both `scheduleRepository` and `dataManager` temporarily) are passed correctly during refactoring to avoid breaking existing functionality.
*   [2025-04-01 21:57:32] Corrected argument order for `EventHandlerService` instantiation. Added missing `dataManager` and `classRepository` dependencies to `AnalyticsController` and `WhatIfController` constructors and instantiation calls in `AppInitializer`. Corrected internal dependency usage in `AnalyticsController`.
*   [2025-04-01 22:01:07] Process Adjustment: After completing a significant refactoring milestone (e.g., extracting a component and updating callers), explicitly prompt the user for targeted manual testing of affected features before moving to the next step. This aims to catch regressions earlier.
*   [2025-04-01 22:01:07] To better align with the goal of maintaining functionality throughout incremental refactoring and avoid late discovery of breakages.
*   [2025-04-01 22:01:07] Before starting the *next* refactoring cycle or major step, use `ask_followup_question` to suggest specific user testing actions based on the code just modified.