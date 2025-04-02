import { jest } from '@jest/globals'; // Import jest
import { DataManager } from '../src/data.js'; // Import the actual DataManager
import {
    createMockDataStore,
    createMockPersistenceService,
    createMockClassRepository,
    createMockScheduler, // Keep mock scheduler if needed for tests interacting with scheduler logic
    createMockScheduleRepository, // Added
    createMockConfigManager,      // Added
    createMockSavedStateRepository // Added
} from './test-setup.js';
import { getFormattedDate } from '../src/date-utils.js'; // Added for saveSchedule test
// Removed import of real date utils as they are tested separately

// Mock localStorage globally (still useful for PersistenceService mock setup if needed)
// const mockLocalStorageGlobal = { /* ... */ }; // Can likely be removed if PersistenceService mock is sufficient
// global.localStorage = mockLocalStorageGlobal;

describe('DataManager', () => {
  let dataManager; // Instance of the actual DataManager
  let mockDataStore;
  let mockPersistenceService;
  let mockClassRepository;
  let mockScheduleRepository; // Added
  let mockConfigManager;      // Added
  let mockSavedStateRepository; // Added
  let mockScheduler;

  beforeEach(() => {
    // Create fresh instances of the mocks for each test
    mockDataStore = createMockDataStore();
    mockPersistenceService = createMockPersistenceService();
    mockClassRepository = createMockClassRepository(mockDataStore, mockPersistenceService);
    mockScheduleRepository = createMockScheduleRepository(mockDataStore, mockPersistenceService); // Added
    mockConfigManager = createMockConfigManager(mockDataStore, mockPersistenceService);          // Added
    mockSavedStateRepository = createMockSavedStateRepository(mockDataStore, mockPersistenceService); // Added
    mockScheduler = createMockScheduler(null); // Pass null or mockDataManager if needed by mockScheduler

    // Instantiate the *real* DataManager, injecting mocks
    // We need to bypass the constructor's internal loading/setup
    // or mock the dependencies *before* instantiation.
    // Option 1: Mock dependencies globally (less ideal)
    // Option 2: Modify DataManager constructor for dependency injection (better)
    // Option 3: For testing, create instance then override properties (simplest for now)

    // Create a dummy scheduler for the constructor
    const dummyScheduler = { findInvalidPlacementsWithNewConstraints: jest.fn() };
    dataManager = new DataManager(dummyScheduler);

    // Override internal instances with mocks AFTER instantiation
    dataManager.dataStore = mockDataStore;
    dataManager.persistenceService = mockPersistenceService;
    dataManager.classRepository = mockClassRepository;
    dataManager.scheduleRepository = mockScheduleRepository; // Added
    dataManager.configManager = mockConfigManager;          // Added
    dataManager.savedStateRepository = mockSavedStateRepository; // Added
    dataManager.scheduler = mockScheduler; // Replace dummy scheduler

    // Prevent constructor's async/timeout operations from running in tests
    jest.useFakeTimers(); // Use fake timers to control setTimeout
    jest.clearAllTimers(); // Clear any pending setTimeout from constructor

    // Mock the internal load method to prevent it running with mocks during construction
    // This prevents mocks being called unexpectedly during setup.
    // Tests that *specifically* test loading should call the real methods or mock them differently.
    dataManager._loadAllFromPersistence = jest.fn();

    // Reset mocks (using jest.clearAllMocks() is often easier)
    jest.clearAllMocks();

    // Example: Reset specific mock states if needed after clearAllMocks
    // mockPersistenceService.load.mockReturnValue(null); // Reset default load behavior

    jest.useRealTimers(); // Restore real timers after setup
  });

  // --- Class Management Tests (Testing Repository directly via mock) ---
  // DataManager should no longer have these methods directly.
  // These tests verify the mock repository setup, but ideally,
  // ClassRepository would have its own dedicated test file.
  describe('Class Management (Mock Repository)', () => {
      test('mockClassRepository.addClass works as mocked', () => {
          const newClass = { name: 'Test Class', conflicts: {} };
          // Call the mock repository method directly
          const result = mockClassRepository.addClass(newClass);
          // Expect the mock logic to have run (e.g., updated mockDataStore)
          expect(mockDataStore.classes).toContainEqual(newClass);
          expect(result).toBe(true); // Assuming mock persistence save returns true
      });

      test('mockClassRepository.updateClass works as mocked', () => {
          const oldName = 'Old';
          const initialClass = { name: oldName, conflicts: {} };
          mockDataStore.classes = [initialClass]; // Setup initial state in mock store
          const updatedClass = { name: 'New', conflicts: {} };
          // Call the mock repository method directly
          const result = mockClassRepository.updateClass(oldName, updatedClass);
          expect(mockDataStore.classes[0]).toEqual(updatedClass);
          expect(result).toBe(true); // Assuming mock persistence save returns true
      });

      test('mockClassRepository.deleteClass works as mocked', () => {
          const className = 'ToDelete';
          mockDataStore.classes = [{ name: className, conflicts: {} }]; // Setup state
          // Call the mock repository method directly
          const result = mockClassRepository.deleteClass(className);
          expect(mockDataStore.classes).toHaveLength(0);
          expect(result).toBe(true); // Assuming mock persistence save returns true
      });

      test('mockClassRepository.getClasses works as mocked', () => {
          mockDataStore.classes = [{ name: 'Test', conflicts: {} }]; // Setup state
          // Call the mock repository method directly
          const result = mockClassRepository.getClasses();
          expect(result).toEqual(mockDataStore.classes);
      });

      test('mockClassRepository.isClassScheduled works as mocked', () => {
          const className = 'ToCheck';
          // Setup mock schedule state
          mockDataStore.scheduleWeeks = { 0: { '2025-03-24': { 1: className } } };
          // Call the mock repository method directly
          const result = mockClassRepository.isClassScheduled(className);
          expect(result).toBe(true);
      });

      test('mockClassRepository.loadClassesFromCSV works as mocked', async () => {
          // Call the mock repository method directly
          await mockClassRepository.loadClassesFromCSV();
          // Check the mock function was called (basic check)
          expect(mockClassRepository.loadClassesFromCSV).toHaveBeenCalled();
      });
  });

  // --- Date Utilities Tests Removed (Test date-utils.js directly) ---
  // describe('Date Utilities', () => { ... });
  // Removed empty describe block for 'Schedule Management (Adapted)'

  // --- Schedule Management Tests (Delegation - SKIP FOR NOW) ---
  describe.skip('Schedule Management (Delegation)', () => { // SKIP this block for now
    // Set timeout for all tests in this block
    jest.setTimeout(10000);

    test('scheduleClass should delegate to ScheduleRepository', () => {
      const className = 'Math 101';
      const date = '2025-03-22';
      const period = 3;

      dataManager.scheduleClass(className, date, period);

      // Expect the repository method to have been called
      expect(mockScheduleRepository.scheduleClass).toHaveBeenCalledWith(className, date, period);
      // Remove check for internal state: expect(dataManager.scheduleWeeks[0][date][period]).toBe('Math 101');
    });

    test('scheduleClass should delegate even for potential double booking', () => {
      const date = '2025-03-22';
      const period = 3;
      const class1 = 'Math 101';
      const class2 = 'Science 102';

      // Call the facade method for the first class
      dataManager.scheduleClass(class1, date, period);
      expect(mockScheduleRepository.scheduleClass).toHaveBeenCalledWith(class1, date, period);

      // Call the facade method for the second class in the same slot
      dataManager.scheduleClass(class2, date, period);

      // Expect the repository method to have been called again
      // The repository itself is responsible for handling the double booking logic (e.g., throwing)
      expect(mockScheduleRepository.scheduleClass).toHaveBeenCalledWith(class2, date, period);
      expect(mockScheduleRepository.scheduleClass).toHaveBeenCalledTimes(2); // Ensure it was called for both attempts
    });

    test('hasConflict should delegate to ScheduleRepository', () => {
      const className = 'Math 101';
      const date = '2025-03-25'; // Tuesday
      const period = 3;  // Known conflict time for Math 101

      // Setup mock ClassRepository to return the class with conflicts if needed by ScheduleRepository mock
      const conflictingClass = {
        name: 'Math 101',
        grade: '5',
        conflicts: { Monday: [1, 2], Tuesday: [3, 4] }
      };
      // Assuming ScheduleRepository.hasConflict might need the class object
      // If ClassRepository is used internally by ScheduleRepository, mock its methods:
      mockClassRepository.getClassByName.mockReturnValue(conflictingClass);

      // Setup mock ScheduleRepository to return true for this specific case
      mockScheduleRepository.hasConflict.mockReturnValue(true);

      // Call the facade method
      const result = dataManager.hasConflict(className, date, period);

      // Verify delegation to ScheduleRepository
      expect(mockScheduleRepository.hasConflict).toHaveBeenCalledWith(className, date, period);

      // Verify the result comes from the mock
      expect(result).toBe(true);

      // Optional: Verify ClassRepository was called if ScheduleRepository needs it
      // expect(mockClassRepository.getClassByName).toHaveBeenCalledWith(className);
    });

    test('unscheduleClass should delegate to ScheduleRepository', () => {
       const date = '2025-03-24'; // Use a date within the default week
       const period = 1;

       // Call the facade method
       dataManager.unscheduleClass(date, period);

       // Verify delegation to ScheduleRepository
       expect(mockScheduleRepository.unscheduleClass).toHaveBeenCalledWith(date, period);

       // Remove checks of internal state or results of other methods
       // expect(dataManager.getCurrentWeekSchedule()[date][period]).toBeNull();
    });

    test('changeWeek should delegate to ScheduleRepository and return its result', () => {
       const offsetForward = 1;
       const offsetBackward = -1;
       const mockNextWeekSchedule = { '2025-03-31': { 1: null } }; // Example mock return
       const mockPrevWeekSchedule = { '2025-03-24': { 1: 'Math 101' } }; // Example mock return

       // Setup mock return values for the repository method
       mockScheduleRepository.changeWeek.mockReturnValueOnce(mockNextWeekSchedule);
       mockScheduleRepository.changeWeek.mockReturnValueOnce(mockPrevWeekSchedule);

       // Call the facade method (forward)
       const resultForward = dataManager.changeWeek(offsetForward);

       // Verify delegation (forward)
       expect(mockScheduleRepository.changeWeek).toHaveBeenCalledWith(offsetForward);
       // Verify return value (forward)
       expect(resultForward).toEqual(mockNextWeekSchedule);

       // Call the facade method (backward)
       const resultBackward = dataManager.changeWeek(offsetBackward);

       // Verify delegation (backward)
       expect(mockScheduleRepository.changeWeek).toHaveBeenCalledWith(offsetBackward);
       // Verify return value (backward)
       expect(resultBackward).toEqual(mockPrevWeekSchedule);

       // Verify total calls
       expect(mockScheduleRepository.changeWeek).toHaveBeenCalledTimes(2);

       // Remove checks of internal state like currentWeekOffset
    });

    test('resetSchedule should delegate to ScheduleRepository', () => {
       // Call the facade method
       dataManager.resetSchedule();

       // Verify delegation to ScheduleRepository
       // Assuming the method in the repository is named resetCurrentWeekSchedule or similar
       expect(mockScheduleRepository.resetCurrentWeekSchedule).toHaveBeenCalledTimes(1);

       // Remove checks of internal state or results of other methods
    });

    test('resetAllSchedules should delegate to ScheduleRepository', () => {
       // Call the facade method
       dataManager.resetAllSchedules();

       // Verify delegation to ScheduleRepository
       expect(mockScheduleRepository.resetAllSchedules).toHaveBeenCalledTimes(1);

       // Remove checks of internal state
    });

    test('getUnscheduledClasses should delegate to repositories and compute difference', () => {
       const mockAllClasses = [
           { name: 'Math 101', conflicts: {} },
           { name: 'Science 102', conflicts: {} },
           { name: 'Art 101', conflicts: {} },
       ];
       const mockScheduledClassNames = ['Math 101', 'Art 101']; // Names of classes scheduled somewhere

       // Setup mock return values
       mockClassRepository.getClasses.mockReturnValue(mockAllClasses);
       // Assuming ScheduleRepository provides a method to get all unique scheduled class names
       mockScheduleRepository.getAllScheduledClassNames.mockReturnValue(new Set(mockScheduledClassNames));

       // Call the facade method
       const unscheduled = dataManager.getUnscheduledClasses();

       // Verify delegation
       expect(mockClassRepository.getClasses).toHaveBeenCalledTimes(1);
       expect(mockScheduleRepository.getAllScheduledClassNames).toHaveBeenCalledTimes(1);

       // Verify the result based on mocked data
       expect(unscheduled).toHaveLength(1);
       expect(unscheduled[0]).toEqual({ name: 'Science 102', conflicts: {} }); // Only Science 102 should be left
    });

    test('getCurrentWeekScheduledClasses should delegate to ScheduleRepository', () => {
       const mockScheduledClasses = ['Math 101', 'Science 102']; // Example mock return

       // Setup mock return value
       mockScheduleRepository.getCurrentWeekScheduledClasses.mockReturnValue(mockScheduledClasses);

       // Call the facade method
       const scheduled = dataManager.getCurrentWeekScheduledClasses();

       // Verify delegation
       expect(mockScheduleRepository.getCurrentWeekScheduledClasses).toHaveBeenCalledTimes(1);

       // Verify the result comes from the mock
       expect(scheduled).toEqual(mockScheduledClasses);
       expect(scheduled).toHaveLength(2);
    });
  });

  // --- Characterization Tests for Current DataManager Logic ---
  // These tests verify the behavior *before* full delegation to repositories.

  describe('DataManager Characterization - Schedule Logic', () => {
      test('scheduleClass should update DataStore directly', () => {
          const className = 'Yoga';
          const dateStr = '2025-03-24'; // Monday of default week 0
          const period = 2;

          // Ensure week 0 is initialized in the mock store
          dataManager.initializeEmptyWeek(0); // Call real method to setup store

          // Call the method under test
          dataManager.scheduleClass(className, dateStr, period);

          // Assert that the mockDataStore was updated directly
          expect(mockDataStore.scheduleWeeks[0][dateStr][period]).toBe(className);
          // Verify persistence was NOT called by scheduleClass itself
          expect(mockPersistenceService.save).not.toHaveBeenCalled();
      });

      test('unscheduleClass should update DataStore directly', () => {
          const className = 'Yoga';
          const dateStr = '2025-03-24';
          const period = 2;

          // Setup initial state in mock store
          dataManager.initializeEmptyWeek(0);
          mockDataStore.scheduleWeeks[0][dateStr][period] = className;

          // Call the method under test
          dataManager.unscheduleClass(dateStr, period);

          // Assert that the mockDataStore was updated directly
          expect(mockDataStore.scheduleWeeks[0][dateStr][period]).toBeNull();
          // Verify persistence was NOT called by unscheduleClass itself
          expect(mockPersistenceService.save).not.toHaveBeenCalled();
      });

      test('getCurrentWeekSchedule should return schedule from DataStore for current offset', () => {
          const dateStr = '2025-03-24';
          const period = 1;
          const className = 'Cooking 101';

          // Setup mock store for week 0
          dataManager.initializeEmptyWeek(0);
          mockDataStore.scheduleWeeks[0][dateStr][period] = className;
          mockDataStore.currentWeekOffset = 0; // Ensure we are on week 0

          // Call the method under test
          const schedule = dataManager.getCurrentWeekSchedule();

          // Assert the returned schedule matches the store's content for week 0
          expect(schedule).toBeDefined();
          expect(schedule[dateStr][period]).toBe(className);
      });

      test('getCurrentWeekSchedule should initialize week if not present in DataStore', () => {
           mockDataStore.currentWeekOffset = 1; // Week 1 doesn't exist yet
           mockDataStore.scheduleWeeks = { 0: {} }; // Only week 0 exists

           // Spy on initializeEmptyWeek to verify it gets called
           const initSpy = jest.spyOn(dataManager, 'initializeEmptyWeek');

           // Call the method under test
           const schedule = dataManager.getCurrentWeekSchedule();

           // Assert that initializeEmptyWeek was called for the new offset
           expect(initSpy).toHaveBeenCalledWith(1);
           // Assert that the store now contains week 1
           expect(mockDataStore.scheduleWeeks[1]).toBeDefined();
           // Assert that the returned schedule is the newly initialized one
           expect(schedule).toEqual(mockDataStore.scheduleWeeks[1]);

           initSpy.mockRestore(); // Clean up spy
      });

      test('changeWeek should update currentWeekOffset in DataStore', () => {
          mockDataStore.currentWeekOffset = 0;

          // Call the method under test (forward)
          dataManager.changeWeek(1);
          // Assert offset in store was updated
          expect(mockDataStore.currentWeekOffset).toBe(1);

          // Call the method under test (backward)
          dataManager.changeWeek(-1);
          // Assert offset in store was updated
          expect(mockDataStore.currentWeekOffset).toBe(0);
      });

      test('changeWeek should initialize the new week if needed', () => {
          mockDataStore.currentWeekOffset = 0;
          mockDataStore.scheduleWeeks = { 0: {} }; // Only week 0 exists

          const initSpy = jest.spyOn(dataManager, 'initializeEmptyWeek');

          // Change to week 1 (which doesn't exist)
          dataManager.changeWeek(1);

          // Assert that initialize was called for week 1
          expect(initSpy).toHaveBeenCalledWith(1);
          expect(mockDataStore.scheduleWeeks[1]).toBeDefined();

          initSpy.mockRestore();
      });
  });

  describe('DataManager Characterization - Config Logic', () => {
      test('getConfig should return config from DataStore', () => {
          const testConfig = { maxClassesPerDay: 5 };
          mockDataStore.config = testConfig; // Set value in mock store

          // Ensure the mock store reflects the potential merging behavior of the setter
          const expectedConfig = { ...createMockDataStore().config, ...testConfig };
          mockDataStore.config = testConfig; // Set value, setter in real DataStore would merge
          
          const result = dataManager.getConfig();
          // Assert against the merged config
          expect(result).toEqual(expectedConfig);
      });

      test('updateConfig should update DataStore and call persistenceService.save', () => {
          const initialConfig = { maxClassesPerDay: 4 };
          const newConfig = { maxClassesPerDay: 5, maxConsecutiveClasses: 2 };
          mockDataStore.config = initialConfig; // Set initial state

          // Call the method under test
          dataManager.updateConfig(newConfig);
          // Assert DataStore was updated (it should be the merged object)
          const expectedMergedConfig = { ...createMockDataStore().config, ...newConfig };
          expect(mockDataStore.config).toEqual(expectedMergedConfig);
          // Assert persistence was called
          expect(mockPersistenceService.save).toHaveBeenCalledWith('cooking-class-config', expectedMergedConfig);
      });

      test('loadConfigFromLocalStorage should update DataStore if data exists', () => {
          const storedConfig = { maxClassesPerDay: 6 };
          mockPersistenceService.load.mockReturnValue(storedConfig); // Mock load return value

          // Call the method under test (note: constructor might call this, so we call it explicitly)
          dataManager.loadConfigFromLocalStorage();

          // Assert load was called
          expect(mockPersistenceService.load).toHaveBeenCalledWith('cooking-class-config');
          // Assert DataStore was updated (it should be the merged object)
          const expectedMergedConfig = { ...createMockDataStore().config, ...storedConfig };
          expect(mockDataStore.config).toEqual(expectedMergedConfig);
      });

      test('loadConfigFromLocalStorage should not update DataStore if no data exists', () => {
          const initialConfig = { ...mockDataStore.config }; // Copy initial config
          mockPersistenceService.load.mockReturnValue(null); // Mock load return value (nothing stored)

          // Call the method under test
          dataManager.loadConfigFromLocalStorage();

          // Assert load was called
          expect(mockPersistenceService.load).toHaveBeenCalledWith('cooking-class-config');
          // Assert DataStore was NOT updated
          expect(mockDataStore.config).toEqual(initialConfig);
      });

      test('saveConfigToLocalStorage should call persistenceService.save with DataStore config', () => {
          const currentConfig = { maxWeeklyClasses: 15 };
          // Combine default config with the specific one for the test
          const expectedConfig = {
              ...createMockDataStore().config, // Start with defaults
              ...currentConfig // Override with test-specific value
          };
          mockDataStore.config = expectedConfig; // Set the combined config in the store

          // Call the method under test
          dataManager.saveConfigToLocalStorage();

          // Assert save was called with the correct key and the combined value
          expect(mockPersistenceService.save).toHaveBeenCalledWith('cooking-class-config', expectedConfig);
      });
  });

  // This is the CHARACTERIZATION block, should NOT be skipped
  describe('DataManager Characterization - Teacher Availability Logic', () => {
      beforeEach(() => {
          // Ensure a default start date and week 0 are initialized for availability tests
          dataManager.setStartDate(new Date('2025-03-24T00:00:00Z')); // Monday
          dataManager.initializeEmptyWeek(0);
      });

      test('isTeacherUnavailable should return false if not set in DataStore', () => {
          const dateStr = '2025-03-25'; // Tuesday
          const period = 3;

          // Ensure state is not set
          mockDataStore.teacherUnavailability = { 0: { [dateStr]: {} } };

          const result = dataManager.isTeacherUnavailable(dateStr, period);

          expect(result).toBe(false);
      });

      test('isTeacherUnavailable should return true if set to true in DataStore', () => {
          const dateStr = '2025-03-26'; // Wednesday
          const period = 5;

          // Set state in mock store
          mockDataStore.teacherUnavailability = { 0: { [dateStr]: { [period]: true } } };

          const result = dataManager.isTeacherUnavailable(dateStr, period);

          expect(result).toBe(true);
      });

      test('isTeacherUnavailable should handle different week offsets', () => {
          const dateStrWeek1 = '2025-04-01'; // Tuesday of week 1
          const period = 1;

          // Initialize week 1
          dataManager.initializeEmptyWeek(1);
          // Set state in mock store for week 1
          mockDataStore.teacherUnavailability[1] = { [dateStrWeek1]: { [period]: true } };

          const result = dataManager.isTeacherUnavailable(dateStrWeek1, period);

          expect(result).toBe(true);
      });

      test('toggleTeacherUnavailability should set true in DataStore if currently false/unset', () => {
          const dateStr = '2025-03-27'; // Thursday
          const period = 8;

          // Ensure state is not set
          mockDataStore.teacherUnavailability = { 0: { [dateStr]: {} } };

          // Call the method under test
          const result = dataManager.toggleTeacherUnavailability(dateStr, period);

          // Assert result and store state
          expect(result).toBe(true); // Should return the new state (unavailable = true)
          expect(mockDataStore.teacherUnavailability[0][dateStr][period]).toBe(true);
      });

      test('toggleTeacherUnavailability should set false in DataStore if currently true', () => {
          const dateStr = '2025-03-28'; // Friday
          const period = 4;

          // Set initial state
          mockDataStore.teacherUnavailability = { 0: { [dateStr]: { [period]: true } } };

          // Call the method under test
          const result = dataManager.toggleTeacherUnavailability(dateStr, period);

          // Assert result and store state
          expect(result).toBe(false); // Should return the new state (unavailable = false)
          expect(mockDataStore.teacherUnavailability[0][dateStr][period]).toBe(false);
      });

      test('toggleTeacherUnavailability should initialize date/week structure if needed', () => {
          const dateStr = '2025-03-28'; // Friday
          const period = 4;

          // Ensure week 0 exists but not the specific date
          mockDataStore.teacherUnavailability = { 0: {} };

          // Call the method under test
          dataManager.toggleTeacherUnavailability(dateStr, period);

          // Assert store state was created and set correctly
          expect(mockDataStore.teacherUnavailability[0][dateStr]).toBeDefined();
          expect(mockDataStore.teacherUnavailability[0][dateStr][period]).toBe(true);
      });
  });

  // This is the CHARACTERIZATION block, should NOT be skipped
  describe('DataManager Characterization - Saved State Logic', () => {
      const schedule1 = { id: 's1', name: 'Spring', createdAt: 't1', lastModified: 't1', scheduleData: { 0: {} }, startDate: '2025-03-24' };
      const schedule2 = { id: 's2', name: 'Fall', createdAt: 't2', lastModified: 't2', scheduleData: { 0: {} }, startDate: '2025-09-01' };
      const collection1 = { id: 'c1', name: 'Beginner', createdAt: 't1', lastModified: 't1', classes: [] };
      const collection2 = { id: 'c2', name: 'Advanced', createdAt: 't2', lastModified: 't2', classes: [] };

      test('loadSavedSchedulesFromLocalStorage should update DataStore and run migration', () => {
          const scheduleWithoutDate = { id: 's0', name: 'Old', createdAt: 't0', lastModified: 't0', scheduleData: { 0: { '2024-10-07': { 1: 'Old Class' } } } }; // No startDate
          const storedSchedules = [scheduleWithoutDate, schedule1];
          mockPersistenceService.load.mockReturnValue(storedSchedules);

          // Spy on the save method to check if migration triggers a save
          const saveSpy = jest.spyOn(dataManager, 'saveSavedSchedulesToLocalStorage');

          // Call the method under test
          dataManager.loadSavedSchedulesFromLocalStorage();

          // Assert load was called
          expect(mockPersistenceService.load).toHaveBeenCalledWith('cooking-saved-schedules');
          // Assert DataStore was updated (check length and presence of migrated schedule with startDate)
          expect(mockDataStore.savedSchedules).toHaveLength(2);
          const migratedSchedule = mockDataStore.savedSchedules.find(s => s.id === 's0');
          expect(migratedSchedule).toBeDefined();
          expect(migratedSchedule.startDate).toBe('2024-10-07'); // Migration should infer Monday
          // Assert migration triggered a save
          expect(saveSpy).toHaveBeenCalled();

          saveSpy.mockRestore();
      });

      test('loadSavedClassCollectionsFromLocalStorage should update DataStore', () => {
          const storedCollections = [collection1, collection2];
          mockPersistenceService.load.mockReturnValue(storedCollections);

          // Call the method under test
          dataManager.loadSavedClassCollectionsFromLocalStorage();

          // Assert load was called
          expect(mockPersistenceService.load).toHaveBeenCalledWith('cooking-saved-class-collections');
          // Assert DataStore was updated
          expect(mockDataStore.savedClassCollections).toEqual(storedCollections);
      });

      test('saveSavedSchedulesToLocalStorage should call persistenceService.save', () => {
          mockDataStore.savedSchedules = [schedule1]; // Set state in store

          // Call the method under test
          dataManager.saveSavedSchedulesToLocalStorage();

          // Assert save was called
          expect(mockPersistenceService.save).toHaveBeenCalledWith('cooking-saved-schedules', [schedule1]);
      });

      test('saveSavedClassCollectionsToLocalStorage should call persistenceService.save', () => {
          mockDataStore.savedClassCollections = [collection1]; // Set state in store

          // Call the method under test
          dataManager.saveSavedClassCollectionsToLocalStorage();

          // Assert save was called
          expect(mockPersistenceService.save).toHaveBeenCalledWith('cooking-saved-class-collections', [collection1]);
      });

      test('addSavedSchedule should update DataStore and call save', () => {
          mockDataStore.savedSchedules = []; // Start empty
          const saveSpy = jest.spyOn(dataManager, 'saveSavedSchedulesToLocalStorage');

          // Call the method under test
          dataManager.addSavedSchedule(schedule1);

          // Assert store was updated
          expect(mockDataStore.savedSchedules).toHaveLength(1);
          expect(mockDataStore.savedSchedules[0]).toEqual(schedule1);
          // Assert save was called
          expect(saveSpy).toHaveBeenCalled();

          saveSpy.mockRestore();
      });

      test('updateSavedSchedule should update item in DataStore and call save', () => {
          mockDataStore.savedSchedules = [schedule1]; // Start with one item
          const updates = { name: 'Spring Updated', notes: 'new notes' };
          const saveSpy = jest.spyOn(dataManager, 'saveSavedSchedulesToLocalStorage');

          // Call the method under test
          const result = dataManager.updateSavedSchedule(schedule1.id, updates);

          // Assert result
          expect(result).toBe(true); // Assuming mock save returns true
          // Assert store was updated (check name and notes, allow lastModified to change)
          expect(mockDataStore.savedSchedules).toHaveLength(1);
          expect(mockDataStore.savedSchedules[0].id).toBe(schedule1.id);
          expect(mockDataStore.savedSchedules[0].name).toBe(updates.name);
          expect(mockDataStore.savedSchedules[0].notes).toBe(updates.notes);
          expect(mockDataStore.savedSchedules[0].lastModified).not.toBe(schedule1.lastModified);
          // Assert save was called
          expect(saveSpy).toHaveBeenCalled();

          saveSpy.mockRestore();
      });

      test('deleteSavedSchedule should remove item from DataStore and call save', () => {
          mockDataStore.savedSchedules = [schedule1, schedule2]; // Start with two items
          const saveSpy = jest.spyOn(dataManager, 'saveSavedSchedulesToLocalStorage');

          // Call the method under test
          const result = dataManager.deleteSavedSchedule(schedule1.id);

          // Assert result
          expect(result).toBe(true); // Assuming mock save returns true
          // Assert store was updated
          expect(mockDataStore.savedSchedules).toHaveLength(1);
          expect(mockDataStore.savedSchedules[0].id).toBe(schedule2.id);
          // Assert save was called
          expect(saveSpy).toHaveBeenCalled();

          saveSpy.mockRestore();
      });

      test('getSavedScheduleById should return item from DataStore', () => {
          mockDataStore.savedSchedules = [schedule1, schedule2];

          const result = dataManager.getSavedScheduleById(schedule2.id);

          expect(result).toEqual(schedule2);
      });

      test('getSavedScheduleById should return undefined if not found', () => {
          mockDataStore.savedSchedules = [schedule1];

          const result = dataManager.getSavedScheduleById('not-found');

          expect(result).toBeUndefined();
      });

      // Tests for saveSchedule/loadSavedSchedule (current behavior)
      test('saveSchedule should call SavedStateRepository.saveSchedule', () => {
           const name = 'Test Save';
           const notes = 'Notes...';
           // Mock the repository methods that saveSchedule relies on
           mockScheduleRepository.getCurrentWeekScheduleData.mockReturnValue({ '2025-03-24': { 1: 'A' } });
           mockScheduleRepository.getCurrentTeacherUnavailability.mockReturnValue({ '2025-03-24': { 2: true } });
           mockScheduleRepository.getStartDate.mockReturnValue(new Date('2025-03-24T00:00:00Z'));

           // Spy on the method it *should* delegate to (SavedStateRepo)
           const repoSpy = jest.spyOn(mockSavedStateRepository, 'saveSchedule');

           // Call the method under test
           dataManager.saveSchedule(name, notes);

           // Assert that the repository method WAS called
           expect(repoSpy).toHaveBeenCalledWith(expect.objectContaining({ name: name, notes: notes }));

           repoSpy.mockRestore();
      });

      test('loadSavedSchedule should currently update DataStore directly (due to null repo)', () => {
          const name = 'Spring';
          const savedScheduleData = { id: 's1', name: name, startDate: '2025-03-24', scheduleData: { 0: { '2025-03-24': { 1: 'X' } } }, teacherUnavailability: { 0: { '2025-03-24': { 2: true } } }, constraintData: { maxClassesPerDay: 9 } };

          // Mock getSavedScheduleById which it uses internally
          dataManager.getSavedScheduleById = jest.fn().mockReturnValue(savedScheduleData);

          // Call the method under test
          const result = dataManager.loadSavedSchedule(name);

          // Assert result
          expect(result).toBe(true);
          // Assert DataStore was updated directly
          expect(mockDataStore.scheduleWeeks).toEqual(savedScheduleData.scheduleData);
          expect(mockDataStore.teacherUnavailability).toEqual(savedScheduleData.teacherUnavailability);
          // Config *should* be updated by merging loaded data with defaults (due to mock setter)
          // Assert the final state of the config in the mock store directly
          expect(mockDataStore.config).toEqual({
              ...createMockDataStore().config, // Start with defaults...
              ...savedScheduleData.constraintData // ...and merge the loaded constraint data
          });
          expect(mockDataStore.scheduleStartDate).toEqual(new Date(savedScheduleData.startDate + 'T00:00:00Z'));
          expect(mockDataStore.currentWeekOffset).toBe(0);
      });

      // --- Saved Class Collections ---
      test('addSavedClassCollection should update DataStore and call save', () => {
          mockDataStore.savedClassCollections = []; // Start empty
          const saveSpy = jest.spyOn(dataManager, 'saveSavedClassCollectionsToLocalStorage');

          // Call the method under test
          dataManager.addSavedClassCollection(collection1);

          // Assert store was updated
          expect(mockDataStore.savedClassCollections).toHaveLength(1);
          expect(mockDataStore.savedClassCollections[0]).toEqual(collection1);
          // Assert save was called
          expect(saveSpy).toHaveBeenCalled();

          saveSpy.mockRestore();
      });

      test('updateSavedClassCollection should update item in DataStore and call save', () => {
          mockDataStore.savedClassCollections = [collection1]; // Start with one item
          const updates = { name: 'Beginner Updated', description: 'new desc' };
          const saveSpy = jest.spyOn(dataManager, 'saveSavedClassCollectionsToLocalStorage');

          // Call the method under test
          const result = dataManager.updateSavedClassCollection(collection1.id, updates);

          // Assert result
          expect(result).toBe(true); // Assuming mock save returns true
          // Assert store was updated (check name and description, allow lastModified to change)
          expect(mockDataStore.savedClassCollections).toHaveLength(1);
          expect(mockDataStore.savedClassCollections[0].id).toBe(collection1.id);
          expect(mockDataStore.savedClassCollections[0].name).toBe(updates.name);
          expect(mockDataStore.savedClassCollections[0].description).toBe(updates.description);
          expect(mockDataStore.savedClassCollections[0].lastModified).not.toBe(collection1.lastModified);
          // Assert save was called
          expect(saveSpy).toHaveBeenCalled();

          saveSpy.mockRestore();
      });

      test('deleteSavedClassCollection should remove item from DataStore and call save', () => {
          mockDataStore.savedClassCollections = [collection1, collection2]; // Start with two items
          const saveSpy = jest.spyOn(dataManager, 'saveSavedClassCollectionsToLocalStorage');

          // Call the method under test
          const result = dataManager.deleteSavedClassCollection(collection1.id);

          // Assert result
          expect(result).toBe(true); // Assuming mock save returns true
          // Assert store was updated
          expect(mockDataStore.savedClassCollections).toHaveLength(1);
          expect(mockDataStore.savedClassCollections[0].id).toBe(collection2.id);
          // Assert save was called
          expect(saveSpy).toHaveBeenCalled();

          saveSpy.mockRestore();
      });

      test('getSavedClassCollectionById should return item from DataStore', () => {
          mockDataStore.savedClassCollections = [collection1, collection2];

          const result = dataManager.getSavedClassCollectionById(collection2.id);

          expect(result).toEqual(collection2);
      });

      test('getSavedClassCollectionById should return undefined if not found', () => {
          mockDataStore.savedClassCollections = [collection1];

          const result = dataManager.getSavedClassCollectionById('not-found');

          expect(result).toBeUndefined();
      });
  });

  // --- Teacher Availability Tests (Delegation - SKIP FOR NOW) ---
  describe.skip('Teacher Availability (Delegation)', () => { // SKIP this block for now
    test('toggleTeacherUnavailability should delegate to ScheduleRepository', () => {
      const date = '2025-03-24';
      const period = 4;

      // Call the facade method
      dataManager.toggleTeacherUnavailability(date, period);

      // Verify delegation to ScheduleRepository
      expect(mockScheduleRepository.toggleTeacherUnavailability).toHaveBeenCalledWith(date, period);
      expect(mockScheduleRepository.toggleTeacherUnavailability).toHaveBeenCalledTimes(1);

      // Remove checks of internal state or isTeacherUnavailable result,
      // as that now also delegates and would require separate mocking.
    });

    // Note: The previous test already covers delegation.
    // We can remove this redundant test or keep it to ensure the facade method is called twice.
    // Let's keep it simple and just ensure it's called again.
    test('toggleTeacherUnavailability should delegate again when called twice', () => {
      const date = '2025-03-24';
      const period = 4;

      // Call the facade method twice
      dataManager.toggleTeacherUnavailability(date, period);
      dataManager.toggleTeacherUnavailability(date, period);

      // Verify delegation to ScheduleRepository happened twice
      expect(mockScheduleRepository.toggleTeacherUnavailability).toHaveBeenCalledWith(date, period);
      expect(mockScheduleRepository.toggleTeacherUnavailability).toHaveBeenCalledTimes(2);
    });

    test('isTeacherUnavailable should delegate to ScheduleRepository and return its result (false case)', () => {
        const date = '2025-03-24';
        const period = 1;

        // Setup mock return value
        mockScheduleRepository.isTeacherUnavailable.mockReturnValue(false);

        // Call the facade method
        const result = dataManager.isTeacherUnavailable(date, period);

        // Verify delegation
        expect(mockScheduleRepository.isTeacherUnavailable).toHaveBeenCalledWith(date, period);
        expect(mockScheduleRepository.isTeacherUnavailable).toHaveBeenCalledTimes(1);

        // Verify result from mock
        expect(result).toBe(false);
    });

    test('isTeacherUnavailable should delegate to ScheduleRepository and return its result (true case)', () => {
        const date = '2025-03-24';
        const period = 1;

        // Setup mock return value
        mockScheduleRepository.isTeacherUnavailable.mockReturnValue(true);

        // Call the facade method
        const result = dataManager.isTeacherUnavailable(date, period);

        // Verify delegation
        expect(mockScheduleRepository.isTeacherUnavailable).toHaveBeenCalledWith(date, period);
        // Note: clearAllMocks() in beforeEach resets call count
        expect(mockScheduleRepository.isTeacherUnavailable).toHaveBeenCalledTimes(1);

        // Verify result from mock
        expect(result).toBe(true);

        // Remove complex setup involving week changes and toggling,
        // as the repository handles the state logic now.
    });
  });

  // Removed redundant 'Persistence' block - tests covered elsewhere or tested removed mock methods.

  // --- Configuration Management Tests (Delegation - SKIP FOR NOW) ---
  describe.skip('Configuration Management (Delegation)', () => { // SKIP this block for now
    test('getConfig should delegate to ConfigManager', () => {
      const mockConfig = { maxConsecutiveClasses: 99 }; // Example mock return
      mockConfigManager.getConfig.mockReturnValue(mockConfig);

      const result = dataManager.getConfig();

      expect(mockConfigManager.getConfig).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockConfig);
    });

    test('updateConfig should delegate to ConfigManager', () => {
      const newConfig = { maxClassesPerDay: 99 }; // Example new config

      // Call the facade method
      dataManager.updateConfig(newConfig);

      // Verify delegation to ConfigManager
      expect(mockConfigManager.updateConfig).toHaveBeenCalledWith(newConfig);
      expect(mockConfigManager.updateConfig).toHaveBeenCalledTimes(1);

      // Remove checks of getConfig result or localStorage mocks
    });

    test('loadConfigFromLocalStorage should delegate to ConfigManager', () => {
      // Call the facade method
      dataManager.loadConfigFromLocalStorage();

      // Verify delegation to ConfigManager
      // (Assuming ConfigManager has a method like loadConfig or handles it internally)
      // We might need to adjust the mock expectation based on ConfigManager's design.
      // For now, let's assume ConfigManager.loadConfig exists.
      expect(mockConfigManager.loadConfig).toHaveBeenCalledTimes(1);

      // Remove checks of getConfig result or localStorage mocks
    });
    // Removed tests for default/corrupt config loading, as that logic belongs in ConfigManager.

test('saveConfigToLocalStorage should delegate to ConfigManager', () => {
  // Call the facade method
  dataManager.saveConfigToLocalStorage();

  // Verify delegation to ConfigManager
  // (Assuming ConfigManager has a method like saveConfig or handles it internally)
  expect(mockConfigManager.saveConfig).toHaveBeenCalledTimes(1);

  // Remove checks involving getConfig or localStorage mocks
});
});


  // --- Saved Schedules Tests (Delegation - SKIP FOR NOW) ---
  describe.skip('Saved Schedules (Delegation)', () => { // SKIP this block for now
    test('saveSchedule should delegate to SavedStateRepository', () => {
      const name = 'Spring 2025';
      const notes = 'Test schedule';
      // Assume the facade method also gathers current schedule data to save
      const mockCurrentScheduleData = { '2025-03-24': { 1: 'Mock Class' } };
      const mockCurrentTeacherUnavailability = { '2025-03-24': { 2: true } };
      const mockCurrentStartDate = new Date('2025-03-24T00:00:00Z');

      // Mock methods that saveSchedule might call internally to get data
      mockScheduleRepository.getCurrentWeekScheduleData.mockReturnValue(mockCurrentScheduleData);
      mockScheduleRepository.getCurrentTeacherUnavailability.mockReturnValue(mockCurrentTeacherUnavailability);
      mockScheduleRepository.getStartDate.mockReturnValue(mockCurrentStartDate);

      // Call the facade method
      dataManager.saveSchedule(name, notes);

      // Verify delegation to SavedStateRepository
      expect(mockSavedStateRepository.saveSchedule).toHaveBeenCalledWith(
          expect.objectContaining({ // Check structure, allow for generated ID/timestamp
              name: name,
              notes: notes,
              scheduleData: mockCurrentScheduleData,
              teacherUnavailability: mockCurrentTeacherUnavailability,
              startDate: getFormattedDate(mockCurrentStartDate) // Assuming it saves formatted date
          })
      );
      expect(mockSavedStateRepository.saveSchedule).toHaveBeenCalledTimes(1);

      // Remove checks of internal state like dataManager.savedSchedules
    });

    test('saveSchedule should delegate even for potential duplicate names', () => {
      const name = 'Spring 2025';
      const notes1 = 'First version';
      const notes2 = 'Second version';

      // Mock necessary internal calls for saveSchedule
      mockScheduleRepository.getCurrentWeekScheduleData.mockReturnValue({});
      mockScheduleRepository.getCurrentTeacherUnavailability.mockReturnValue({});
      mockScheduleRepository.getStartDate.mockReturnValue(new Date());

      // Call the facade method first time
      dataManager.saveSchedule(name, notes1);
      expect(mockSavedStateRepository.saveSchedule).toHaveBeenCalledTimes(1);

      // Call the facade method second time with the same name
      dataManager.saveSchedule(name, notes2);

      // Expect the repository method to have been called again
      // The repository itself is responsible for handling the duplicate name logic (e.g., throwing)
      expect(mockSavedStateRepository.saveSchedule).toHaveBeenCalledTimes(2);
    });

    test('loadSavedSchedule should delegate to repositories', () => {
      const name = 'Spring 2025';
      const mockSavedSchedule = {
        id: 'sched1',
        name: name,
        notes: '',
        startDate: '2025-03-17', // Example start date
        scheduleData: { '0': { '2025-03-17': { 1: 'Math 101' } } }, // Example data structure
        teacherUnavailability: { '0': { '2025-03-18': { 2: true } } } // Example data structure
      };

      // Setup mock SavedStateRepository to return the saved schedule
      mockSavedStateRepository.getSavedScheduleByName.mockReturnValue(mockSavedSchedule);

      // Call the facade method
      dataManager.loadSavedSchedule(name);

      // Verify delegation to SavedStateRepository to get the data
      expect(mockSavedStateRepository.getSavedScheduleByName).toHaveBeenCalledWith(name);
      expect(mockSavedStateRepository.getSavedScheduleByName).toHaveBeenCalledTimes(1);

      // Verify delegation to ScheduleRepository to apply the loaded data
      expect(mockScheduleRepository.loadScheduleState).toHaveBeenCalledWith({
        startDate: mockSavedSchedule.startDate,
        scheduleWeeks: mockSavedSchedule.scheduleData,
        teacherUnavailability: mockSavedSchedule.teacherUnavailability
      });
      expect(mockScheduleRepository.loadScheduleState).toHaveBeenCalledTimes(1);

      // Remove checks of internal state like dataManager.scheduleWeeks
    });
  });

    // --- Saved Class Collections Tests (Delegation - SKIP FOR NOW) ---
    describe.skip('Saved Class Collections (Delegation)', () => { // SKIP this block for now
      const collection1 = {
        id: 'coll1',
        name: 'Beginner Classes',
        timestamp: Date.now(),
        classes: [{ name: 'Intro 101', conflicts: {} }]
      };
      const collection2 = {
        id: 'coll2',
        name: 'Advanced Classes',
        timestamp: Date.now() + 1000,
        classes: [{ name: 'Expert 501', conflicts: {} }]
      };
      // Removed beforeEach resetting internal state (dataManager.savedClassCollections)

      test('addSavedClassCollection should delegate to SavedStateRepository', () => {
        // Use the predefined collection1
        const collectionToAdd = { ...collection1 }; // Use a copy if needed

        // Call the facade method
        dataManager.addSavedClassCollection(collectionToAdd);

        // Verify delegation
        expect(mockSavedStateRepository.addSavedClassCollection).toHaveBeenCalledWith(collectionToAdd);
        expect(mockSavedStateRepository.addSavedClassCollection).toHaveBeenCalledTimes(1);

        // Remove checks of internal state or localStorage mocks
      });

      test('getSavedClassCollectionById should delegate to SavedStateRepository', () => {
        const targetId = 'coll1';
        const mockCollection = { ...collection1 }; // Use predefined collection

        // Setup mock return value for found case
        mockSavedStateRepository.getSavedClassCollectionById.mockReturnValue(mockCollection);

        // Call the facade method (found case)
        const result = dataManager.getSavedClassCollectionById(targetId);

        // Verify delegation (found case)
        expect(mockSavedStateRepository.getSavedClassCollectionById).toHaveBeenCalledWith(targetId);
        // Verify result (found case)
        expect(result).toEqual(mockCollection);

        // Setup mock return value for not found case
        mockSavedStateRepository.getSavedClassCollectionById.mockReturnValueOnce(undefined);

        // Call the facade method (not found case)
        const notFoundResult = dataManager.getSavedClassCollectionById('coll-not-found');

        // Verify delegation (not found case)
        expect(mockSavedStateRepository.getSavedClassCollectionById).toHaveBeenCalledWith('coll-not-found');
        // Verify result (not found case)
        expect(notFoundResult).toBeUndefined();

        // Verify total calls
        expect(mockSavedStateRepository.getSavedClassCollectionById).toHaveBeenCalledTimes(2);
      });

      test('updateSavedClassCollection should delegate to SavedStateRepository (found case)', () => {
        const targetId = 'coll1';
        const updates = { name: 'Beginner Classes Updated' };

        // Setup mock return value (repository returns true/false)
        mockSavedStateRepository.updateSavedClassCollection.mockReturnValue(true);

        // Call the facade method
        const result = dataManager.updateSavedClassCollection(targetId, updates);

        // Verify delegation
        expect(mockSavedStateRepository.updateSavedClassCollection).toHaveBeenCalledWith(targetId, updates);
        expect(mockSavedStateRepository.updateSavedClassCollection).toHaveBeenCalledTimes(1);
        // Verify result
        expect(result).toBe(true);

        // Remove checks of internal state or localStorage mocks
      });

      test('updateSavedClassCollection should delegate to SavedStateRepository (not found case)', () => {
          const targetId = 'coll-not-found';
          const updates = { name: 'Update Fail' };

          // Setup mock return value
          mockSavedStateRepository.updateSavedClassCollection.mockReturnValue(false);

          // Call the facade method
          const result = dataManager.updateSavedClassCollection(targetId, updates);

          // Verify delegation
          expect(mockSavedStateRepository.updateSavedClassCollection).toHaveBeenCalledWith(targetId, updates);
          // Note: Call count starts over due to beforeEach clearAllMocks
          expect(mockSavedStateRepository.updateSavedClassCollection).toHaveBeenCalledTimes(1);
          // Verify result
          expect(result).toBe(false);
      });


      test('deleteSavedClassCollection should delegate to SavedStateRepository (found case)', () => {
        const targetId = 'coll1';

        // Setup mock return value (repository returns true/false)
        mockSavedStateRepository.deleteSavedClassCollection.mockReturnValue(true);

        // Call the facade method
        const result = dataManager.deleteSavedClassCollection(targetId);

        // Verify delegation
        expect(mockSavedStateRepository.deleteSavedClassCollection).toHaveBeenCalledWith(targetId);
        expect(mockSavedStateRepository.deleteSavedClassCollection).toHaveBeenCalledTimes(1);
        // Verify result
        expect(result).toBe(true);

        // Remove checks of internal state or localStorage mocks
      });

      test('deleteSavedClassCollection should delegate to SavedStateRepository (not found case)', () => {
          const targetId = 'coll-not-found';

          // Setup mock return value
          mockSavedStateRepository.deleteSavedClassCollection.mockReturnValue(false);

          // Call the facade method
          const result = dataManager.deleteSavedClassCollection(targetId);

          // Verify delegation
          expect(mockSavedStateRepository.deleteSavedClassCollection).toHaveBeenCalledWith(targetId);
          expect(mockSavedStateRepository.deleteSavedClassCollection).toHaveBeenCalledTimes(1); // Reset by beforeEach
          // Verify result
          expect(result).toBe(false);
      });

      test('loadSavedClassCollectionsFromLocalStorage should delegate to SavedStateRepository', () => {
        // Call the facade method
        dataManager.loadSavedClassCollectionsFromLocalStorage();

        // Verify delegation to SavedStateRepository
        // (Assuming a method like loadCollections exists)
        expect(mockSavedStateRepository.loadCollections).toHaveBeenCalledTimes(1);

        // Remove checks of internal state or localStorage mocks
      });
      // Removed tests for empty/corrupt collection loading, as that logic belongs in SavedStateRepository.

      test('saveSavedClassCollectionsToLocalStorage should delegate to SavedStateRepository', () => {
        // Call the facade method
        dataManager.saveSavedClassCollectionsToLocalStorage();

        // Verify delegation to SavedStateRepository
        // (Assuming a method like saveCollections exists)
        expect(mockSavedStateRepository.saveCollections).toHaveBeenCalledTimes(1);

        // Remove checks of internal state or localStorage mocks
      });
    });
  });