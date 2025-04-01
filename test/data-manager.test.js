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

  // --- Schedule Management Tests (Now testing facade delegation) ---
  describe('Schedule Management', () => {
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

  describe('Teacher Availability', () => {
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
  
  // --- Configuration Management Tests (Now testing facade delegation) ---
  describe('Configuration Management', () => {
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


  // --- Saved Schedules Tests (Now testing facade delegation) ---
  describe('Saved Schedules', () => {
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
    
    describe('Saved Class Collections', () => {
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