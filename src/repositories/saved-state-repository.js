import { getMondayOfWeek, getFormattedDate } from '../date-utils.js';

export class SavedStateRepository {
    constructor(dataStore, persistenceService) {
        if (!dataStore || !persistenceService) {
            throw new Error("SavedStateRepository requires DataStore and PersistenceService instances.");
        }
        this.dataStore = dataStore;
        this.persistenceService = persistenceService;
        console.log("SavedStateRepository initialized");
    }

    // --- Load/Save Operations ---

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
                            // Ensure UTC interpretation for consistency
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
                this.saveSavedSchedulesToLocalStorage(); // Call the repository's save method
            }
            console.log(`Loaded ${this.dataStore.savedSchedules.length} saved schedules from storage`);
        } else {
            console.log('No saved schedules found in storage');
            this.dataStore.savedSchedules = []; // Ensure store is empty array
        }
    }

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

    saveSavedSchedulesToLocalStorage() {
        return this.persistenceService.save('cooking-saved-schedules', this.dataStore.savedSchedules);
    }

    saveSavedClassCollectionsToLocalStorage() {
       return this.persistenceService.save('cooking-saved-class-collections', this.dataStore.savedClassCollections);
    }

    // --- Saved Schedules CRUD ---

    addSavedSchedule(schedule) {
        if (!schedule.lastModified) {
            schedule.lastModified = schedule.createdAt || new Date().toISOString(); // Ensure lastModified exists
        }
        if (!schedule.createdAt) {
             schedule.createdAt = schedule.lastModified; // Ensure createdAt exists
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

    // --- Saved Class Collections CRUD ---

     addSavedClassCollection(collection) {
        if (!collection.lastModified) {
            collection.lastModified = collection.createdAt || new Date().toISOString(); // Add createdAt if missing
        }
         if (!collection.createdAt) {
             collection.createdAt = collection.lastModified; // Ensure createdAt exists
         }
        const newCollections = [...this.dataStore.savedClassCollections, collection];
        this.dataStore.savedClassCollections = newCollections; // Update store
        return this.saveSavedClassCollectionsToLocalStorage();
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
}