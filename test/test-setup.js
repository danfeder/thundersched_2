// Test Setup and Utilities
import { jest } from '@jest/globals';
import * as DateUtils from '../src/date-utils.js'; // Import real DateUtils
// Import createMockConfigManager
// Import createMockConfigManager - Already done above, but ensure it's used below.
// Note: Recursive import like above isn't ideal, better to have mocks separate or ensure no circular deps. Assuming it works for now.

// --- Mock DataStore ---
// Creates a mock DataStore with jest functions for getters/setters
// Allows tests to inspect or control the underlying state if needed.
export const createMockDataStore = () => {
    const _state = {
        classes: [],
        scheduleWeeks: { 0: {} }, 
        teacherUnavailability: { 0: {} },
        savedSchedules: [],
        savedClassCollections: [],
        currentWeekOffset: 0,
        scheduleStartDate: new Date('2025-03-24T00:00:00Z'), 
        config: { 
            maxConsecutiveClasses: 2, maxClassesPerDay: 4, 
            minClassesPerWeek: 12, maxClassesPerWeek: 16 
        }
    };
    // Simple getters
    const store = {
        get classes() { return _state.classes; },
        get scheduleWeeks() { return _state.scheduleWeeks; },
        get teacherUnavailability() { return _state.teacherUnavailability; },
        get scheduleStartDate() { return _state.scheduleStartDate; },
        get currentWeekOffset() { return _state.currentWeekOffset; },
        get config() { return _state.config; },
        get savedSchedules() { return _state.savedSchedules; },
        get savedClassCollections() { return _state.savedClassCollections; },
    };
    // Mock setters to allow inspection
    store.setClasses = jest.fn((val) => { _state.classes = val; });
    store.setScheduleWeeks = jest.fn((val) => { _state.scheduleWeeks = val; });
    store.setTeacherUnavailability = jest.fn((val) => { _state.teacherUnavailability = val; });
    store.setScheduleStartDate = jest.fn((val) => { _state.scheduleStartDate = val; });
    store.setCurrentWeekOffset = jest.fn((val) => { _state.currentWeekOffset = val; });
    store.setConfig = jest.fn((val) => { _state.config = { ..._state.config, ...val }; }); // Merge config updates
    store.setSavedSchedules = jest.fn((val) => { _state.savedSchedules = val; });
    store.setSavedClassCollections = jest.fn((val) => { _state.savedClassCollections = val; });

    // Add setters to the store object itself for direct assignment in tests
    Object.defineProperty(store, 'classes', { set: store.setClasses });
    Object.defineProperty(store, 'scheduleWeeks', { set: store.setScheduleWeeks });
    Object.defineProperty(store, 'teacherUnavailability', { set: store.setTeacherUnavailability });
    Object.defineProperty(store, 'scheduleStartDate', { set: store.setScheduleStartDate });
    Object.defineProperty(store, 'currentWeekOffset', { set: store.setCurrentWeekOffset });
    Object.defineProperty(store, 'config', { set: store.setConfig });
    Object.defineProperty(store, 'savedSchedules', { set: store.setSavedSchedules });
    Object.defineProperty(store, 'savedClassCollections', { set: store.setSavedClassCollections });
    
    // Expose internal state for direct manipulation in tests if absolutely necessary
    store._state = _state; 

    return store;
};

// --- Mock PersistenceService ---
// Provides jest mocks for save/load/remove/clearAll
export const createMockPersistenceService = () => ({
    save: jest.fn().mockReturnValue(true), // Assume save succeeds by default
    load: jest.fn().mockReturnValue(null), // Assume load finds nothing by default
    remove: jest.fn(),
    clearAll: jest.fn(),
});

// --- Mock ClassRepository ---
// Mocks the methods now present in ClassRepository
export const createMockClassRepository = (mockDataStore, mockPersistenceService) => ({
    dataStore: mockDataStore, // Keep reference if needed
    persistenceService: mockPersistenceService, // Keep reference if needed
    getClasses: jest.fn(() => mockDataStore.classes),
    addClass: jest.fn((classInfo) => {
        // Basic mock logic: add if not exists, return save status
        const exists = mockDataStore.classes.find(c => c.name === classInfo.name);
        if (exists) return false;
        mockDataStore.classes = [...mockDataStore.classes, classInfo]; // Use setter
        return mockPersistenceService.save('cooking-classes', mockDataStore.classes);
    }),
    updateClass: jest.fn((oldName, updatedInfo) => {
        // Basic mock logic: update if exists, return save status
        const index = mockDataStore.classes.findIndex(c => c.name === oldName);
        if (index === -1) return false;
        const newClasses = [...mockDataStore.classes];
        newClasses[index] = updatedInfo;
        mockDataStore.classes = newClasses; // Use setter
        // Assume schedule update happens if name changes (simplified)
        let scheduleSaveStatus = true;
        if (oldName !== updatedInfo.name) {
             scheduleSaveStatus = mockPersistenceService.save('cooking-class-schedule', mockDataStore.scheduleWeeks);
        }
        const classSaveStatus = mockPersistenceService.save('cooking-classes', mockDataStore.classes);
        return scheduleSaveStatus && classSaveStatus;
    }),
    deleteClass: jest.fn((className) => {
        // Basic mock logic: remove if exists and not scheduled, return save status
        const isScheduled = Object.values(mockDataStore.scheduleWeeks).some(w => 
            w && Object.values(w).some(d => d && Object.values(d).includes(className))
        );
        if (isScheduled) return false;
        const initialLength = mockDataStore.classes.length;
        const newClasses = mockDataStore.classes.filter(c => c.name !== className);
        if (newClasses.length === initialLength) return false;
        mockDataStore.classes = newClasses; // Use setter
        return mockPersistenceService.save('cooking-classes', mockDataStore.classes);
    }),
    isClassScheduled: jest.fn((className) => {
        // Basic mock logic based on mockDataStore state
         return Object.values(mockDataStore.scheduleWeeks).some(w => 
            w && Object.values(w).some(d => d && Object.values(d).includes(className))
        );
    }),
    loadClassesFromCSV: jest.fn().mockResolvedValue([]), // Mock CSV load if needed
    loadClassesFromLocalStorage: jest.fn(() => { // Mock direct load
        const data = mockPersistenceService.load('cooking-classes');
        if (data) mockDataStore.classes = data;
        return !!data;
    }),
    // Add missing mock method needed by tests
    getClassByName: jest.fn(),
});

// --- Mock ScheduleRepository ---
// Now accepts classRepository as well
export const createMockScheduleRepository = (mockDataStore, mockPersistenceService, mockClassRepository) => ({
    dataStore: mockDataStore,
    persistenceService: mockPersistenceService,
    classRepository: mockClassRepository, // Assign ClassRepository
    dateUtils: DateUtils, // Assign real DateUtils
    getSchedule: jest.fn(() => mockDataStore.scheduleWeeks[mockDataStore.currentWeekOffset] || {}), // Add basic mock for getSchedule
    getCurrentWeekSchedule: jest.fn(() => mockDataStore.scheduleWeeks[mockDataStore.currentWeekOffset] || {}), // Add basic mock
    getCurrentWeekDates: jest.fn().mockReturnValue([]), // Add basic mock
    getUnscheduledClasses: jest.fn().mockReturnValue([]), // Add basic mock
    scheduleClass: jest.fn(),
    unscheduleClass: jest.fn(),
    hasConflict: jest.fn().mockReturnValue(false), // Default to no conflict
    changeWeek: jest.fn().mockReturnValue({}), // Default to empty schedule object
    resetCurrentWeekSchedule: jest.fn(),
    resetAllSchedules: jest.fn(),
    getAllScheduledClassNames: jest.fn().mockReturnValue(new Set()), // Default to empty set
    getCurrentWeekScheduledClasses: jest.fn().mockReturnValue([]), // Default to empty array
    // Make toggle modify the mockDataStore state
    toggleTeacherUnavailability: jest.fn((dateStr, period) => {
        const offset = mockDataStore.currentWeekOffset;
        const currentUnav = { ...mockDataStore._state.teacherUnavailability }; // Use internal state
        if (!currentUnav[offset]) currentUnav[offset] = {};
        if (!currentUnav[offset][dateStr]) currentUnav[offset][dateStr] = {};
        const currentVal = !!currentUnav[offset][dateStr]?.[period];
        currentUnav[offset][dateStr][period] = !currentVal;
        mockDataStore.teacherUnavailability = currentUnav; // Use setter to update store
        return !currentVal; // Return the new state
    }),
     // Make isTeacherUnavailable read from mockDataStore state
    isTeacherUnavailable: jest.fn((dateStr, period) => {
        const offset = mockDataStore.currentWeekOffset;
        // Read directly from internal state for the mock check
        return !!mockDataStore._state.teacherUnavailability[offset]?.[dateStr]?.[period];
    }),
    loadScheduleState: jest.fn(), // Used when loading a saved schedule
    getCurrentWeekScheduleData: jest.fn().mockReturnValue({}), // Used when saving schedule
    getCurrentTeacherUnavailability: jest.fn().mockReturnValue({}), // Used when saving schedule
    getStartDate: jest.fn().mockReturnValue(new Date()), // Used when saving schedule
});

// --- Mock ConfigManager ---
export const createMockConfigManager = (mockDataStore, mockPersistenceService) => {
    // Define the mock object first so its methods can reference each other
    const mock = {
        dataStore: mockDataStore,
        persistenceService: mockPersistenceService,
        getConfig: jest.fn(() => mockDataStore.config),
        updateConfig: jest.fn((newConfig) => {
            // Mimic DataStore's merge behavior
            mockDataStore.config = newConfig; // Call mock setter
            // Call the saveConfig mock on this object
            mock.saveConfig();
        }),
        loadConfig: jest.fn(() => {
            const data = mockPersistenceService.load('cooking-class-config');
            if (data) {
                mockDataStore.config = data; // Call mock setter
            }
        }),
        saveConfig: jest.fn(() => {
            mockPersistenceService.save('cooking-class-config', mockDataStore.config);
        }),
    };
    return mock;
};
// Removed duplicated/erroneous lines from previous attempt

// --- Mock SavedStateRepository ---
export const createMockSavedStateRepository = (mockDataStore, mockPersistenceService) => {
    const repo = {
        dataStore: mockDataStore,
        persistenceService: mockPersistenceService,
        // Schedule methods
        loadSavedSchedulesFromLocalStorage: jest.fn(() => {
            const data = mockPersistenceService.load('cooking-saved-schedules');
            if (data) {
                // Simulate migration logic for the mock
                let migrated = false;
                data.forEach(schedule => {
                    if (!schedule.startDate && schedule.scheduleData) {
                         const firstWeekOffset = Object.keys(schedule.scheduleData).sort()[0];
                         if (firstWeekOffset) {
                             const firstWeekDates = Object.keys(schedule.scheduleData[firstWeekOffset]).sort();
                             if (firstWeekDates.length > 0) {
                                 // Use real date utils for consistency in mock
                                 const [year, month, day] = firstWeekDates[0].split('-').map(num => parseInt(num, 10));
                                 const firstDate = new Date(Date.UTC(year, month - 1, day));
                                 const monday = DateUtils.getMondayOfWeek(firstDate); // Use imported DateUtils
                                 schedule.startDate = DateUtils.getFormattedDate(monday); // Use imported DateUtils
                                 migrated = true;
                             }
                         }
                    }
                });
                mockDataStore.savedSchedules = data; // Update store
                if (migrated) {
                    repo.saveSavedSchedulesToLocalStorage(); // Call mock save if migration happened
                }
            } else {
                 mockDataStore.savedSchedules = [];
            }
        }),
        saveSavedSchedulesToLocalStorage: jest.fn(() => {
            return mockPersistenceService.save('cooking-saved-schedules', mockDataStore.savedSchedules);
        }),
        addSavedSchedule: jest.fn((schedule) => {
             mockDataStore.savedSchedules = [...mockDataStore.savedSchedules, schedule];
             return repo.saveSavedSchedulesToLocalStorage(); // Call mock save
        }),
        updateSavedSchedule: jest.fn((id, updates) => {
             const index = mockDataStore.savedSchedules.findIndex(s => s.id === id);
             if (index === -1) return false;
             const newSchedules = [...mockDataStore.savedSchedules];
             newSchedules[index] = { ...newSchedules[index], ...updates, lastModified: 'mock-date' };
             mockDataStore.savedSchedules = newSchedules;
             return repo.saveSavedSchedulesToLocalStorage(); // Call mock save
        }),
        deleteSavedSchedule: jest.fn((id) => {
              const initialLength = mockDataStore.savedSchedules.length;
              const newSchedules = mockDataStore.savedSchedules.filter(s => s.id !== id);
              if (newSchedules.length === initialLength) return false;
              mockDataStore.savedSchedules = newSchedules;
              return repo.saveSavedSchedulesToLocalStorage(); // Call mock save
        }),
        getSavedScheduleById: jest.fn((id) => mockDataStore.savedSchedules.find(s => s.id === id)),
        // Class Collection methods
        loadSavedClassCollectionsFromLocalStorage: jest.fn(() => {
            const data = mockPersistenceService.load('cooking-saved-class-collections');
            if (data) {
                 mockDataStore.savedClassCollections = data;
            } else {
                 mockDataStore.savedClassCollections = [];
            }
        }),
        saveSavedClassCollectionsToLocalStorage: jest.fn(() => {
            return mockPersistenceService.save('cooking-saved-class-collections', mockDataStore.savedClassCollections);
        }),
        addSavedClassCollection: jest.fn((collection) => {
             mockDataStore.savedClassCollections = [...mockDataStore.savedClassCollections, collection];
             return repo.saveSavedClassCollectionsToLocalStorage(); // Call mock save
        }),
        updateSavedClassCollection: jest.fn((id, updates) => {
             const index = mockDataStore.savedClassCollections.findIndex(c => c.id === id);
             if (index === -1) return false;
             const newCollections = [...mockDataStore.savedClassCollections];
             newCollections[index] = { ...newCollections[index], ...updates, lastModified: 'mock-date' };
             mockDataStore.savedClassCollections = newCollections;
             return repo.saveSavedClassCollectionsToLocalStorage(); // Call mock save
        }),
        deleteSavedClassCollection: jest.fn((id) => {
              const initialLength = mockDataStore.savedClassCollections.length;
              const newCollections = mockDataStore.savedClassCollections.filter(c => c.id !== id);
              if (newCollections.length === initialLength) return false;
              mockDataStore.savedClassCollections = newCollections;
              return repo.saveSavedClassCollectionsToLocalStorage(); // Call mock save
        }),
        getSavedClassCollectionById: jest.fn((id) => mockDataStore.savedClassCollections.find(c => c.id === id)),
    };
    return repo;
};


// --- Mock DataManager Facade ---
// This now primarily mocks the remaining DataManager methods and holds mock dependencies.
// It doesn't need its own complex state logic anymore.
export const createMockDataManager = (
    mockDataStoreInstance = createMockDataStore(),
    mockPersistenceServiceInstance = createMockPersistenceService(),
    mockClassRepositoryInstance = createMockClassRepository(mockDataStoreInstance, mockPersistenceServiceInstance),
    // Add ConfigManager dependency
    mockConfigManagerInstance = createMockConfigManager(mockDataStoreInstance, mockPersistenceServiceInstance)
) => {
    const mockDataManager = {
        // Inject mock dependencies
        dataStore: mockDataStoreInstance,
        persistenceService: mockPersistenceServiceInstance,
        classRepository: mockClassRepositoryInstance,
        configManager: mockConfigManagerInstance, // Add ConfigManager instance
        scheduler: { // Basic mock scheduler if needed by DataManager methods
            findInvalidPlacementsWithNewConstraints: jest.fn().mockReturnValue([]),
        },

        // --- Mocked Facade Methods ---
        // Persistence related (delegated or direct)
        _loadAllFromPersistence: jest.fn(), // Can be spied on
        // loadConfigFromLocalStorage: jest.fn(() => { ... }), // REMOVED - Handled by ConfigManager
        loadSavedSchedulesFromLocalStorage: jest.fn(() => {
             const data = mockPersistenceServiceInstance.load('cooking-saved-schedules');
             if (data) mockDataStoreInstance.savedSchedules = data;
        }),
         loadSavedClassCollectionsFromLocalStorage: jest.fn(() => {
             const data = mockPersistenceServiceInstance.load('cooking-saved-class-collections');
             if (data) mockDataStoreInstance.savedClassCollections = data;
        }),
        // saveConfigToLocalStorage: jest.fn(() => ...), // REMOVED - Handled by ConfigManager
        saveSavedSchedulesToLocalStorage: jest.fn(() => mockPersistenceServiceInstance.save('cooking-saved-schedules', mockDataStoreInstance.savedSchedules)),
        saveSavedClassCollectionsToLocalStorage: jest.fn(() => mockPersistenceServiceInstance.save('cooking-saved-class-collections', mockDataStoreInstance.savedClassCollections)),

        // Date/Week Management (mostly interact with DataStore)
        setStartDate: jest.fn((date) => { 
            // Mock the behavior: sets start date and offset in store
            mockDataStoreInstance.scheduleStartDate = date; // Setter handles finding Monday
            mockDataStoreInstance.currentWeekOffset = 0;
            // Mock doesn't need to call initializeEmptyWeek internally for tests unless testing that side effect
        }),
        initializeEmptyWeek: jest.fn((offset) => {
            // Basic mock: ensure week exists in store, return empty schedule object
             if (!mockDataStoreInstance.scheduleWeeks[offset]) {
                 const newWeeks = { ...mockDataStoreInstance.scheduleWeeks, [offset]: {} };
                 mockDataStoreInstance.scheduleWeeks = newWeeks; // Use setter
             }
              if (!mockDataStoreInstance.teacherUnavailability[offset]) {
                 const newUnav = { ...mockDataStoreInstance.teacherUnavailability, [offset]: {} };
                 mockDataStoreInstance.teacherUnavailability = newUnav; // Use setter
             }
             return mockDataStoreInstance.scheduleWeeks[offset];
        }),
        getCurrentWeekSchedule: jest.fn(() => {
            const offset = mockDataStoreInstance.currentWeekOffset;
             if (!mockDataStoreInstance.scheduleWeeks[offset]) {
                 mockDataManager.initializeEmptyWeek(offset); // Call the mock init
             }
            return mockDataStoreInstance.scheduleWeeks[offset];
        }),
        getCurrentWeekDates: jest.fn(() => []), // Simple mock, use real date-utils if needed
        changeWeek: jest.fn((direction) => {
            mockDataStoreInstance.currentWeekOffset += direction; // Use setter
            return mockDataManager.getCurrentWeekSchedule(); // Call mock getter
        }),

        // Schedule Access/Modification (interact with DataStore)
        getSchedule: jest.fn(() => mockDataManager.getCurrentWeekSchedule()),
        scheduleClass: jest.fn((className, dateStr, period) => {
            const schedule = mockDataManager.getCurrentWeekSchedule();
            if (schedule && schedule[dateStr]) {
                schedule[dateStr][period] = className;
            }
        }),
        unscheduleClass: jest.fn((dateStr, period) => {
             const schedule = mockDataManager.getCurrentWeekSchedule();
            if (schedule && schedule[dateStr]) {
                schedule[dateStr][period] = null;
            }
        }),
        resetSchedule: jest.fn(() => {
             const offset = mockDataStoreInstance.currentWeekOffset;
             mockDataManager.initializeEmptyWeek(offset); // Re-init
             // No save mock needed unless testing persistence side effect
        }),
        resetAllSchedules: jest.fn(() => {
            mockDataStoreInstance.scheduleWeeks = { 0: {} }; // Reset via setter
            mockDataStoreInstance.teacherUnavailability = { 0: {} }; // Reset via setter
            mockDataStoreInstance.currentWeekOffset = 0; // Reset via setter
            // Don't reset start date in mock unless specifically needed for a test
            mockDataManager.initializeEmptyWeek(0);
        }),
        getUnscheduledClasses: jest.fn(() => {
            // Mock logic using mock repo and mock store
            const scheduled = new Set();
             Object.values(mockDataStoreInstance.scheduleWeeks).forEach(w => 
                 w && Object.values(w).forEach(d => 
                     d && Object.values(d).forEach(c => { if(c) scheduled.add(c); })
                 )
             );
             return mockClassRepositoryInstance.getClasses().filter(cls => !scheduled.has(cls.name));
        }),
        getCurrentWeekScheduledClasses: jest.fn(() => {
             // Mock logic using mock store
             const scheduled = new Set();
             const schedule = mockDataManager.getCurrentWeekSchedule();
             if (schedule) {
                  Object.values(schedule).forEach(d => 
                     d && Object.values(d).forEach(c => { if(c) scheduled.add(c); })
                 );
             }
             return Array.from(scheduled);
        }),

        // Conflict/Availability (interact with repo/store)
        hasConflict: jest.fn((className, dateStr, period) => {
            // Simplified mock logic
            const classInfo = mockClassRepositoryInstance.getClasses().find(c => c.name === className);
            if (!classInfo) return false;
            // Basic check - doesn't need real date logic unless testing date edge cases
            if (mockDataManager.isTeacherUnavailable(dateStr, period)) return true; 
            return false; 
        }),
        isTeacherUnavailable: jest.fn((dateStr, period) => {
            // Basic mock logic using store state
            const offset = mockDataStoreInstance.currentWeekOffset;
            return !!mockDataStoreInstance.teacherUnavailability[offset]?.[dateStr]?.[period];
        }),
        toggleTeacherUnavailability: jest.fn((dateStr, period) => {
            // Basic mock logic using store state
            const offset = mockDataStoreInstance.currentWeekOffset;
            const currentUnav = { ...mockDataStoreInstance.teacherUnavailability };
            if (!currentUnav[offset]) currentUnav[offset] = {};
            if (!currentUnav[offset][dateStr]) currentUnav[offset][dateStr] = {};
            const currentVal = !!currentUnav[offset][dateStr][period];
            currentUnav[offset][dateStr][period] = !currentVal;
            mockDataStoreInstance.teacherUnavailability = currentUnav; // Use setter
            return !currentVal;
        }),

        // Config Management methods are now removed as they should be accessed via configManager
        // getConfig: jest.fn(() => mockDataStoreInstance.config), // REMOVED
        // updateConfig: jest.fn((newConfig) => { ... }), // REMOVED
        
        validateExistingScheduleAgainstConstraints: jest.fn(), // Can be spied on - Uses getConfig internally, ensure mockDataManager.configManager is used if needed
        
        // Add back mocks needed by ui-interactions tests temporarily
        getScheduledClassCount: jest.fn().mockReturnValue(0), // Default mock
        getTotalClassCount: jest.fn().mockReturnValue(0), // Default mock

        // Saved Schedules (interact with store/persistence)
        addSavedSchedule: jest.fn((schedule) => {
             mockDataStoreInstance.savedSchedules = [...mockDataStoreInstance.savedSchedules, schedule];
             return mockDataManager.saveSavedSchedulesToLocalStorage();
        }),
         updateSavedSchedule: jest.fn((id, updates) => {
             const index = mockDataStoreInstance.savedSchedules.findIndex(s => s.id === id);
             if (index === -1) return false;
             const newSchedules = [...mockDataStoreInstance.savedSchedules];
             newSchedules[index] = { ...newSchedules[index], ...updates, lastModified: 'mock-date' };
             mockDataStoreInstance.savedSchedules = newSchedules;
             return mockDataManager.saveSavedSchedulesToLocalStorage();
         }),
         deleteSavedSchedule: jest.fn((id) => {
              const initialLength = mockDataStoreInstance.savedSchedules.length;
              const newSchedules = mockDataStoreInstance.savedSchedules.filter(s => s.id !== id);
              if (newSchedules.length === initialLength) return false;
              mockDataStoreInstance.savedSchedules = newSchedules;
              return mockDataManager.saveSavedSchedulesToLocalStorage();
         }),
         getSavedScheduleById: jest.fn((id) => mockDataStoreInstance.savedSchedules.find(s => s.id === id)),

        // Saved Class Collections (interact with store/persistence)
         addSavedClassCollection: jest.fn((collection) => {
             mockDataStoreInstance.savedClassCollections = [...mockDataStoreInstance.savedClassCollections, collection];
             return mockDataManager.saveSavedClassCollectionsToLocalStorage();
         }),
         updateSavedClassCollection: jest.fn((id, updates) => {
             const index = mockDataStoreInstance.savedClassCollections.findIndex(c => c.id === id);
             if (index === -1) return false;
             const newCollections = [...mockDataStoreInstance.savedClassCollections];
             newCollections[index] = { ...newCollections[index], ...updates, lastModified: 'mock-date' };
             mockDataStoreInstance.savedClassCollections = newCollections;
             return mockDataManager.saveSavedClassCollectionsToLocalStorage();
         }),
         deleteSavedClassCollection: jest.fn((id) => {
             const initialLength = mockDataStoreInstance.savedClassCollections.length;
             const newCollections = mockDataStoreInstance.savedClassCollections.filter(c => c.id !== id);
             if (newCollections.length === initialLength) return false;
             mockDataStoreInstance.savedClassCollections = newCollections;
             return mockDataManager.saveSavedClassCollectionsToLocalStorage();
         }),
         getSavedClassCollectionById: jest.fn((id) => mockDataStoreInstance.savedClassCollections.find(c => c.id === id)),

        // Error Handling
        showErrorMessage: jest.fn(), // Simple mock
        
        // Add missing methods needed by ui-interactions tests
        getScheduledClassCount: jest.fn().mockReturnValue(0), // Default mock
        getTotalClassCount: jest.fn().mockReturnValue(0), // Default mock
        // isTeacherUnavailable is already mocked above (line 309)
    };

    return mockDataManager;
};


// --- Mock Scheduler ---
// Simplified mock for basic interactions needed by DataManager tests
export const createMockScheduler = (dataManager) => {
  return {
    dataManager, // Provide reference back if needed
    isValidPlacement: jest.fn().mockReturnValue({ valid: true, reason: null }), // Assume valid by default
    checkConstraints: jest.fn().mockReturnValue({ valid: true, violations: [] }), // Assume valid by default
    validateConstraintCombination: jest.fn().mockReturnValue({ valid: true, reason: null }),
    simulateConstraintChanges: jest.fn().mockResolvedValue({ // Mock async function
        valid: true, 
        invalidPlacements: [], 
        impactedClasses: [], 
        suggestedChanges: [] 
    }),
    suggestNextClass: jest.fn().mockReturnValue(null), // Default to no suggestion
    generateScheduleSuggestions: jest.fn().mockResolvedValue({ // Mock async function
        valid: true, 
        schedule: {}, 
        unscheduledClasses: [] 
    }),
     findInvalidPlacementsWithNewConstraints: jest.fn().mockReturnValue([]), // Added for validation call
  };
};

// --- Other Test Helpers ---

// Event simulation helpers (Keep as they are useful for UI tests)
export const simulateDragStart = (element) => {
  // Basic simulation, might need jsdom or similar for full DataTransfer mock
  const event = new Event('dragstart', { bubbles: true, cancelable: true });
  // More realistic dataTransfer mock
  const dtStore = {};
  event.dataTransfer = {
      setData: jest.fn((format, data) => { dtStore[format] = data; }),
      getData: jest.fn((format) => dtStore[format]),
      effectAllowed: '',
      dropEffect: ''
  };
  if(element.dataset.className) {
      // This now uses the improved mock setData
      event.dataTransfer.setData('text/plain', element.dataset.className);
  }
  element.dispatchEvent(event);
  element.classList.add('dragging');
  return event;
};

export const simulateDrop = (element, data = {}) => {
  const event = new Event('drop', { bubbles: true, cancelable: true });
   event.dataTransfer = { 
       setData: jest.fn(), 
       getData: jest.fn((format) => data[format]), // Mock getData based on input
       effectAllowed: '', 
       dropEffect: '' 
   }; 
  element.dispatchEvent(event);
  return event;
};

// DOM Events helper
export const createEvent = (type, options = {}) => {
  return new Event(type, { bubbles: true, cancelable: true, ...options });
};

// Async test helper (Keep as is)
export const waitFor = (callback, { timeout = 1000, interval = 50 } = {}) => {
  // jest.useFakeTimers(); // Be cautious using fake timers globally
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const check = () => {
      try {
        const result = callback();
        // If callback returns a truthy value or doesn't throw, resolve
        if (result) { 
             resolve(result);
        } else if (Date.now() - startTime > timeout) {
             reject(new Error('Timed out waiting for condition, but callback returned falsy value.'));
        } else {
             setTimeout(check, interval); // Use real setTimeout
        }
      } catch (err) {
        if (Date.now() - startTime > timeout) {
          reject(new Error(`Timed out waiting for condition: ${err.message}`));
        } else {
          setTimeout(check, interval); // Use real setTimeout
        }
      }
    };
    check();
  });
};