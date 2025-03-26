# Implementation Plan: Automated Schedule Generation

**Goal:** Implement a feature that uses the integrated `glpk.js` solver to automatically generate a feasible schedule that includes all defined classes, packed into the fewest number of days possible.

**Context:** This builds upon the existing `glpk.js` integration used for the "What-If Analysis" feature. Key components like `solver-wrapper.js`, `dataManager.js`, and `scheduler.js` are already in place.

**Development Approach - Minimizing Disruption:**

*   **Isolation:** New functionality will be implemented primarily through *new* functions (e.g., `buildGenerationModel`, `generateSchedule` in `solver-wrapper.js`) rather than heavily modifying existing ones used by the What-If feature. This minimizes the risk of regressions in the What-If analysis.
*   **Controlled Interaction:** Interaction with shared components like `DataManager` will be carefully managed (e.g., getting class lists, getting constraints, applying the *final confirmed* schedule).
*   **User Confirmation:** The generated schedule will be presented as a **preview**, requiring explicit user confirmation before it replaces the active schedule data. This prevents accidental data loss.
*   **Clear State Management:** The process starts by explicitly clearing the schedule, ensuring a predictable starting point for generation and avoiding complex interactions with potentially pre-existing manual placements in this initial version.

**Core Requirements (Based on User Decisions):**

*   **Input:** The generator will attempt to schedule **all** classes currently defined in the `DataManager`.
*   **Pre-processing:** The **entire existing schedule** will be cleared before generation begins.
*   **Primary Constraint:** The generated schedule **must** include every defined class exactly once. If this is impossible, an error should be reported.
*   **Optimization Objective:** Among schedules that satisfy the primary constraint, the solver should aim to **minimize the number of days used**, packing classes as early as possible from the schedule start date.
*   **Solver Model:** A **new function** (`buildGenerationModel`) will be created within `solver-wrapper.js` specifically for this task, incorporating the "schedule all" constraints and the "minimize days" objective.
*   **Timeout:** The solver process will have a **90-second timeout**.
*   **Output (Success/Timeout):** If a feasible schedule is found (either optimally or the best within the timeout), it will be presented to the user as a **preview**. The user must confirm before this schedule replaces the current one in `DataManager` and the UI.
*   **Output (Infeasibility):** If the solver determines it's impossible to schedule all classes, a **detailed error message** will be displayed, aiming to provide insight into potential constraint conflicts.
*   **UI Integration:**
    *   A "Generate Schedule" button will be added **near the week navigation**.
    *   While running, a message **"Generating schedule..."** will be shown.
    *   Upon completion (success or timeout), a status message **"Preview Ready"** will be shown before displaying the preview.
    *   Upon failure (infeasibility), the detailed error message will be shown.

**High-Level Implementation Steps:**

1.  **Modify `solver-wrapper.js`:**
    *   Implement the new `buildGenerationModel` function:
        *   Accept the list of all classes to be scheduled.
        *   Define variables for all possible placements.
        *   Implement core constraints (slot occupancy, max consecutive, max daily, weekly load, teacher unavailability, class conflicts) similar to `buildSolverModel`.
        *   **Add "Schedule All" Constraints:** For each class `C`, add `Sum(v_C_w_d_p) = 1`.
        *   **Add "Minimize Days" Objective:** Define an objective function that penalizes using later days (e.g., minimize `Sum(weight_d * v_C_w_d_p)` where `weight_d` increases for later days `d`).
    *   Implement a new function `generateSchedule`:
        *   Takes the list of classes and constraints from `DataManager`.
        *   Calls `buildGenerationModel`.
        *   Calls `runSolverWithTimeout` with the generated model and the 90s timeout.
        *   Handles the solver result (optimal, feasible within time, infeasible, error).
        *   If feasible, extracts the best solution found.
2.  **Implement Output Parsing:**
    *   Create logic to translate the solver's variable solution (`result.result.vars`) back into the application's schedule format (`{ weekOffset: { dateStr: { period: className } } }`).
3.  **Modify `app.js` and `index.html`:**
    *   Add the "Generate Schedule" button near the week navigation.
    *   Implement the button's click handler:
        *   Clear the current schedule in `DataManager` (`dataManager.clearSchedule()`).
        *   Display the "Generating schedule..." message.
        *   Call `solverWrapper.generateSchedule()`.
        *   Handle the returned promise/result:
            *   On success/timeout: Show "Preview Ready", then display the parsed schedule in a preview mode (perhaps highlighting it differently or using a temporary display mechanism). Add "Apply" and "Cancel" buttons for the preview.
            *   On infeasibility: Display the detailed error message.
            *   On error: Display a generic error message.
    *   Implement the "Apply" logic for the preview: Update `DataManager` with the generated schedule and refresh the main UI grid.
    *   Implement the "Cancel" logic for the preview: Discard the generated schedule and potentially revert to an empty grid or the state before generation started.
4.  **Refine Infeasibility Message:** Investigate ways to provide more helpful details upon infeasibility, potentially by analyzing constraints or using solver-specific tools if available (though this can be complex).
5.  **Testing:** Add unit tests for `buildGenerationModel`, `generateSchedule`, and the output parsing logic. Add integration tests for the UI flow (button click, generation, preview, apply/cancel, error handling), paying specific attention to ensuring no side effects on the What-If feature.

---
This revised plan incorporates all the decisions made and explicitly emphasizes the goal of minimizing disruption to existing features.