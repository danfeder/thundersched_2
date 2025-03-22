/**
 * Constraint Solver Wrapper - Safe, isolated wrapper for constraint solving
 * This module provides simulation capabilities without modifying core data
 */
const ConstraintSolverWrapper = (function() {
    // Private state
    let _solver = null;
    let _isInitialized = false;
    let _initializationError = null;
    let _initializationPromise = null;
    
    /**
     * Load JavaScript library only when needed
     * @param {string} name - Library identifier
     * @param {string} url - Library URL
     * @param {Function} checkFn - Function to check if already loaded
     * @return {Promise} Resolves when library is loaded
     */
    async function loadLibrary(name, url, checkFn) {
        // Return immediately if already loaded
        if (LibraryLoader.loaded[name]) {
            return Promise.resolve();
        }
        
        // Check if it's already available in window
        if (checkFn && checkFn()) {
            LibraryLoader.loaded[name] = true;
            return Promise.resolve();
        }
        
        // Load the script
        return LibraryLoader.loadLibrary(name, url, checkFn);
    }
    
    /**
     * Load the solver library
     */
    async function loadSolver() {
        try {
            console.log('Loading constraint solver...');
            // Create a mock solver for this phase
            // In a future implementation, this would load an actual solver library
            _solver = {
                // Mock solver with simplified functionality
                simulateConstraintChanges: function(schedule, constraints) {
                    return basicConstraintSimulation(schedule, constraints);
                }
            };
            _isInitialized = true;
            console.log('Using simplified constraint solver');
            return Promise.resolve();
        } catch (error) {
            console.error('Solver initialization failed:', error);
            _initializationError = error;
            _isInitialized = false;
            return Promise.reject(error);
        }
    }
    
    /**
     * Find valid time slots for classes based on constraints
     * @param {Object} scheduleData - Schedule data
     * @param {Object} teacherUnavailability - Teacher unavailability
     * @param {Object} classConflicts - Class conflicts
     * @return {Object} Map of valid periods
     */
    function findValidPeriods(scheduleData, teacherUnavailability, classConflicts) {
        const validPeriods = {};
        
        Object.keys(scheduleData).forEach((weekOffset, weekIndex) => {
            Object.keys(scheduleData[weekOffset]).forEach((dateStr, dayIndex) => {
                for (let period = 1; period <= 8; period++) {
                    const key = `${weekIndex}_${dayIndex}_${period}`;
                    
                    // Check teacher availability
                    const teacherIsAvailable = !(teacherUnavailability[weekOffset]?.[dateStr]?.[period]);
                    
                    // Check class conflicts
                    const noClassConflict = !classConflicts[weekOffset]?.[dateStr]?.[period];
                    
                    validPeriods[key] = teacherIsAvailable && noClassConflict;
                }
            });
        });
        
        return validPeriods;
    }
    
    /**
     * Basic constraint simulation without using external solver
     * @param {Object} scheduleData - Schedule data
     * @param {Object} currentConstraints - Current constraints
     * @param {Object} newConstraints - Modified constraints
     * @return {Object} Simulation results
     */
    function basicConstraintSimulation(scheduleData, currentConstraints, newConstraints) {
        // Find placements that violate the new constraints
        const invalidPlacements = findInvalidPlacementsWithNewConstraints(
            scheduleData, 
            currentConstraints, 
            newConstraints
        );
        
        // Count total classes for statistics
        let totalClassCount = 0;
        Object.keys(scheduleData).forEach(weekOffset => {
            Object.keys(scheduleData[weekOffset]).forEach(dateStr => {
                Object.keys(scheduleData[weekOffset][dateStr]).forEach(period => {
                    if (scheduleData[weekOffset][dateStr][period]) {
                        totalClassCount++;
                    }
                });
            });
        });
        
        return {
            source: 'basicSimulation',
            feasible: invalidPlacements.length === 0,
            currentClassCount: totalClassCount,
            simulatedClassCount: totalClassCount - invalidPlacements.length,
            invalidPlacements,
            metrics: {
                // Basic metrics
                totalClasses: totalClassCount,
                invalidPlacements: invalidPlacements.length,
                affectedDays: [...new Set(invalidPlacements.map(p => p.dateStr))].length
            }
        };
    }
    
    /**
     * Find class placements that would become invalid with new constraints
     * @param {Object} scheduleData - Schedule data
     * @param {Object} currentConstraints - Current constraints
     * @param {Object} newConstraints - Modified constraints
     * @return {Array} Invalid placements
     */
    function findInvalidPlacementsWithNewConstraints(scheduleData, currentConstraints, newConstraints) {
        const invalid = [];
        
        // Check consecutive classes
        if (newConstraints.maxConsecutiveClasses < currentConstraints.maxConsecutiveClasses) {
            Object.keys(scheduleData).forEach(weekOffset => {
                Object.keys(scheduleData[weekOffset]).forEach(dateStr => {
                    // Find consecutive runs of classes
                    let consecutiveCount = 0;
                    let consecutiveStart = 0;
                    
                    for (let period = 1; period <= 8; period++) {
                        const className = scheduleData[weekOffset][dateStr][period];
                        
                        if (className) {
                            if (consecutiveCount === 0) {
                                consecutiveStart = period;
                            }
                            consecutiveCount++;
                            
                            // Check if this violates the new limit
                            if (consecutiveCount > newConstraints.maxConsecutiveClasses) {
                                // If this is the first violation in this run, mark classes exceeding the limit
                                if (consecutiveCount === newConstraints.maxConsecutiveClasses + 1) {
                                    // Mark this class as invalid (the one that exceeds the limit)
                                    invalid.push({
                                        className,
                                        dateStr,
                                        period,
                                        weekOffset,
                                        reason: `Exceeds new consecutive limit of ${newConstraints.maxConsecutiveClasses} classes`
                                    });
                                }
                            }
                        } else {
                            // Reset count for next run
                            consecutiveCount = 0;
                        }
                    }
                });
            });
        }
        
        // Check daily class limit
        if (newConstraints.maxClassesPerDay < currentConstraints.maxClassesPerDay) {
            Object.keys(scheduleData).forEach(weekOffset => {
                Object.keys(scheduleData[weekOffset]).forEach(dateStr => {
                    // Count classes on this day
                    const classesOnDay = [];
                    
                    for (let period = 1; period <= 8; period++) {
                        const className = scheduleData[weekOffset][dateStr][period];
                        if (className) {
                            classesOnDay.push({ className, period });
                        }
                    }
                    
                    // If day exceeds the new limit
                    if (classesOnDay.length > newConstraints.maxClassesPerDay) {
                        // Mark the last classes (exceeding the limit) as invalid
                        const excessClasses = classesOnDay.slice(newConstraints.maxClassesPerDay);
                        excessClasses.forEach(({ className, period }) => {
                            invalid.push({
                                className,
                                dateStr,
                                period,
                                weekOffset,
                                reason: `Exceeds new daily limit of ${newConstraints.maxClassesPerDay} classes`
                            });
                        });
                    }
                });
            });
        }
        
        // Check weekly class limit
        if (newConstraints.maxClassesPerWeek < currentConstraints.maxClassesPerWeek) {
            Object.keys(scheduleData).forEach(weekOffset => {
                // Count classes in this week
                const classesInWeek = [];
                
                Object.keys(scheduleData[weekOffset]).forEach(dateStr => {
                    for (let period = 1; period <= 8; period++) {
                        const className = scheduleData[weekOffset][dateStr][period];
                        if (className) {
                            classesInWeek.push({ className, dateStr, period });
                        }
                    }
                });
                
                // If week exceeds the new limit
                if (classesInWeek.length > newConstraints.maxClassesPerWeek) {
                    // Mark the last classes (exceeding the limit) as invalid
                    const excessClasses = classesInWeek.slice(newConstraints.maxClassesPerWeek);
                    excessClasses.forEach(({ className, dateStr, period }) => {
                        invalid.push({
                            className,
                            dateStr,
                            period,
                            weekOffset,
                            reason: `Exceeds new weekly limit of ${newConstraints.maxClassesPerWeek} classes`
                        });
                    });
                }
            });
        }
        
        return invalid;
    }
    
    // Public API
    return {
        /**
         * Initialize the solver (lazy-loaded)
         * @return {Promise} Resolves when solver is ready
         */
        initialize: async function() {
            if (_isInitialized) return Promise.resolve();
            if (_initializationError) return Promise.reject(_initializationError);
            
            // Prevent multiple simultaneous initialization attempts
            if (_initializationPromise) return _initializationPromise;
            
            _initializationPromise = loadSolver();
            
            try {
                await _initializationPromise;
                return Promise.resolve();
            } catch (error) {
                return Promise.reject(error);
            } finally {
                _initializationPromise = null;
            }
        },
        
        /**
         * Check if solver is available
         * @return {boolean} True if solver is initialized
         */
        isAvailable: function() {
            return _isInitialized;
        },
        
        /**
         * Simulate constraint changes safely
         * @param {Object} scheduleData - Copy of schedule data
         * @param {Object} currentConstraints - Current constraints
         * @param {Object} newConstraints - Modified constraints
         * @return {Promise<Object>} Simulation results
         */
        simulateConstraintChanges: async function(scheduleData, currentConstraints, newConstraints) {
            if (!_isInitialized) {
                try {
                    await this.initialize();
                } catch (error) {
                    console.error('Solver initialization failed, using basic simulation:', error);
                    return basicConstraintSimulation(scheduleData, currentConstraints, newConstraints);
                }
            }
            
            try {
                // Use simple simulation for this phase
                return basicConstraintSimulation(scheduleData, currentConstraints, newConstraints);
            } catch (error) {
                console.error('Simulation failed, falling back to basic simulation:', error);
                return basicConstraintSimulation(scheduleData, currentConstraints, newConstraints);
            }
        }
    };
})();