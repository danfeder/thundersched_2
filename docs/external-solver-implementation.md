Okay, here is the revised implementation plan incorporating the minor adjustments and confirmations:

## Implementation Plan: External Constraint Solver Integration (`glpk.js`)

**Goal:** Integrate the `glpk.js` npm package to replace the current mock/fallback simulation logic in `solver-wrapper.js`. This will provide accurate feasibility checking and conflict identification for the "What-If Analysis" feature, establishing a robust foundation for Phase 4.

**Rationale:** Using a dedicated solver like GLPK allows for mathematically sound verification of whether a schedule is possible under modified constraints, handling complex interactions more reliably than heuristic checks. This improves the accuracy of the What-If feature and enables future optimization capabilities.

**Prerequisites:**

1.  **Environment:** Node.js and npm (or yarn) installed for package management.
2.  **Codebase:** Familiarity with the existing project structure, particularly `src/solver-wrapper.js`, `src/library-loader.js`, `src/data.js`, `src/scheduler.js`, and `src/app.js` (specifically the What-If modal logic).
3.  **Concepts:** A basic understanding of Linear Programming (LP) / Mixed Integer Programming (MIP) concepts will be helpful for implementing `buildSolverModel`.

**Library Acquisition & Setup:**

1.  **Install `glpk.js`:**
    *   Navigate to the project's root directory in your terminal.
    *   Run: `npm install glpk.js` (or `yarn add glpk.js`)

2.  **Locate Library Files:**
    *   After installation, the necessary files will be in `node_modules/glpk.js/dist/`.
    *   The key file is likely `glpk.min.js` (or `glpk.js`). This single file often contains the factory to load both the JS and WASM versions.
    *   Confirm if a separate `.wasm` file is present in the `dist` directory.

3.  **Serving the Library:**
    *   Ensure your development server (e.g., the Python server in `run-tests.sh` or any other) can correctly serve files from the `node_modules/glpk.js/dist/` path.
    *   Alternatively, copy the necessary file(s) (e.g., `glpk.min.js` and potentially `glpk.wasm`) from `node_modules/glpk.js/dist/` to your project's `libs/` directory and update paths in `solver-wrapper.js` accordingly. Copying might be simpler given the current project structure without a build step. **(Recommendation: Copy to `libs/`)**
    *   **Verification Note:** Crucially, verify during implementation exactly how `glpk.min.js` expects to locate the `.wasm` file when both are placed in the `libs/` directory. It typically uses a relative path, but confirmation is needed to ensure WASM loads correctly.

**Core Implementation Steps:**

1.  **Modify `src/library-loader.js` (Optional but Recommended):**
    *   While `glpk.js` might be loaded differently (via its factory), `LibraryLoader` can still be used to load the *script* file itself.
    *   Update the `loadLibrary` call within `solver-wrapper.js` to point to the correct path (e.g., `libs/glpk.min.js` if copied) and adjust the `checkFn` to look for the factory: `() => typeof window.GLPKFactory === 'function'`.

2.  **Refactor `src/solver-wrapper.js`:**

    *   **`loadSolver` Function:**
        *   Remove the current mock solver assignment.
        *   Use `LibraryLoader.loadLibrary` to load the main `glpk.js` script (e.g., from `libs/glpk.min.js`). Pass the `checkFn` `() => typeof window.GLPKFactory === 'function'`.
        *   `await` the loading promise.
        *   Once the script is loaded, call the factory: `const factory = window.GLPKFactory;`.
        *   Initialize the solver by calling the factory, which returns a promise: `const glpk = await factory();`. (Note: The factory itself usually handles WASM vs JS preference internally).
        *   Assign the resolved `glpk` object to `_solver`: `_solver = glpk;`.
        *   Set `_isInitialized = true`.
        *   Add comprehensive `try...catch` blocks around loading and initialization. Store errors in `_initializationError` and set `_isInitialized = false` on failure. Log success/failure clearly.
        *   Manage the `_initializationPromise` state to prevent race conditions during initialization.

    *   **`buildSolverModel` Function:**
        *   **Data Preparation:** Receive the full multi-week `scheduleData`, `newConstraints`, `teacherUnavailability`, and `classDefinitions` (from `dataManager.getClasses()`) as input.
        *   **Pre-filtering (Crucial):**
            *   Create a mapping for efficient class conflict lookup: `const classConflictMap = new Map(classDefinitions.map(c => [c.name, c.conflicts]));`.
            *   Identify all potentially valid slots across all weeks based on `teacherUnavailability`.
            *   Identify potentially valid *class assignments*: Iterate through classes and the valid slots. Check `classConflictMap` for hard conflicts. Only proceed if the class *can* be scheduled in that slot.
        *   **Variables:**
            *   Define GLPK binary variables **only** for the valid class assignments identified above. Ensure the naming convention includes week information: `v_{classIdx}_{weekIdx}_{dayIdx}_{period}`. The `weekIdx` should correspond to the index/key used in the `scheduleData` object.
            *   Store a mapping from these variable names back to `{ className, dateStr, period, weekOffset }`.
        *   **Objective Function:** Define as a feasibility problem: `objective: { direction: _solver.GLP_MAX, name: 'feasibility', vars: [] }` (or omit `vars`).
        *   **Constraints (`subjectTo`):** Add constraints using only the defined variables, ensuring logic correctly spans weeks using `weekIdx`:
            *   **Slot Occupancy:** For each slot `(w, d, p)`, `Sum(v_{c}_{w}_{d}_{p} for all valid c) <= 1`.
            *   **Max Consecutive Teaching:** For each day `(w, d)`, iterate periods `p` to `8 - newConstraints.maxConsecutiveClasses`. Constraint: `Sum(v_{c}_{w}_{d}_{p+i} for all valid c, for i = 0 to newConstraints.maxConsecutiveClasses) <= newConstraints.maxConsecutiveClasses`.
            *   **Max Daily Classes:** For each day `(w, d)`, `Sum(v_{c}_{w}_{d}_{p} for all valid c, p) <= newConstraints.maxClassesPerDay`.
            *   **Weekly Load:** For each week `w`, `newConstraints.minClassesPerWeek <= Sum(v_{c}_{w}_{d}_{p} for all valid c, d, p) <= newConstraints.maxClassesPerWeek`. Use bounds type `_solver.GLP_DB`.
        *   **Return Value:** Return an object containing `{ problem: glpkProblemStructure, varMap: variableToDetailMapping }`.
        *   **Performance Note:** Building the model for the entire schedule is necessary for weekly constraints but may impact performance, especially with many weeks; this should be monitored during testing.

    *   **`runSolverWithTimeout` Function:**
        *   Accept the GLPK `problem` structure.
        *   Define solver options: `const options = { tmlim: 30000, mipGap: 0.05, presol: true, msglev: _solver.GLP_MSG_ERR };` (30s timeout, 5% gap, presolver enabled, errors only). **Note:** Adjust `mipGap` (e.g., to `0.01` or `0.0`) during testing if higher precision is needed and performance allows.
        *   Implement `Promise.race` with `setTimeout(reject, 30000)`.
        *   Inside the solver promise, call `_solver.solve(problem, options)`. **Implementation Note:** Ensure all GLPK constants (e.g., `_solver.GLP_MAX`, `_solver.GLP_OPT`, `_solver.GLP_DB`, `_solver.GLP_MSG_ERR`) are referenced via the loaded `_solver` object, not hardcoded.
        *   **Result Handling:** Check `result.result.status` against solver constants (`_solver.GLP_OPT`, `_solver.GLP_FEAS`, `_solver.GLP_INFEAS`, etc.). Map these statuses to clear return values (e.g., `{ status: 'optimal', solution: result.result.vars }`, `{ status: 'infeasible' }`, `{ status: 'timeout' }`, `{ status: 'error', message: ... }`).

    *   **`simulateConstraintChanges` Function:**
        *   Call `this.initialize()` if needed; fall back to `basicConstraintSimulation` on initialization error.
        *   Get `classDefinitions` from `dataManager`.
        *   Call `buildSolverModel` with the full multi-week `scheduleData`, `newConstraints`, `teacherUnavailability`, `classDefinitions`.
        *   Call `runSolverWithTimeout` with the built model.
        *   **Interpret Results:**
            *   **If Solver Success (Optimal/Feasible):**
                *   `feasible: true`.
                *   `solution = result.solution`.
                *   Iterate through the input `scheduleData`. For each scheduled class `(c, w, d, p)`: find the corresponding variable name using `varMap`. Check its value in `solution`. If `< 0.5`, add it to `invalidPlacements`.
                *   Calculate `currentClassCount` and `simulatedClassCount`.
                *   `source: 'solver'`.
            *   **If Solver Infeasible:**
                *   `feasible: false`.
                *   Log the infeasible status.
                *   Run `findInvalidPlacementsWithNewConstraints` (basic checker) for *indicative* conflicts.
                *   `invalidPlacements = result_from_basic_checker`.
                *   `source: 'solver_infeasible_fallback_analysis'`.
            *   **If Solver Timeout or Error:**
                *   Log error/timeout.
                *   Run `basicConstraintSimulation`.
                *   Return its result, setting `source: 'fallback_timeout'` or `source: 'fallback_error'`.
        *   **Return Structure:** Return `{ feasible, invalidPlacements, currentClassCount, simulatedClassCount, source, /* other metrics */ }`.

3.  **Update `src/app.js` Result Handling:**
    *   In `displayWhatIfResults`:
        *   Check the `source` field. If it indicates fallback or heuristic analysis, clearly state this in the UI.
        *   Ensure correct use of the `feasible` flag and `invalidPlacements` list.
    *   In `applyWhatIfResults` / `applyConstraintChangesWithRemovals`: Ensure it correctly uses the `invalidPlacements` array, regardless of the `source`.

4.  **Testing Strategy:**

    *   **Unit Tests (`solver-wrapper.test.js`):**
        *   Mock `window.GLPKFactory` and `glpk.solve`.
        *   Test `loadSolver` promise handling.
        *   Test `buildSolverModel`: Verify variable creation (respecting pre-filtering, multi-week indices) and constraint formulation.
        *   Test `runSolverWithTimeout`: Mock `solve` returning different statuses and test interpretation. Test timeout.
        *   Test `simulateConstraintChanges`: Test interpretation of feasible/infeasible results and fallback logic.
    *   **Integration Tests (`test-what-if.html`):**
        *   Test with the real `glpk.js`.
        *   Create feasible, infeasible, and near-timeout scenarios.
        *   Test applying changes after different simulation outcomes.
    *   **Performance Testing:**
        *   Use `console.time` / `console.timeEnd`.
        *   Test with large, multi-week schedules. Monitor solver time.
        *   If performance is an issue, consider relaxing `mipGap` or simplifying the model.

**Potential Challenges & Considerations:**

*   **`glpk.js` API:** Double-check the exact API, status constants, and result structure of the specific `glpk.js` version.
*   **WASM Loading:** Ensure the `.wasm` file is served correctly and accessible (CORS, MIME types).
*   **Model Correctness:** Debugging MIP models requires care. Use `msglev: _solver.GLP_MSG_ALL` during development for verbose output.
*   **Infeasibility Insight:** Getting detailed reasons for infeasibility is complex. The fallback heuristic analysis is a pragmatic approach for user feedback.