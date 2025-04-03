/**
 * ConfigManager Class
 * Handles management of application configuration, including persistence.
 */
export class ConfigManager {
    /**
     * @param {import('../data-store.js').DataStore} dataStore - The central data store instance.
     * @param {import('../persistence-service.js').PersistenceService} persistenceService - The service for saving/loading data.
     */
    constructor(dataStore, persistenceService) {
        if (!dataStore) throw new Error("DataStore is required for ConfigManager");
        if (!persistenceService) throw new Error("PersistenceService is required for ConfigManager");

        this.dataStore = dataStore;
        this.persistenceService = persistenceService;
        this.configStorageKey = 'cooking-class-config'; // Centralize storage key
    }

    /**
     * Retrieves the current configuration object.
     * @returns {object} The configuration object.
     */
    getConfig() {
        return this.dataStore.config;
    }

    /**
     * Updates the configuration with new values and persists the changes.
     * The DataStore setter handles merging partial updates.
     * @param {object} newConfig - An object containing configuration properties to update.
     * @returns {object} The updated configuration object.
     */
    updateConfig(newConfig) {
        this.dataStore.config = newConfig; // Use DataStore setter (merges)
        this.saveConfig(); // Persist changes
        return this.getConfig(); // Return the updated config from the store
    }

    /**
     * Loads the configuration from persistence into the DataStore.
     */
    loadConfig() {
        const storedConfig = this.persistenceService.load(this.configStorageKey);
        if (storedConfig) {
            this.dataStore.config = storedConfig; // Update store via setter
            console.log('ConfigManager: Loaded configuration from storage:', this.dataStore.config);
        } else {
            console.log('ConfigManager: No configuration found in storage, using defaults.');
            // Optionally save default config on first load if desired
            // this.saveConfig(); 
        }
    }

    /**
     * Saves the current configuration from the DataStore to persistence.
     * @returns {boolean} True if save was successful, false otherwise.
     */
    saveConfig() {
        return this.persistenceService.save(this.configStorageKey, this.dataStore.config);
    }
}