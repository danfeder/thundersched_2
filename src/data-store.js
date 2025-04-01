// DataStore Class for managing in-memory application state

import { getNextMonday, getMondayOfWeek } from './date-utils.js';

export class DataStore {
    constructor() {
        // --- Core Data ---
        this._classes = [];
        this._scheduleWeeks = {}; // { [weekOffset]: { [dateStr]: { [period]: className | null } } }
        this._teacherUnavailability = {}; // { [weekOffset]: { [dateStr]: { [period]: boolean } } }
        
        // --- Schedule Navigation ---
        // Initialize scheduleStartDate to the *next* Monday relative to when the store is created.
        this._scheduleStartDate = getNextMonday(); 
        this._currentWeekOffset = 0;

        // --- Configuration ---
        this._config = {
            maxConsecutiveClasses: 2,
            maxClassesPerDay: 4,
            minClassesPerWeek: 12,
            maxClassesPerWeek: 16
        };

        // --- Saved States ---
        this._savedSchedules = [];
        this._savedClassCollections = [];

        console.log("DataStore initialized with start date:", this._scheduleStartDate.toISOString());
        // Ensure week 0 is initialized at creation
        this._initializeEmptyWeek(0); 
    }

    // --- Getters ---
    get classes() { return this._classes; }
    get scheduleWeeks() { return this._scheduleWeeks; }
    get teacherUnavailability() { return this._teacherUnavailability; }
    get scheduleStartDate() { return this._scheduleStartDate; }
    get currentWeekOffset() { return this._currentWeekOffset; }
    get config() { return this._config; }
    get savedSchedules() { return this._savedSchedules; }
    get savedClassCollections() { return this._savedClassCollections; }

    // --- Setters ---
    // Note: Using setters allows potential future logic like validation or change events.
    set classes(newClasses) { 
        if (!Array.isArray(newClasses)) {
            console.error("DataStore: Attempted to set classes with non-array value:", newClasses);
            return;
        }
        this._classes = newClasses;
    }
    set scheduleWeeks(newScheduleWeeks) {
         if (typeof newScheduleWeeks !== 'object' || newScheduleWeeks === null) {
            console.error("DataStore: Attempted to set scheduleWeeks with non-object value:", newScheduleWeeks);
            return;
        }
        this._scheduleWeeks = newScheduleWeeks;
    }
    set teacherUnavailability(newUnavailability) {
         if (typeof newUnavailability !== 'object' || newUnavailability === null) {
            console.error("DataStore: Attempted to set teacherUnavailability with non-object value:", newUnavailability);
            return;
        }
        this._teacherUnavailability = newUnavailability;
    }
    set scheduleStartDate(newStartDate) {
        if (!(newStartDate instanceof Date) || isNaN(newStartDate)) {
             console.error("DataStore: Attempted to set invalid scheduleStartDate:", newStartDate);
            return;
        }
        // Ensure it's always set to the Monday of the given week
        const monday = getMondayOfWeek(newStartDate);
        this._scheduleStartDate = monday;
        console.log("DataStore: scheduleStartDate updated to:", this._scheduleStartDate.toISOString());
    }
    set currentWeekOffset(newOffset) {
        if (typeof newOffset !== 'number' || !Number.isInteger(newOffset)) {
             console.error("DataStore: Attempted to set invalid currentWeekOffset:", newOffset);
            return;
        }
        this._currentWeekOffset = newOffset;
        // Ensure the week exists when offset changes
        this._initializeEmptyWeek(newOffset);
    }
    set config(newConfig) {
        if (typeof newConfig !== 'object' || newConfig === null) {
            console.error("DataStore: Attempted to set config with non-object value:", newConfig);
            return;
        }
        // Merge partial updates with existing config
        this._config = { ...this._config, ...newConfig };
    }
    set savedSchedules(newSavedSchedules) { 
        if (!Array.isArray(newSavedSchedules)) {
            console.error("DataStore: Attempted to set savedSchedules with non-array value:", newSavedSchedules);
            return;
        }
        this._savedSchedules = newSavedSchedules; 
    }
    set savedClassCollections(newCollections) { 
        if (!Array.isArray(newCollections)) {
            console.error("DataStore: Attempted to set savedClassCollections with non-array value:", newCollections);
            return;
        }
        this._savedClassCollections = newCollections; 
    }

    // --- Internal Helper ---
    // Simplified version for internal use within the store, doesn't need external imports
    _initializeEmptyWeek(offset) {
        if (!this._scheduleWeeks[offset]) {
            this._scheduleWeeks[offset] = {};
            // Need date functions here - this highlights dependency issue, 
            // better to have DataManager call this or pass functions in.
            // For now, let's assume DataManager handles initialization logic externally
            // or we duplicate basic date logic (less ideal).
            // Let's leave it empty for now and let DataManager handle it.
             console.log(`DataStore: Placeholder for initializing week ${offset}. DataManager should handle population.`);
        }
         if (!this._teacherUnavailability[offset]) {
            this._teacherUnavailability[offset] = {};
            // Similar dependency issue for initializing dates here.
             console.log(`DataStore: Placeholder for initializing teacher unavailability for week ${offset}.`);
        }
    }
}