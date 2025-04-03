// Data handling for the scheduler
import { getFormattedDate, getMondayOfWeek, getWeekDates, getNextMonday, getDayFromDate } from './date-utils.js'; // Keep needed date utils
import { parseCSVData } from './csv-parser.js';
import { PersistenceService } from './persistence-service.js';
import { DataStore } from './data-store.js';
import { ClassRepository } from './repositories/class-repository.js';
import { ScheduleRepository } from './repositories/schedule-repository.js';
import { ConfigManager } from './repositories/config-manager.js'; // Import ConfigManager

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
        // TODO: Instantiate SavedStateRepository here
        this.savedStateRepository = null; // Placeholder for SavedStateRepository instance

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
        // Keep other loads for now, assuming they will be delegated later
        this.loadConfigFromLocalStorage();
        this.loadSavedSchedulesFromLocalStorage();
        this.loadSavedClassCollectionsFromLocalStorage();
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

    loadSavedSchedulesFromLocalStorage() {
        const storedSchedules = this.persistenceService.load('cooking-saved-schedules');
        if (storedSchedules) {
            this.dataStore.savedSchedules = storedSchedules; // Update store
            // Migration logic remains here for now, but uses DataStore state
            let migratedSchedules = false;
            this.dataStore.savedSchedules.forEach(schedule => {
                if (!schedule.startDate && schedule.scheduleData) {
                    console.log(`Migrating schedule "${schedule.name}" to add startDate`);
                    migratedSchedules = true;
                    const firstWeekOffset = Object.keys(schedule.scheduleData).sort()[0];
                    if (firstWeekOffset) {
                        const firstWeekDates = Object.keys(schedule.scheduleData[firstWeekOffset]).sort();
                        if (firstWeekDates.length > 0) {
                            const [year, month, day] = firstWeekDates[0].split('-').map(num => parseInt(num, 10));
                            const firstDate = new Date(Date.UTC(year, month - 1, day));
                            const monday = getMondayOfWeek(firstDate);
                            schedule.startDate = getFormattedDate(monday);
                            console.log(`  Inferred startDate: ${schedule.startDate} for schedule "${schedule.name}"`);
                        }
                    }
                }
            });
            if (migratedSchedules) {
                console.log('Saving migrated schedules with added startDates');
                this.saveSavedSchedulesToLocalStorage(); // Call the original save method
            }
            console.log(`Loaded ${this.dataStore.savedSchedules.length} saved schedules from storage`);
        } else {
            console.log('No saved schedules found in storage');
            this.dataStore.savedSchedules = []; // Ensure store is empty array
        }
    }

    // Removed _migrateSavedSchedules helper as it's part of loadSavedSchedulesFromLocalStorage again

    loadSavedClassCollectionsFromLocalStorage() {
        const storedCollections = this.persistenceService.load('cooking-saved-class-collections');
        if (storedCollections) {
            this.dataStore.savedClassCollections = storedCollections; // Update store
            console.log(`Loaded ${this.dataStore.savedClassCollections.length} saved class collections from storage`);
        } else {
            console.log('No saved class collections found in storage');
            this.dataStore.savedClassCollections = []; // Ensure store is empty array
        }
    }

    saveConfigToLocalStorage() {
        // Delegate to ConfigManager
        if (this.configManager) {
            return this.configManager.saveConfig();
        } else {
            console.error("DataManager: ConfigManager not initialized during saveConfigToLocalStorage call.");
            return false; // Indicate failure
        }
    }

    saveSavedSchedulesToLocalStorage() {
        return this.persistenceService.save('cooking-saved-schedules', this.dataStore.savedSchedules);
    }

    saveSavedClassCollectionsToLocalStorage() {
       return this.persistenceService.save('cooking-saved-class-collections', this.dataStore.savedClassCollections);
    }

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
    
    // --- Saved Schedules Management (using DataStore) ---
    addSavedSchedule(schedule) {
        if (!schedule.lastModified) {
            schedule.lastModified = schedule.createdAt;
        }
        // Update store state before saving
        const newSavedSchedules = [...this.dataStore.savedSchedules, schedule];
        this.dataStore.savedSchedules = newSavedSchedules; 
        return this.saveSavedSchedulesToLocalStorage();
    }
    
    updateSavedSchedule(id, updates) {
        const index = this.dataStore.savedSchedules.findIndex(s => s.id === id);
        if (index !== -1) {
            updates.lastModified = new Date().toISOString();
            // Update store state before saving
            const newSavedSchedules = [...this.dataStore.savedSchedules];
            newSavedSchedules[index] = {...newSavedSchedules[index], ...updates};
            this.dataStore.savedSchedules = newSavedSchedules; 
            return this.saveSavedSchedulesToLocalStorage();
        }
        return false;
    }
    
    deleteSavedSchedule(id) {
        const initialLength = this.dataStore.savedSchedules.length;
        const newSavedSchedules = this.dataStore.savedSchedules.filter(s => s.id !== id);
        if (newSavedSchedules.length === initialLength) return false; // Not found

        this.dataStore.savedSchedules = newSavedSchedules; // Update store
        return this.saveSavedSchedulesToLocalStorage();
    }
    
    getSavedScheduleById(id) {
        return this.dataStore.savedSchedules.find(s => s.id === id);
    }

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
            return this.savedStateRepository.saveSchedule(scheduleToSave); // Delegate save
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
        // Use getSavedScheduleById directly for now as repo is null
        const savedSchedule = this.getSavedScheduleById(name);
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
    
    // --- Saved Class Collections Management (Delegated) ---
     addSavedClassCollection(collection) {
        if (!collection.lastModified) {
            collection.lastModified = collection.createdAt || new Date().toISOString(); // Add createdAt if missing
        }
        const newCollections = [...this.dataStore.savedClassCollections, collection];
        this.dataStore.savedClassCollections = newCollections; // Update store
        return this.saveSavedClassCollectionsToLocalStorage(); // Use original save method
    }
    
    
    updateSavedClassCollection(id, updates) {
        const index = this.dataStore.savedClassCollections.findIndex(c => c.id === id);
        if (index !== -1) {
            updates.lastModified = new Date().toISOString();
            const newCollections = [...this.dataStore.savedClassCollections];
            newCollections[index] = {...newCollections[index], ...updates};
            this.dataStore.savedClassCollections = newCollections; // Update store
            return this.saveSavedClassCollectionsToLocalStorage();
        }
        return false;
    }
    
    deleteSavedClassCollection(id) {
         const initialLength = this.dataStore.savedClassCollections.length;
         const newCollections = this.dataStore.savedClassCollections.filter(c => c.id !== id);
         if (newCollections.length === initialLength) return false; // Not found

        this.dataStore.savedClassCollections = newCollections; // Update store
        return this.saveSavedClassCollectionsToLocalStorage();
    }
    
    getSavedClassCollectionById(id) {
        return this.dataStore.savedClassCollections.find(c => c.id === id);
    }

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