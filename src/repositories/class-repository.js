// Repository for managing Class data and persistence logic

import { parseCSVData } from '../csv-parser.js';

const CLASSES_STORAGE_KEY = 'cooking-classes';
const SCHEDULE_STORAGE_KEY = 'cooking-class-schedule'; // Needed for updating schedule on class name change

export class ClassRepository {
    /**
     * @param {DataStore} dataStore - The application's central data store.
     * @param {PersistenceService} persistenceService - The service for saving/loading data.
     */
    constructor(dataStore, persistenceService) {
        if (!dataStore) throw new Error("ClassRepository requires a DataStore instance.");
        if (!persistenceService) throw new Error("ClassRepository requires a PersistenceService instance.");
        
        this.dataStore = dataStore;
        this.persistenceService = persistenceService;
        
        // Load initial classes if store is empty
        if (this.dataStore.classes.length === 0) {
            this.loadClassesFromLocalStorage();
        }
    }

    /**
     * Retrieves the current list of all classes.
     * @returns {object[]} Array of class objects.
     */
    getClasses() {
        return this.dataStore.classes;
    }

    /**
     * Adds a new class definition.
     * @param {object} classInfo - The class object to add.
     * @returns {boolean} True if the class was added and saved successfully, false otherwise.
     */
    addClass(classInfo) {
        const existingClass = this.dataStore.classes.find(c => c.name === classInfo.name);
        if (existingClass) {
            console.warn(`ClassRepository: Class with name "${classInfo.name}" already exists.`);
            return false; 
        }
        
        // Update store state immutably
        const newClasses = [...this.dataStore.classes, classInfo];
        this.dataStore.classes = newClasses; 
        
        const saved = this.persistenceService.save(CLASSES_STORAGE_KEY, this.dataStore.classes);
        if (saved) {
            console.log(`ClassRepository: Class ${classInfo.name} added and saved.`);
        }
        return saved; 
    }

    /**
     * Updates an existing class definition and potentially updates the schedule if the name changed.
     * @param {string} oldName - The original name of the class to update.
     * @param {object} updatedClassInfo - The new class information.
     * @returns {boolean} True if the update and necessary saves were successful, false otherwise.
     */
    updateClass(oldName, updatedClassInfo) {
        const index = this.dataStore.classes.findIndex(c => c.name === oldName);
        if (index === -1) {
             console.warn(`ClassRepository: Class "${oldName}" not found for update.`);
            return false; 
        }

        const newClasses = [...this.dataStore.classes];
        newClasses[index] = updatedClassInfo;
        this.dataStore.classes = newClasses; 

        let scheduleSaved = true; 
        if (oldName !== updatedClassInfo.name) {
            console.log(`ClassRepository: Class name changed from "${oldName}" to "${updatedClassInfo.name}". Updating schedule.`);
            // Need to update schedule in the store
            const currentScheduleWeeks = { ...this.dataStore.scheduleWeeks }; // Clone schedule
             Object.keys(currentScheduleWeeks).forEach(weekOffset => {
                const weekSchedule = currentScheduleWeeks[weekOffset];
                if (!weekSchedule) return;
                Object.keys(weekSchedule).forEach(dateStr => {
                     if (!weekSchedule[dateStr]) return;
                    Object.keys(weekSchedule[dateStr]).forEach(period => {
                        if (weekSchedule[dateStr][period] === oldName) {
                            weekSchedule[dateStr][period] = updatedClassInfo.name;
                        }
                    });
                });
            });
            this.dataStore.scheduleWeeks = currentScheduleWeeks; // Update store schedule
            scheduleSaved = this.persistenceService.save(SCHEDULE_STORAGE_KEY, this.dataStore.scheduleWeeks);
            if (scheduleSaved) {
                 console.log(`ClassRepository: Schedule updated due to class rename.`);
            }
        }
        
        const classesSaved = this.persistenceService.save(CLASSES_STORAGE_KEY, this.dataStore.classes);
        if (classesSaved) {
             console.log(`ClassRepository: Class ${updatedClassInfo.name} updated and saved.`);
        }
        
        return scheduleSaved && classesSaved; 
    }

    /**
     * Deletes a class definition if it's not currently scheduled.
     * @param {string} className - The name of the class to delete.
     * @returns {boolean} True if the class was deleted and saved successfully, false otherwise.
     */
    deleteClass(className) {
        if (this.isClassScheduled(className)) {
             console.warn(`ClassRepository: Cannot delete class "${className}" as it is scheduled.`);
            return false; 
        }
        
        const initialLength = this.dataStore.classes.length;
        const newClasses = this.dataStore.classes.filter(c => c.name !== className);
        
        if (newClasses.length === initialLength) {
             console.warn(`ClassRepository: Class "${className}" not found for deletion.`);
            return false; // Class not found
        }

        this.dataStore.classes = newClasses; // Update store
        
        const saved = this.persistenceService.save(CLASSES_STORAGE_KEY, this.dataStore.classes);
        if (saved) {
            console.log(`ClassRepository: Class ${className} deleted and saved.`);
        }
        return saved;
    }

    /**
     * Checks if a class is scheduled in any week.
     * @param {string} className - The name of the class to check.
     * @returns {boolean} True if the class is scheduled, false otherwise.
     */
    isClassScheduled(className) {
        return Object.values(this.dataStore.scheduleWeeks).some(weekSchedule => 
            weekSchedule && Object.values(weekSchedule).some(daySchedule => 
                daySchedule && Object.values(daySchedule).includes(className)
            )
        );
    }

    /**
     * Loads class definitions from the CSV file, falling back to localStorage or hardcoded data.
     * Updates the DataStore with the loaded classes.
     * @returns {Promise<object[]>} A promise that resolves with the array of loaded class objects.
     */
    async loadClassesFromCSV() {
        try {
            // Check store first
            if (this.dataStore.classes.length > 0) {
                console.log(`ClassRepository: Using ${this.dataStore.classes.length} classes already in store.`);
                return this.dataStore.classes;
            }
            
            const csvFilePath = 'ClassesAndConflicts.csv';
            try {
                const response = await fetch(csvFilePath);
                if (!response.ok) throw new Error(`Failed to load CSV: ${response.statusText}`);
                
                const csvText = await response.text();
                const classData = parseCSVData(csvText); // Use imported parser
                
                this.dataStore.classes = classData; // Update store
                console.log(`ClassRepository: Loaded ${this.dataStore.classes.length} classes from CSV`);
                
                this.persistenceService.save(CLASSES_STORAGE_KEY, this.dataStore.classes); 
                
                return this.dataStore.classes;
            } catch (fetchError) {
                console.error('ClassRepository: Error fetching/parsing CSV:', fetchError);
                console.log('ClassRepository: Attempting to load classes from storage...');
                if (this.loadClassesFromLocalStorage()) { // Use the repository's method
                    return this.dataStore.classes;
                } else {
                    console.log('ClassRepository: No classes in storage, using hardcoded fallback.');
                    // Hardcoded fallback data
                    this.dataStore.classes = [
                         { name: "PK207", conflicts: { "Monday": [2], "Tuesday": [2], "Wednesday": [4], "Thursday": [3], "Friday": [1, 3] } },
                         { name: "K-313", conflicts: { "Monday": [1], "Tuesday": [4], "Wednesday": [2, 4], "Thursday": [4], "Friday": [8] } },
                         { name: "1-407", conflicts: { "Monday": [2], "Tuesday": [1], "Wednesday": [1], "Thursday": [2, 4], "Friday": [7] } }
                    ]; 
                    return this.dataStore.classes;
                }
            }
        } catch (error) {
            console.error('ClassRepository: Error in loadClassesFromCSV:', error);
            return [];
        }
    }

    /**
     * Loads class definitions from localStorage into the DataStore.
     * @returns {boolean} True if classes were loaded successfully, false otherwise.
     */
    loadClassesFromLocalStorage() {
        const storedClasses = this.persistenceService.load(CLASSES_STORAGE_KEY);
        if (storedClasses) {
            this.dataStore.classes = storedClasses; // Update store
            console.log(`ClassRepository: Loaded ${this.dataStore.classes.length} classes from storage.`);
            return true;
        }
        return false;
    }
}