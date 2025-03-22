/**
 * Library Loader - Utility for lazy-loading JavaScript libraries
 * Safely loads external resources only when needed
 */
const LibraryLoader = (function() {
    // Track loaded libraries
    const loaded = {};
    
    return {
        // Expose loaded state
        loaded: loaded,
        
        /**
         * Load a JavaScript library only when needed
         * @param {string} name - Library identifier
         * @param {string} url - Library URL
         * @param {Function} checkFn - Function to check if already loaded
         * @return {Promise} Resolves when library is loaded
         */
        loadLibrary: function(name, url, checkFn) {
            // Return immediately if already loaded
            if (this.loaded[name]) {
                return Promise.resolve();
            }
            
            // Check if it's already available in window
            if (checkFn && checkFn()) {
                this.loaded[name] = true;
                return Promise.resolve();
            }
            
            // Load the script
            return new Promise((resolve, reject) => {
                console.log(`Loading library: ${name} from ${url}`);
                const script = document.createElement('script');
                script.src = url;
                script.async = true;
                
                script.onload = () => {
                    console.log(`Successfully loaded ${name}`);
                    this.loaded[name] = true;
                    resolve();
                };
                
                script.onerror = (error) => {
                    console.error(`Failed to load ${name} library:`, error);
                    reject(new Error(`Failed to load ${name} library`));
                };
                
                document.head.appendChild(script);
            });
        }
    };
})();