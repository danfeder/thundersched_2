import * as DateUtils from '../date-utils.js'; // Assuming DateUtils exports functions directly

export class ScheduleRepository {
    /**
     * @param {import('../data-store.js').DataStore} dataStore
     * @param {import('../persistence-service.js').PersistenceService} persistenceService
     * @param {import('./class-repository.js').ClassRepository} classRepository
     */
    constructor(dataStore, persistenceService, classRepository) {
        if (!dataStore) throw new Error("DataStore is required for ScheduleRepository");
        if (!persistenceService) throw new Error("PersistenceService is required for ScheduleRepository");
        if (!classRepository) throw new Error("ClassRepository is required for ScheduleRepository");

        this.dataStore = dataStore;
        this.persistenceService = persistenceService;
        this.classRepository = classRepository;
        // DateUtils are imported directly as module functions
        this.dateUtils = DateUtils; 

        // Initialize state or ensure it's loaded/handled by DataStore accessors
        // Example: Ensure initial week exists if not handled by DataStore's setter logic
        if (!this.dataStore.scheduleWeeks[this.dataStore.currentWeekOffset]) {
             this._initializeEmptyWeek(this.dataStore.currentWeekOffset);
        }
    }

    // --- Date/Week Management ---
    setStartDate(date) {
        this.dataStore.scheduleStartDate = date; // Setter handles finding Monday
        this.dataStore.currentWeekOffset = 0; // Reset offset
        this.initializeEmptyWeek(0); // Ensure week 0 structure exists
    }
    
    /**
     * Initializes or re-initializes the schedule structure for a given week offset.
     * Ensures the week exists in both scheduleWeeks and teacherUnavailability.
     * @param {number} weekOffset
     * @returns {object} The initialized week schedule object.
     * @private Should this be private? Plan doesn't specify, keeping public for now.
     */
    initializeEmptyWeek(weekOffset) {
        const weekSchedule = {};
        const weekDates = this.dateUtils.getWeekDates(this.dataStore.scheduleStartDate, weekOffset);
        
        weekDates.forEach(date => {
            const dateStr = this.dateUtils.getFormattedDate(date);
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
                 const dateStr = this.dateUtils.getFormattedDate(date);
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
        return this.dateUtils.getWeekDates(this.dataStore.scheduleStartDate, this.dataStore.currentWeekOffset);
    }
    
    changeWeek(direction) {
        // DataStore setter handles initialization via offset change
        this.dataStore.currentWeekOffset += direction;
        return this.getCurrentWeekSchedule();
    }

    // --- Schedule Access/Modification ---
    getSchedule() { // Gets current week's schedule
        return this.getCurrentWeekSchedule();
    }

    scheduleClass(className, dateStr, period) {
        const currentSchedule = this.getCurrentWeekSchedule(); // Gets schedule from store
        if (currentSchedule && currentSchedule[dateStr]) {
             // Directly modify the object obtained from the store
             currentSchedule[dateStr][period] = className;
             // Note: Persistence is not handled here. Assumed to be handled elsewhere (e.g., SaveLoadController)
        } else {
            console.error(`Cannot schedule class: Schedule or date ${dateStr} not initialized for current week.`);
        }
    }

    unscheduleClass(dateStr, period) {
        const currentSchedule = this.getCurrentWeekSchedule(); // Gets schedule from store
         if (currentSchedule && currentSchedule[dateStr]) {
            currentSchedule[dateStr][period] = null;
             // Note: Persistence is not handled here.
        } else {
             console.error(`Cannot unschedule class: Schedule or date ${dateStr} not initialized for current week.`);
        }
    }
        
    resetSchedule() { // Resets current week
        const offset = this.dataStore.currentWeekOffset;
        // Re-initialize the specific week in the store
        this.initializeEmptyWeek(offset);
        // Note: Persistence is not handled here.
    }
    
    resetAllSchedules() {
        // Reset state properties in the store via setters
        this.dataStore.scheduleWeeks = {};
        this.dataStore.teacherUnavailability = {};
        this.dataStore.currentWeekOffset = 0;
        // Reset start date to ensure consistency
        this.dataStore.scheduleStartDate = this.dateUtils.getNextMonday();
        this.initializeEmptyWeek(0); // Re-initialize week 0 in the store
        // Note: Persistence is not handled here.
    }

    getUnscheduledClasses() {
        const scheduledClasses = new Set();
        // Iterate over all weeks in the store
        Object.values(this.dataStore.scheduleWeeks).forEach(weekSchedule => {
            if (!weekSchedule) return;
            Object.values(weekSchedule).forEach(daySchedule => {
                 if (!daySchedule) return;
                Object.values(daySchedule).forEach(className => {
                    if (className) scheduledClasses.add(className);
                });
            });
        });
        // Use injected ClassRepository to get the full list
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

    // --- Conflict/Availability ---
    // Note: hasConflict seems duplicated in data.js, taking the second definition (lines 282-300)
     hasConflict(className, dateStr, period) {
        // Use ClassRepository to get class info
        const classInfo = this.classRepository.getClasses().find(c => c.name === className);
        if (!classInfo) return false; // Class not found, cannot have conflict
        
        const [year, month, day] = dateStr.split('-').map(num => parseInt(num, 10));
        const date = new Date(Date.UTC(year, month - 1, day));
        const dayOfWeek = this.dateUtils.getDayFromDate(date);
        
        // Check for weekend conflict
        if (dayOfWeek === 'Saturday' || dayOfWeek === 'Sunday') return true;
        
        // Check for class-specific conflicts
        if (classInfo.conflicts[dayOfWeek]?.includes(Number(period))) {
            return true;
        }
        // Check for teacher unavailability
        if (this.isTeacherUnavailable(dateStr, period)) {
            return true;
        }
        return false;
    }
    
    isTeacherUnavailable(dateStr, period) {
        const [year, month, day] = dateStr.split('-').map(num => parseInt(num, 10));
        const date = new Date(Date.UTC(year, month - 1, day));
        
        const monday = this.dateUtils.getMondayOfWeek(date);
        const startMonday = this.dateUtils.getMondayOfWeek(this.dataStore.scheduleStartDate); // Use store value
        
        const diffTime = monday.getTime() - startMonday.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        const weekOffset = Math.round(diffDays / 7);
        
        // Access store directly
        return this.dataStore.teacherUnavailability[weekOffset]?.[dateStr]?.[period] === true;
    }
    
    toggleTeacherUnavailability(dateStr, period) {
        const [year, month, day] = dateStr.split('-').map(num => parseInt(num, 10));
        const date = new Date(Date.UTC(year, month - 1, day));
        
        const monday = this.dateUtils.getMondayOfWeek(date);
        const startMonday = this.dateUtils.getMondayOfWeek(this.dataStore.scheduleStartDate);
        
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
        
        // Return the *new* state
        return !isCurrentlyUnavailable;
    }

}