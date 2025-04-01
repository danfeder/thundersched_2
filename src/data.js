// Data handling for the scheduler
import { getFormattedDate, getMondayOfWeek, getWeekDates, getNextMonday, getDayFromDate } from './date-utils.js'; // Keep needed date utils
import { parseCSVData } from './csv-parser.js';
import { PersistenceService } from './persistence-service.js';
import { DataStore } from './data-store.js';
import { ClassRepository } from './repositories/class-repository.js'; // Import ClassRepository

export class DataManager {
    constructor(scheduler) {
        this.scheduler = scheduler; // Still needed for validation logic? Re-evaluate later.
        this.dataStore = new DataStore();
        this.persistenceService = new PersistenceService(this.showErrorMessage.bind(this));
        
        // Instantiate repositories, passing dependencies
        this.classRepository = new ClassRepository(this.dataStore, this.persistenceService);
        // TODO: Instantiate ScheduleRepository, ConfigManager, SavedStateRepository here
        // In tests, these properties will be overridden with mocks after instantiation.
        this.scheduleRepository = null; // Placeholder for ScheduleRepository instance
        this.configManager = null;      // Placeholder for ConfigManager instance
        this.savedStateRepository = null; // Placeholder for SavedStateRepository instance

        // Load initial state from persistence into the store
        this._loadAllFromPersistence();

        // Ensure week 0 structure is populated if needed by DataManager logic
        // DataStore constructor initializes the keys, but DataManager populates
        this.initializeEmptyWeek(0);

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
        const storedConfig = this.persistenceService.load('cooking-class-config');
        if (storedConfig) {
            this.dataStore.config = storedConfig; // Update store (merges in setter)
            console.log('Loaded configuration from storage:', this.dataStore.config);
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
        this.persistenceService.save('cooking-class-config', this.dataStore.config);
    }

    saveSavedSchedulesToLocalStorage() {
        return this.persistenceService.save('cooking-saved-schedules', this.dataStore.savedSchedules);
    }

    saveSavedClassCollectionsToLocalStorage() {
       return this.persistenceService.save('cooking-saved-class-collections', this.dataStore.savedClassCollections);
    }

    // --- Date/Week Management (using DataStore) ---
    setStartDate(date) {
        this.dataStore.scheduleStartDate = date; // Setter handles finding Monday
        this.dataStore.currentWeekOffset = 0; // Reset offset
        this.initializeEmptyWeek(0); // Ensure week 0 structure exists
    }
    
    initializeEmptyWeek(weekOffset) {
        // Always create a new empty week schedule object.
        // This ensures it acts as a reset when called by resetSchedule.
        // The check for existing week is removed.
        
        const weekSchedule = {};
        const weekDates = getWeekDates(this.dataStore.scheduleStartDate, weekOffset);
        
        weekDates.forEach(date => {
            const dateStr = getFormattedDate(date); 
            weekSchedule[dateStr] = {};
            for (let period = 1; period <= 8; period++) {
                weekSchedule[dateStr][period] = null;
            }
        });
        
        // Update the store directly for schedule
        const currentWeeks = this.dataStore.scheduleWeeks;
        currentWeeks[weekOffset] = weekSchedule;
        this.dataStore.scheduleWeeks = currentWeeks; // Trigger setter if it has side effects

        // Initialize teacher unavailability in the store
        if (!this.dataStore.teacherUnavailability[weekOffset]) {
             const currentUnavailability = this.dataStore.teacherUnavailability;
             currentUnavailability[weekOffset] = {};
             weekDates.forEach(date => {
                 const dateStr = getFormattedDate(date); 
                 currentUnavailability[weekOffset][dateStr] = {};
             });
             this.dataStore.teacherUnavailability = currentUnavailability; // Trigger setter
        }
        
        return weekSchedule;
    }
    
    getCurrentWeekSchedule() {
        const offset = this.dataStore.currentWeekOffset;
        // Ensure the week is initialized before returning
        if (!this.dataStore.scheduleWeeks[offset]) {
            this.initializeEmptyWeek(offset);
        }
        return this.dataStore.scheduleWeeks[offset];
    }

    getCurrentWeekDates() {
        return getWeekDates(this.dataStore.scheduleStartDate, this.dataStore.currentWeekOffset); 
    }
    
    changeWeek(direction) {
        this.dataStore.currentWeekOffset += direction; // Setter handles initialization
        return this.getCurrentWeekSchedule();
    }

    // --- Class Data Loading -> Delegated to ClassRepository ---
    // Removed loadClassesFromCSV - Use classRepository.loadClassesFromCSV() instead

    // --- Class Management -> Delegated to ClassRepository ---
    // Removed getClasses, addClass, updateClass, deleteClass, isClassScheduled
    // Use this.classRepository.getClasses(), this.classRepository.addClass(), etc. instead

    // --- Schedule Access/Modification (using DataStore) ---
    // These might move to a ScheduleRepository later
    getSchedule() { // Gets current week's schedule
        return this.getCurrentWeekSchedule();
    }

    scheduleClass(className, dateStr, period) {
        const currentSchedule = this.getCurrentWeekSchedule(); // Gets schedule from store
        if (currentSchedule && currentSchedule[dateStr]) {
             // Directly modify the object obtained from the store (or clone then set)
             currentSchedule[dateStr][period] = className;
             // No save needed here, assumes save happens elsewhere (e.g., end of operation)
        } else {
            console.error(`Cannot schedule class: Schedule or date ${dateStr} not initialized for current week.`);
        }
    }

    unscheduleClass(dateStr, period) {
        const currentSchedule = this.getCurrentWeekSchedule(); // Gets schedule from store
         if (currentSchedule && currentSchedule[dateStr]) {
            currentSchedule[dateStr][period] = null;
             // No save needed here
        } else {
             console.error(`Cannot unschedule class: Schedule or date ${dateStr} not initialized for current week.`);
        }
    }
    
    
    resetSchedule() { // Resets current week
        const offset = this.dataStore.currentWeekOffset;
        // Re-initialize the specific week in the store
        this.initializeEmptyWeek(offset);
        // Optionally save
        // this.persistenceService.save('cooking-class-schedule', this.dataStore.scheduleWeeks);
    }
    
    resetAllSchedules() {
        // Reset state properties in the store via setters
        this.dataStore.scheduleWeeks = {};
        this.dataStore.teacherUnavailability = {};
        this.dataStore.currentWeekOffset = 0;
        // Optionally reset start date? Let's keep it consistent with constructor for now
        this.dataStore.scheduleStartDate = getNextMonday();
        this.initializeEmptyWeek(0); // Re-initialize week 0 in the store
        // Optionally save
        // this.persistenceService.save('cooking-class-schedule', this.dataStore.scheduleWeeks);
    }

    getUnscheduledClasses() {
        const scheduledClasses = new Set();
        Object.values(this.dataStore.scheduleWeeks).forEach(weekSchedule => {
            if (!weekSchedule) return;
            Object.values(weekSchedule).forEach(daySchedule => {
                 if (!daySchedule) return;
                Object.values(daySchedule).forEach(className => {
                    if (className) scheduledClasses.add(className);
                });
            });
        });
        // Use ClassRepository to get classes
        return this.classRepository.getClasses().filter(classInfo => !scheduledClasses.has(classInfo.name));
    }
    
    
    getCurrentWeekScheduledClasses() {
        const scheduledClasses = new Set();
        const currentWeekSchedule = this.getCurrentWeekSchedule(); // Gets from store
        if (!currentWeekSchedule) return [];
        
        Object.values(currentWeekSchedule).forEach(daySchedule => {
             if (!daySchedule) return;
            Object.values(daySchedule).forEach(className => {
                if (className) scheduledClasses.add(className);
            });
        });
        return Array.from(scheduledClasses);
    }

    // --- Conflict/Availability (using DataStore and ClassRepository) ---
    hasConflict(className, dateStr, period) {
        // Use ClassRepository to get class info
        const classInfo = this.classRepository.getClasses().find(c => c.name === className);
        if (!classInfo) return false;
        
        const [year, month, day] = dateStr.split('-').map(num => parseInt(num, 10));
        const date = new Date(Date.UTC(year, month - 1, day)); 
        const dayOfWeek = getDayFromDate(date); 
        
        if (dayOfWeek === 'Saturday' || dayOfWeek === 'Sunday') return true;
        
        if (classInfo.conflicts[dayOfWeek]?.includes(Number(period))) {
            return true;
        }
        if (this.isTeacherUnavailable(dateStr, period)) { // Uses store via method call
            return true;
        }
        return false;
    }
    

    // --- Conflict/Availability (using DataStore and ClassRepository) ---
    hasConflict(className, dateStr, period) {
        // Use ClassRepository to get class info
        const classInfo = this.classRepository.getClasses().find(c => c.name === className);
        if (!classInfo) return false;
        
        const [year, month, day] = dateStr.split('-').map(num => parseInt(num, 10));
        const date = new Date(Date.UTC(year, month - 1, day));
        const dayOfWeek = getDayFromDate(date);
        
        if (dayOfWeek === 'Saturday' || dayOfWeek === 'Sunday') return true;
        
        if (classInfo.conflicts[dayOfWeek]?.includes(Number(period))) {
            return true;
        }
        if (this.isTeacherUnavailable(dateStr, period)) { // Uses store via method call
            return true;
        }
        return false;
    }
    
    isTeacherUnavailable(dateStr, period) {
        const [year, month, day] = dateStr.split('-').map(num => parseInt(num, 10));
        const date = new Date(Date.UTC(year, month - 1, day));
        
        const monday = getMondayOfWeek(date);
        const startMonday = getMondayOfWeek(this.dataStore.scheduleStartDate); // Use store value
        
        const diffTime = monday.getTime() - startMonday.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        const weekOffset = Math.round(diffDays / 7);
        
        // Access store directly
        return this.dataStore.teacherUnavailability[weekOffset]?.[dateStr]?.[period] === true;
    }
    
    toggleTeacherUnavailability(dateStr, period) {
        const [year, month, day] = dateStr.split('-').map(num => parseInt(num, 10));
        const date = new Date(Date.UTC(year, month - 1, day));
        
        const monday = getMondayOfWeek(date);
        const startMonday = getMondayOfWeek(this.dataStore.scheduleStartDate);
        
        const diffTime = monday.getTime() - startMonday.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        const weekOffset = Math.round(diffDays / 7);
        
        // Get current state from store, modify, and set back
        const currentUnavailability = { ...this.dataStore.teacherUnavailability }; // Clone top level
        if (!currentUnavailability[weekOffset]) {
            currentUnavailability[weekOffset] = {};
        }
        const weekData = currentUnavailability[weekOffset];
        if (!weekData[dateStr]) {
            weekData[dateStr] = {};
        }
        
        const isCurrentlyUnavailable = weekData[dateStr][period] === true;
        weekData[dateStr][period] = !isCurrentlyUnavailable;
        
        this.dataStore.teacherUnavailability = currentUnavailability; // Update store via setter
        
        return !isCurrentlyUnavailable;
    }
    
    // --- Config Management (using DataStore) ---
    getConfig() {
        return this.dataStore.config;
    }
    
    updateConfig(newConfig) {
        this.dataStore.config = newConfig; // Use setter (merges)
        this.saveConfigToLocalStorage(); // Persist change
        return this.dataStore.config;
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