// Service for abstracting data persistence (currently localStorage)

/**
 * Provides an interface for saving and loading data, handling potential errors.
 */
export class PersistenceService {
    constructor(errorHandler = null) {
        // Optional error handler function (e.g., to display messages to the user)
        this.errorHandler = errorHandler || ((type, message) => console.error(`${type}: ${message}`));
    }

    /**
     * Saves data to localStorage under the specified key.
     * @param {string} key - The key under which to store the data.
     * @param {any} data - The data to store (will be JSON.stringified).
     * @returns {boolean} True if saving was successful, false otherwise.
     */
    save(key, data) {
        try {
            const serializedData = JSON.stringify(data);
            localStorage.setItem(key, serializedData);
            console.log(`Data saved successfully under key: ${key}`);
            return true;
        } catch (error) {
            console.error(`Error saving data under key "${key}":`, error);
            // Check for QuotaExceededError specifically
            if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.code === 22)) {
                 this.errorHandler('error', 'Storage limit exceeded. Cannot save data. Please clear some saved items.');
            } else {
                 this.errorHandler('error', `Failed to save data for "${key}". An unexpected error occurred.`);
            }
            return false;
        }
    }

    /**
     * Loads data from localStorage for the specified key.
     * @param {string} key - The key from which to retrieve data.
     * @returns {any | null} The parsed data, or null if the key doesn't exist or an error occurs during parsing.
     */
    load(key) {
        try {
            const serializedData = localStorage.getItem(key);
            if (serializedData === null) {
                console.log(`No data found in localStorage for key: ${key}`);
                return null; // Key doesn't exist
            }
            const data = JSON.parse(serializedData);
            console.log(`Data loaded successfully from key: ${key}`);
            return data;
        } catch (error) {
            console.error(`Error loading or parsing data from key "${key}":`, error);
             this.errorHandler('error', `Failed to load data for "${key}". Data might be corrupted.`);
            // Optionally clear the corrupted item
            // localStorage.removeItem(key); 
            return null; // Return null on error
        }
    }

    /**
     * Removes an item from localStorage.
     * @param {string} key - The key of the item to remove.
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
            console.log(`Removed item with key: ${key}`);
        } catch (error) {
            console.error(`Error removing item with key "${key}":`, error);
             this.errorHandler('error', `Failed to remove data for "${key}".`);
        }
    }

    /**
     * Clears all items managed by this persistence layer (potentially dangerous).
     * In a real app, you might want more granular clearing based on prefixes.
     * For now, it clears all of localStorage. Use with caution.
     */
    clearAll() {
        try {
            localStorage.clear();
            console.warn('Cleared all localStorage data.');
        } catch (error) {
            console.error('Error clearing localStorage:', error);
             this.errorHandler('error', 'Failed to clear all stored data.');
        }
    }
}