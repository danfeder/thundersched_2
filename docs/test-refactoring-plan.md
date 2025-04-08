# Test Refactoring Plan: Splitting `test/data-manager.test.js`

**Date:** 2025-04-03

**Goal:** Split the overly large `test/data-manager.test.js` file into separate, focused test files for each repository (`ClassRepository`, `ScheduleRepository`, `ConfigManager`, `SavedStateRepository`) and the remaining `DataManager` facade logic. This addresses maintainability concerns and potential tooling issues caused by the large file size.

**Rationale:**
*   Aligns test structure with the refactored code structure.
*   Adheres to the Single Responsibility Principle (SRP) for tests.
*   Makes test files smaller and more manageable.
*   Aims to resolve potential tool friction related to file size/complexity.
*   Improves long-term maintainability of the test suite.

**Plan:**

1.  **Create New Test Files:**
    *   Create `test/repositories/class-repository.test.js`.
    *   Create `test/repositories/schedule-repository.test.js`.
    *   Create `test/repositories/config-manager.test.js`.
    *   Create `test/repositories/saved-state-repository.test.js`.

2.  **Set Up New Test Files:**
    *   For each new file:
        *   Add necessary imports (`jest`, the repository class itself, relevant mocks from `test/test-setup.js`, potentially `DateUtils`).
        *   Create the main `describe` block for the repository (e.g., `describe('ClassRepository', () => { ... });`).
        *   Add a `beforeEach` block to set up fresh mocks (`mockDataStore`, `mockPersistenceService`, etc.) and instantiate the *real* repository class under test, injecting the mocks.

3.  **Identify and Move Tests from `test/data-manager.test.js`:**
    *   **Read `test/data-manager.test.js`** to analyze its structure.
    *   **For `ClassRepository`:**
        *   Identify tests currently within the "Class Management (Mock Repository)" block.
        *   Move these tests into `test/repositories/class-repository.test.js`.
        *   Adapt the tests to instantiate and test the *real* `ClassRepository`, interacting with mocked `DataStore` and `PersistenceService`. Remove assertions that only checked if the mock was called.
    *   **For `ScheduleRepository`:**
        *   Identify relevant skipped characterization tests (e.g., "DataManager Characterization - Schedule Logic" and "DataManager Characterization - Teacher Availability Logic").
        *   Move these tests into `test/repositories/schedule-repository.test.js`.
        *   Adapt them to instantiate and test the *real* `ScheduleRepository`, interacting with mocked dependencies (`DataStore`, `PersistenceService`, `ClassRepository`).
    *   **For `ConfigManager`:**
        *   Identify relevant characterization tests ("DataManager Characterization - Config Logic").
        *   Move these into `test/repositories/config-manager.test.js`.
        *   Adapt them to instantiate and test the *real* `ConfigManager`.
    *   **For `SavedStateRepository`:**
        *   Identify relevant characterization tests ("DataManager Characterization - Saved State Logic").
        *   Move these into `test/repositories/saved-state-repository.test.js`.
        *   Adapt them to instantiate and test the *real* `SavedStateRepository`.
    *   **For `DataManager` (Remaining Logic):**
        *   Keep the main `describe('DataManager', ...)` block in `test/data-manager.test.js`.
        *   Keep the `beforeEach` setup, but ensure it instantiates the real `DataManager` and mocks all its repository dependencies (`mockClassRepository`, `mockScheduleRepository`, `mockConfigManager`, `mockSavedStateRepository`).
        *   Keep only the *delegation tests* (e.g., "Configuration Management (Delegation)", "Saved Schedules (Delegation)", "Saved Class Collections (Delegation)") within this file. Ensure these tests verify that the correct methods on the *mocked repositories* are called by the `DataManager` facade methods.
        *   Remove all the characterization test blocks that were moved.

4.  **Refine Mocks (`test/test-setup.js`):**
    *   Review the mock implementations (`createMockClassRepository`, `createMockScheduleRepository`, etc.). Ensure they are simple and only provide the necessary interface for testing *other* components (like `DataManager` delegation tests). Remove complex internal logic from mocks if it's not needed for testing interactions. The real logic is now tested in the dedicated repository test files.

5.  **Run Tests Iteratively:**
    *   After creating and populating each new repository test file, run *only that file* (e.g., `npm test -- test/repositories/class-repository.test.js`) to ensure its tests pass.
    *   After cleaning up `test/data-manager.test.js`, run it to ensure the delegation tests pass.
    *   Finally, run the full test suite (`npm test`) to catch any unexpected interactions.

**Diagram of New Test Structure:**

```mermaid
graph TD
    subgraph Test Files
        T_DM["test/data-manager.test.js"] -- tests delegation --> M_CR & M_SR & M_CM & M_SSR;
        T_CR["test/repositories/class-repository.test.js"] -- tests --> CR;
        T_SR["test/repositories/schedule-repository.test.js"] -- tests --> SR;
        T_CM["test/repositories/config-manager.test.js"] -- tests --> CM;
        T_SSR["test/repositories/saved-state-repository.test.js"] -- tests --> SSR;
    end

    subgraph Source Files
        DM["src/data.js"] -- uses --> CR & SR & CM & SSR;
        CR["src/repositories/class-repository.js"];
        SR["src/repositories/schedule-repository.js"];
        CM["src/repositories/config-manager.js"];
        SSR["src/repositories/saved-state-repository.js"];
    end

     subgraph Mocks
        M_CR["Mock ClassRepository"];
        M_SR["Mock ScheduleRepository"];
        M_CM["Mock ConfigManager"];
        M_SSR["Mock SavedStateRepository"];
     end

    classDef test fill:#ccf,stroke:#333,stroke-width:2px;
    classDef src fill:#f9f,stroke:#333,stroke-width:2px;
    classDef mock fill:#ddd,stroke:#666,stroke-width:1px;

    class T_DM,T_CR,T_SR,T_CM,T_SSR test;
    class DM,CR,SR,CM,SSR src;
    class M_CR,M_SR,M_CM,M_SSR mock;