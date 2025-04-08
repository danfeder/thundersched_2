// Data handling for the scheduler
import { getFormattedDate, getMondayOfWeek, getWeekDates, getNextMonday, getDayFromDate } from './date-utils.js'; // Keep needed date utils
import { parseCSVData } from './csv-parser.js';
import { PersistenceService } from './persistence-service.js';
import { DataStore } from './data-store.js';
import { ClassRepository } from './repositories/class-repository.js';
import { ScheduleRepository } from './repositories/schedule-repository.js';
import { ConfigManager } from './repositories/config-manager.js'; // Import ConfigManager
import { SavedStateRepository } from './repositories/saved-state-repository.js';

export class DataManager {
    constructor(scheduler) {
        this.scheduler = scheduler; // Still needed for validation logic? Re-evaluate later.
        this.dataStore = new DataStore();
        this.persistenceService = new PersistenceService(this.showErrorMessage.bind(this));
        
        // Instantiate repositories, passing dependencies
        this.classRepository = new ClassRepository(this.dataStore, this.persistenceService);
        // Instantiate ScheduleRepository (DateUtils are imported at module level)
        this.scheduleRepository = new ScheduleRepository(this.dataStore, this.persistenceService, this.classRepository);

        // Instantiate ConfigManager
        this.configManager = new ConfigManager(this.dataStore, this.persistenceService);
        // Instantiate SavedStateRepository
        this.savedStateRepository = new SavedStateRepository(this.dataStore, this.persistenceService);

        // Load initial state from persistence into the store
        this._loadAllFromPersistence();

        // Initialization of week 0 is now handled within ScheduleRepository constructor/DataStore access

        // Delayed validation of existing schedule against constraints
        setTimeout(() => this.validateExistingScheduleAgainstConstraints(), 1000);
    }

    // --- Internal Load/Save ---
    _loadAllFromPersistence() {
        // Delegate class loading to the repository
        this.classRepository.loadClassesFromLocalStorage();
        // Delegate config loading
        this.configManager.loadConfig();
        // Delegate saved state loading
        if (this.savedStateRepository) {
            this.savedStateRepository.loadSavedSchedulesFromLocalStorage();
            this.savedStateRepository.loadSavedClassCollectionsFromLocalStorage();
        } else {
             console.error("DataManager: SavedStateRepository not initialized during _loadAllFromPersistence call.");
        }
        // Note: Teacher unavailability is not persisted
    }

    // --- Persistence Wrappers ---
    // loadClassesFromLocalStorage is now handled by ClassRepository constructor/method
    
    loadConfigFromLocalStorage() {
        // Delegate to ConfigManager
        if (this.configManager) {
            this.configManager.loadConfig();
        } else {
            console.error("DataManager: ConfigManager not initialized during loadConfigFromLocalStorage call.");
        }
    }

    // loadSavedSchedulesFromLocalStorage moved to SavedStateRepository
    // loadSavedClassCollectionsFromLocalStorage moved to SavedStateRepository

    saveConfigToLocalStorage() {
        // Delegate to ConfigManager
        if (this.configManager) {
            return this.configManager.saveConfig();
        } else {
            console.error("DataManager: ConfigManager not initialized during saveConfigToLocalStorage call.");
            return false; // Indicate failure
        }
    }

    // saveSavedSchedulesToLocalStorage moved to SavedStateRepository
    // saveSavedClassCollectionsToLocalStorage moved to SavedStateRepository

    // --- Methods related to Schedule/Week/Teacher Unavailability moved to ScheduleRepository ---
    // setStartDate, initializeEmptyWeek, getCurrentWeekSchedule, getCurrentWeekDates,
    // changeWeek, getSchedule, scheduleClass, unscheduleClass, resetSchedule,
    // resetAllSchedules, getUnscheduledClasses, getCurrentWeekScheduledClasses,
    // hasConflict, isTeacherUnavailable, toggleTeacherUnavailability
 
    // --- Config Management (Delegated) ---
    getConfig() {
        // Delegate to ConfigManager
        if (this.configManager) {
            return this.configManager.getConfig();
        } else {
             console.error("DataManager: ConfigManager not initialized during getConfig call.");
             // Return default or empty object to prevent downstream errors? Or throw?
             // Returning default for now.
             return { maxConsecutiveClasses: 2, maxClassesPerDay: 4, minClassesPerWeek: 12, maxClassesPerWeek: 16 };
        }
    }
    
    updateConfig(newConfig) {
        // Delegate to ConfigManager
        if (this.configManager) {
            return this.configManager.updateConfig(newConfig);
        } else {
             console.error("DataManager: ConfigManager not initialized during updateConfig call.");
             return this.getConfig(); // Return current (likely default) config
        }
    }
    
    validateExistingScheduleAgainstConstraints() {
        if (Object.keys(this.dataStore.scheduleWeeks).length > 0 && this.scheduler) {
            const invalidPlacements = this.scheduler.findInvalidPlacementsWithNewConstraints(this.getConfig()); // Use getter
            if (invalidPlacements.length > 0) {
                console.warn(`Found ${invalidPlacements.length} placement(s) that violate current constraints`);
            }
        }
    }
    
    // --- Saved Schedules Management (moved to SavedStateRepository) ---
    // addSavedSchedule moved
    // updateSavedSchedule moved
    // deleteSavedSchedule moved
    // getSavedScheduleById moved

    // TODO: Refactor - Move orchestration logic to SaveLoadController and use SavedStateRepository
    // Re-added saveSchedule - delegates to SavedStateRepository
    saveSchedule(name, notes) {
        if (!this.scheduleRepository || !this.savedStateRepository) {
            console.error("Repositories not initialized for saveSchedule");
            return false;
        }
        try {
            // Gather current state from ScheduleRepository
            const scheduleData = this.scheduleRepository.getCurrentWeekScheduleData(); // Assumes method exists
            const teacherUnavailability = this.scheduleRepository.getCurrentTeacherUnavailability(); // Assumes method exists
            const startDate = this.scheduleRepository.getStartDate(); // Assumes method exists

            const scheduleToSave = {
                id: `sched_${Date.now()}`, // Generate ID
                name: name,
                notes: notes,
                createdAt: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                startDate: getFormattedDate(startDate),
                scheduleData: scheduleData,
                teacherUnavailability: teacherUnavailability
            };
            // Delegate the actual saving to the repository's add method
            return this.savedStateRepository.addSavedSchedule(scheduleToSave);
        } catch (error) {
            this.showErrorMessage(`Error saving schedule: ${error.message}`);
            return false;
        }
    }

    // Re-added loadSavedSchedule - delegates to SavedStateRepository and ScheduleRepository
    loadSavedSchedule(name) {
        // Note: The repository checks below are currently commented out because they are null
        // if (!this.scheduleRepository || !this.savedStateRepository) {
        //     console.error("Repositories not initialized for loadSavedSchedule");
        //     return false;
        // }
        // Use getSavedScheduleById from the repository
        const savedSchedule = this.savedStateRepository.getSavedScheduleById(name);
        if (savedSchedule) {
            // Directly update DataStore with loaded data (temporary fix until ScheduleRepository is implemented)
            this.dataStore.scheduleWeeks = savedSchedule.scheduleData || {};
            this.dataStore.teacherUnavailability = savedSchedule.teacherUnavailability || {};
            // Also load config if it exists in the saved data (handle potential old format)
            if (savedSchedule.constraintData) {
                this.dataStore.config = savedSchedule.constraintData;
            }
            // Update start date and offset
            this.dataStore.scheduleStartDate = new Date(savedSchedule.startDate + 'T00:00:00Z'); // Ensure Date object
            this.dataStore.currentWeekOffset = 0; // Reset offset when loading
            return true;
        } else {
            this.showErrorMessage(`Saved schedule "${name}" not found.`);
            return false;
        }
    }
    
    // --- Saved Class Collections Management (moved to SavedStateRepository) ---
    // addSavedClassCollection moved
    // updateSavedClassCollection moved
    // deleteSavedClassCollection moved
    // getSavedClassCollectionById moved

    // --- Error Handling ---
    showErrorMessage(message) {
        // Implementation depends on the application's message system
        // This method is now primarily for being passed to PersistenceService
        if (typeof showMessage === 'function') { // Check if global showMessage exists
            showMessage('error', message);
        } else {
             console.error("Error:", message); // Fallback to console error
        }
    }
}