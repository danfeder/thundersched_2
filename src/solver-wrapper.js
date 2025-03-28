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
        // Reset state before attempting to load
        _isInitialized = false;
        _initializationError = null;
        _solver = null;

        try {
            console.log('Loading GLPK constraint solver library...');
            
            // 1. Dynamically import the ES Module entry point
            // Note: Dynamic import paths are resolved relative to the script file.
            // Since this script is in src/ and index.js is in libs/, the path is '../libs/index.js'
            console.log('Dynamically importing GLPK module from ../libs/index.js...');
            const glpkModule = await import('../libs/index.js');
            
            console.log('GLPK module imported, accessing factory...');

            // 2. Get the factory function (assuming it's the default export)
            const GLPKFactory = glpkModule.default;
            if (typeof GLPKFactory !== 'function') {
                console.error('GLPK Module:', glpkModule); // Log the module content for debugging
                throw new Error('GLPK factory function not found in the imported module.');
            }

            // 3. Initialize the solver instance (this returns a promise)
            // The factory handles locating the .wasm file relative to the *imported* script (index.js)
            console.log('Initializing GLPK factory...');
            const glpk = await GLPKFactory();
            
            if (!glpk || typeof glpk.solve !== 'function') {
                 throw new Error('GLPK factory did not return a valid solver instance.');
            }

            // 4. Assign the solver instance
            _solver = glpk;
            _isInitialized = true;
            _initializationError = null; // Clear any previous error
            console.log('GLPK constraint solver initialized successfully.');
            return Promise.resolve(); // Indicate success

        } catch (error) {
            console.error('GLPK Solver initialization failed:', error);
            _initializationError = error; // Store the error
            _isInitialized = false;     // Ensure state reflects failure
            _solver = null;             // Ensure solver is null on failure
            return Promise.reject(error); // Propagate the error
        }
    }
    
    /**
     * Builds the GLPK problem structure based on the schedule, constraints, and definitions.
     * @param {Object} scheduleData - Full multi-week schedule data { weekOffset: { dateStr: { period: className } } }
     * @param {Object} newConstraints - The proposed constraint values { maxConsecutiveClasses, maxClassesPerDay, minClassesPerWeek, maxClassesPerWeek }
     * @param {Object} teacherUnavailability - Full multi-week teacher unavailability { weekOffset: { dateStr: { period: true } } }
     * @param {Array} classDefinitions - Array of class definition objects { name, conflicts: { DayName: [periods] } }
     * @return {{ problem: Object, varMap: Map<string, Object> }} GLPK problem structure and variable mapping
     */
    function buildSolverModel(scheduleData, newConstraints, teacherUnavailability, classDefinitions) {
        if (!_solver) {
            throw new Error("Solver not initialized before calling buildSolverModel");
        }
        
        console.log("Building solver model with constraints:", newConstraints);
        const varMap = new Map(); // Map variable names back to { className, dateStr, period, weekOffset }
        const variables = []; // Array for GLPK variable definitions
        const constraints = []; // Array for GLPK constraints
        
        // --- Data Preparation & Pre-filtering ---
        
        // Efficient lookup for class conflicts { className: { DayName: Set<period> } }
        const classConflictMap = new Map();
        const dayNameToIndex = { 'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3, 'Friday': 4, 'Saturday': 5, 'Sunday': 6 }; // Assuming standard JS getDay() mapping where Sunday=0
        
        classDefinitions.forEach(c => {
            const dailyConflicts = {};
            Object.entries(c.conflicts || {}).forEach(([dayName, periods]) => {
                // Ensure periods is an array before creating Set
                if (Array.isArray(periods)) {
                    dailyConflicts[dayName] = new Set(periods.map(Number));
                } else {
                     dailyConflicts[dayName] = new Set(); // Handle cases where conflicts might be missing or malformed
                }
            });
            classConflictMap.set(c.name, dailyConflicts);
        });
        
        // --- Variable Definition (Only for valid assignments) ---
        
        Object.keys(scheduleData).forEach(weekOffsetStr => {
            const weekOffset = parseInt(weekOffsetStr, 10); // Ensure weekOffset is a number
            const weekSchedule = scheduleData[weekOffset];
            const weekUnavailability = teacherUnavailability[weekOffset] || {};
            
            Object.keys(weekSchedule).forEach(dateStr => {
                const daySchedule = weekSchedule[dateStr];
                const dayUnavailability = weekUnavailability[dateStr] || {};
                
                // Get day of week for conflict checking
                const [year, month, day] = dateStr.split('-').map(num => parseInt(num, 10));
                const dateObj = new Date(year, month - 1, day);
                const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dateObj.getDay()];

                for (let period = 1; period <= 8; period++) {
                    // 1. Check Teacher Availability
                    if (dayUnavailability[period]) {
                        continue; // Skip unavailable slots entirely for the model
                    }
                    
                    // 2. Check potential classes for this slot
                    classDefinitions.forEach((classDef, classIdx) => {
                        const className = classDef.name;
                        const classConflicts = classConflictMap.get(className) || {};
                        const dayConflicts = classConflicts[dayName] || new Set();

                        // 3. Check Class Hard Conflicts
                        if (dayConflicts.has(period)) {
                            // console.log(`Skipping var for ${className} on ${dateStr} P${period} due to hard conflict.`);
                            return; // Skip variable creation if hard conflict exists
                        }
                        
                        // If checks pass, create a variable for this potential assignment
                        const varName = `v_${classIdx}_${weekOffset}_${dateStr}_${period}`;
                        variables.push({ name: varName, coef: 0 }); // Coefficient is 0 for feasibility objective
                        varMap.set(varName, {
                            className: className,
                            classIdx: classIdx,
                            weekOffset: weekOffset,
                            dateStr: dateStr,
                            period: period,
                            dayName: dayName // Store dayName for easier constraint building
                        });
                    });
                }
            });
        });
        
        console.log(`Created ${variables.length} potential assignment variables after pre-filtering.`);
        
        // --- Objective Function (Feasibility) ---
        const objective = {
            direction: _solver.GLP_MAX, // Maximize (or minimize) 0 for feasibility
            name: 'feasibility',
            vars: [] // No specific variables in the objective itself
        };
        
        // --- Constraints ---
        
        // 1. Slot Occupancy: At most one class per slot (week, date, period)
        const slotOccupancyMap = {}; // { `${weekOffset}_${dateStr}_${period}`: [varNames] }
        varMap.forEach((details, varName) => {
            const key = `${details.weekOffset}_${details.dateStr}_${details.period}`;
            if (!slotOccupancyMap[key]) {
                slotOccupancyMap[key] = [];
            }
            slotOccupancyMap[key].push({ name: varName, coef: 1 });
        });
        Object.entries(slotOccupancyMap).forEach(([key, vars], index) => {
            constraints.push({
                name: `slot_${index}`,
                vars: vars,
                bnds: { type: _solver.GLP_UP, ub: 1.0 } // Sum <= 1
            });
        });
        
        // 2. Max Consecutive Classes: Per day (week, date)
        const dailyVarMap = {}; // { `${weekOffset}_${dateStr}`: { period: [varNames] } }
        varMap.forEach((details, varName) => {
            const key = `${details.weekOffset}_${details.dateStr}`;
            if (!dailyVarMap[key]) {
                dailyVarMap[key] = {};
            }
            if (!dailyVarMap[key][details.period]) {
                dailyVarMap[key][details.period] = [];
            }
            dailyVarMap[key][details.period].push(varName);
        });
        
        Object.entries(dailyVarMap).forEach(([dayKey, periods], dayIdx) => {
            const maxConsec = newConstraints.maxConsecutiveClasses;
            for (let pStart = 1; pStart <= 8 - maxConsec; pStart++) {
                const consecutiveVars = [];
                for (let i = 0; i <= maxConsec; i++) {
                    const currentPeriod = pStart + i;
                    if (periods[currentPeriod]) {
                        periods[currentPeriod].forEach(varName => {
                            consecutiveVars.push({ name: varName, coef: 1 });
                        });
                    }
                }
                if (consecutiveVars.length > maxConsec) { // Only add constraint if enough potential vars exist
                    constraints.push({
                        name: `cons_${dayIdx}_p${pStart}`,
                        vars: consecutiveVars,
                        bnds: { type: _solver.GLP_UP, ub: maxConsec } // Sum <= maxConsecutive
                    });
                }
            }
        });

        // 3. Max Daily Classes: Per day (week, date)
        Object.entries(dailyVarMap).forEach(([dayKey, periods], dayIdx) => {
            const dailyVars = [];
            Object.values(periods).forEach(varNames => {
                varNames.forEach(varName => {
                    dailyVars.push({ name: varName, coef: 1 });
                });
            });
             if (dailyVars.length > 0) {
                constraints.push({
                    name: `daily_${dayIdx}`,
                    vars: dailyVars,
                    bnds: { type: _solver.GLP_UP, ub: newConstraints.maxClassesPerDay } // Sum <= maxClassesPerDay
                });
            }
        });

        // 4. Weekly Load: Per week (weekOffset)
        const weeklyVarMap = {}; // { weekOffset: [varNames] }
        varMap.forEach((details, varName) => {
            const key = details.weekOffset;
            if (!weeklyVarMap[key]) {
                weeklyVarMap[key] = [];
            }
            weeklyVarMap[key].push({ name: varName, coef: 1 });
        });
        
        Object.entries(weeklyVarMap).forEach(([weekOffset, weeklyVars], weekIdx) => {
            if (weeklyVars.length > 0) {
                constraints.push({
                    name: `weekly_${weekIdx}`,
                    vars: weeklyVars,
                    bnds: {
                        type: _solver.GLP_DB, // Double bounded
                        lb: newConstraints.minClassesPerWeek,
                        ub: newConstraints.maxClassesPerWeek
                    }
                });
            }
        });

        // 5. Class Assignment: Each class must be scheduled exactly once
        const classAssignmentMap = {}; // { classIdx: [varNames] }
        varMap.forEach((details, varName) => {
            const key = details.classIdx;
            if (!classAssignmentMap[key]) {
                classAssignmentMap[key] = [];
            }
            classAssignmentMap[key].push({ name: varName, coef: 1 });
        });

        // Ensure we have a constraint for every class defined
        for (let i = 0; i < classDefinitions.length; i++) {
             const classVars = classAssignmentMap[i] || [];
             // Only add constraint if there are possible variables for this class
             // If a class has no possible slots due to hard conflicts/unavailability, the model becomes infeasible here
             if (classVars.length > 0) {
                constraints.push({
                    name: `assign_class_${i}`,
                    vars: classVars,
                    bnds: { type: _solver.GLP_FX, lb: 1.0, ub: 1.0 } // Sum = 1
                });
            } else {
                 // If a class has NO potential variables, the schedule is inherently infeasible
                 // We could potentially throw an error here or let the solver handle it
                 console.warn(`Class ${classDefinitions[i]?.name || i} has no valid placement options based on hard conflicts/unavailability.`);
                 // Adding a dummy infeasible constraint to make sure solver fails predictably
                 constraints.push({
                    name: `assign_class_${i}_INFEASIBLE`,
                    vars: [{ name: variables[0].name, coef: 1 }], // Use any existing variable
                    bnds: { type: _solver.GLP_FX, lb: 10.0, ub: 10.0 } // Force infeasibility (var is binary 0/1)
                 });
            }
        }

        // --- Assemble Problem Structure ---
        const problem = {
            name: 'schedule_feasibility',
            objective: objective,
            subjectTo: constraints,
            binaries: variables.map(v => v.name) // Mark all variables as binary
        };
        
        console.log(`Model built: ${variables.length} vars, ${constraints.length} constraints.`);
        
        // For debugging: Log a sample of the problem structure
        // console.log("Sample Problem Structure:", JSON.stringify(problem, (key, value) =>
        //     (key === 'vars' && Array.isArray(value) && value.length > 10) ? `[${value.length} vars]` : value, 2));

        return { problem, varMap };
    }

    /**
     * Runs the GLPK solver with a specified timeout.
     * @param {Object} problem - The GLPK problem structure from buildSolverModel.
     * @param {number} [timeoutMs=30000] - Timeout in milliseconds.
     * @return {Promise<Object>} Resolves with solver results or rejects on timeout/error.
     */
    async function runSolverWithTimeout(problem, timeoutMs = 30000) {
        if (!_solver) {
            return Promise.reject({ status: 'error', message: 'Solver not initialized before calling runSolverWithTimeout' });
        }

        console.log(`Running solver with timeout: ${timeoutMs}ms`);
        const options = {
            tmlim: Math.ceil(timeoutMs / 1000), // GLPK tmlim is in seconds
            mipGap: 0.01, // Allow 1% MIP gap for potentially faster solutions (adjust if needed)
            presol: true, // Use presolver
            msglev: _solver.GLP_MSG_ERR // Log only errors from the solver
            // Use _solver.GLP_MSG_ALL for verbose debugging during development
        };

        let timeoutHandle;

        const solverPromise = new Promise(async (resolve, reject) => {
            try {
                console.time("Solver Execution"); // Start timing
                const result = await _solver.solve(problem, options);
                console.timeEnd("Solver Execution"); // End timing
                
                clearTimeout(timeoutHandle); // Clear timeout if solver finishes first

                // Interpret GLPK result status
                const status = result?.result?.status;
                console.log("Solver finished with status code:", status);

                switch (status) {
                    case _solver.GLP_OPT: // Optimal solution found
                    case _solver.GLP_FEAS: // Feasible solution found (for MIP, might not be optimal if stopped early)
                        resolve({
                            status: 'feasible', // Treat both OPT and FEAS as feasible for our purpose
                            solution: result.result.vars,
                            objective: result.result.z // Include objective value if needed later
                        });
                        break;
                    case _solver.GLP_INFEAS: // Infeasible solution
                    case _solver.GLP_NOFEAS: // No feasible solution exists
                        resolve({ status: 'infeasible' });
                        break;
                    case _solver.GLP_UNDEF: // Solution is undefined (e.g., possibly stopped by timeout)
                         // Check if timeout occurred based on time limit
                        if (options.tmlim && options.tmlim > 0) {
                             // It's likely a timeout if status is UNDEF and tmlim was set
                             console.warn("Solver status UNDEF, likely due to timeout.");
                             reject({ status: 'timeout' }); // Treat UNDEF as timeout when tmlim is set
                        } else {
                            resolve({ status: 'unknown', rawStatus: status, message: 'Solution status undefined.' });
                        }
                        break;
                    case _solver.GLP_UNBND: // Unbounded solution
                         resolve({ status: 'unbounded', message: 'Problem model is unbounded.' });
                         break;
                    default:
                        console.warn("Unknown GLPK status code:", status);
                        resolve({ status: 'unknown', rawStatus: status, message: 'Unknown solver status.' });
                }
            } catch (error) {
                console.error("Error during solver execution:", error);
                clearTimeout(timeoutHandle);
                reject({ status: 'error', message: error.message || 'Solver execution failed' });
            }
        });

        const timeoutPromise = new Promise((_, reject) => {
            timeoutHandle = setTimeout(() => {
                console.warn(`Solver timed out after ${timeoutMs}ms`);
                // Note: We can't forcefully stop the WASM worker easily,
                // but Promise.race will ensure we proceed with the timeout status.
                reject({ status: 'timeout' });
            }, timeoutMs);
        });

        return Promise.race([solverPromise, timeoutPromise]);
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
     * @param {Object} currentConstraints - Current constraints (Note: This seems unused now, consider removing later)
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
         * @param {Object} currentConstraints - Current constraints (Note: This seems unused now, consider removing later)
         * @param {Object} newConstraints - Modified constraints
         * @param {Object} dataManager - The DataManager instance.
         * @return {Promise<Object>} Simulation results
         */
        simulateConstraintChanges: async function(scheduleData, currentConstraints, newConstraints, dataManager) {
            // Ensure solver is initialized, fall back on error
            if (!_isInitialized) {
                try {
                    await this.initialize();
                } catch (initError) {
                    console.error('Solver initialization failed during simulation, using basic simulation:', initError);
                    // Pass dataManager to fallback
                    const fallbackResult = basicConstraintSimulation(scheduleData, currentConstraints, newConstraints, dataManager);
                    fallbackResult.source = 'fallback_init_error'; // Add source info
                    return fallbackResult;
                }
            }
            
            // If initialization succeeded but _solver is still null (shouldn't happen but safety check)
             if (!_solver) {
                 console.error('Solver object not available after initialization, using basic simulation.');
                 // Pass dataManager to fallback
                 const fallbackResult = basicConstraintSimulation(scheduleData, currentConstraints, newConstraints, dataManager);
                 fallbackResult.source = 'fallback_solver_missing';
                 return fallbackResult;
             }

            try {
                console.log("Starting solver-based constraint simulation...");
                // 1. Get necessary data from the passed dataManager instance
                if (!dataManager || typeof dataManager.getClasses !== 'function') {
                     throw new Error("Valid DataManager instance was not provided.");
                }
                const classDefinitions = dataManager.getClasses();
                // Access the full multi-week teacher unavailability directly from the instance
                const teacherUnavailability = dataManager.teacherUnavailability || {};
                
                // 2. Build the solver model
                console.time("Build Solver Model");
                const { problem, varMap } = buildSolverModel(
                    scheduleData,
                    newConstraints,
                    teacherUnavailability,
                    classDefinitions
                );
                console.timeEnd("Build Solver Model");

                // 3. Run the solver with timeout
                const solverResult = await runSolverWithTimeout(problem, 30000); // 30s timeout

                // 4. Interpret results
                let feasible = false;
                let invalidPlacements = [];
                let currentClassCount = 0;
                let simulatedClassCount = 0;
                let source = 'unknown';
                let feasibleSchedule = {}; // Initialize feasible schedule object
                
                // Calculate current class count once
                 Object.values(scheduleData).forEach(week => {
                     Object.values(week).forEach(day => {
                         Object.values(day).forEach(className => {
                             if (className) currentClassCount++;
                         });
                     });
                 });

                if (solverResult.status === 'feasible') {
                    console.log("Solver returned FEASIBLE solution.");
                    feasible = true;
                    source = 'solver';
                    const solution = solverResult.solution || {};
                    simulatedClassCount = 0; // Recalculate based on solution

                    // Iterate through the *original* schedule placements
                    Object.keys(scheduleData).forEach(weekOffsetStr => {
                        const weekOffset = parseInt(weekOffsetStr, 10);
                        Object.keys(scheduleData[weekOffset]).forEach(dateStr => {
                            Object.keys(scheduleData[weekOffset][dateStr]).forEach(periodStr => {
                                const period = parseInt(periodStr, 10);
                                const className = scheduleData[weekOffset][dateStr][period];
                                
                                if (className) {
                                    // Find the corresponding variable in the map
                                    let foundVarName = null;
                                    for (const [varName, details] of varMap.entries()) {
                                        if (details.className === className &&
                                            details.weekOffset === weekOffset &&
                                            details.dateStr === dateStr &&
                                            details.period === period) {
                                            foundVarName = varName;
                                            break;
                                        }
                                    }

                                    // Check its value in the solution
                                    if (foundVarName && solution[foundVarName] !== undefined) {
                                         if (solution[foundVarName] >= 0.5) {
                                             //simulatedClassCount++; // Count classes kept by the solver -- REMOVE THIS LINE
                                         } else {
                                             // This originally scheduled class is NOT in the feasible solution
                                             invalidPlacements.push({
                                                 className,
                                                 dateStr,
                                                 period,
                                                 weekOffset,
                                                 reason: 'Removed by solver to satisfy new constraints'
                                             });
                                         }
                                    } else if (foundVarName === null) {
                                         // If the variable wasn't even created (e.g., due to pre-filtering like teacher unavailability or hard conflict)
                                         // it's implicitly invalid under the new constraints.
                                          invalidPlacements.push({
                                              className,
                                              dateStr,
                                              period,
                                              weekOffset,
                                              reason: 'Conflicts with teacher unavailability or class hard conflict'
                                          });
                                    } else {
                                         // Variable existed but wasn't in the solution output (shouldn't happen for binaries?)
                                         // Treat as invalid to be safe.
                                          invalidPlacements.push({
                                              className,
                                              dateStr,
                                              period,
                                              weekOffset,
                                              reason: 'Not included in solver solution (unexpected)'
                                          });
                                    }
                                }
                            });
                        });
                    });
                    
                    // Now, build the feasible schedule from the solver's solution
                    for (const [varName, details] of varMap.entries()) {
                        if (solution[varName] !== undefined && solution[varName] >= 0.5) {
                            const { weekOffset, dateStr, period, className } = details;
                            if (!feasibleSchedule[weekOffset]) {
                                feasibleSchedule[weekOffset] = {};
                            }
                            if (!feasibleSchedule[weekOffset][dateStr]) {
                                feasibleSchedule[weekOffset][dateStr] = {}; // Initialize day object if needed
                            }
                            feasibleSchedule[weekOffset][dateStr][period] = className;
                            simulatedClassCount++; // Correctly count placements in the feasible solution
                        }
                    }
                    
                } else if (solverResult.status === 'infeasible') {
                    console.log("Solver returned INFEASIBLE.");
                    feasible = false;
                    source = 'solver_infeasible_fallback_analysis';
                    // Run basic checker for *indicative* conflicts
                    invalidPlacements = findInvalidPlacementsWithNewConstraints(
                        scheduleData,
                        currentConstraints,
                        newConstraints
                    );
                    simulatedClassCount = currentClassCount - invalidPlacements.length; // Estimate based on basic check
                     console.log(`Infeasible: Found ${invalidPlacements.length} indicative conflicts using basic check.`);

                } else { // Timeout or Error or Unknown
                    console.warn(`Solver finished with status: ${solverResult.status}. Falling back to basic simulation.`);
                    const fallbackResult = basicConstraintSimulation(scheduleData, currentConstraints, newConstraints);
                    fallbackResult.source = solverResult.status === 'timeout' ? 'fallback_timeout' : 'fallback_solver_error';
                    return fallbackResult; // Return the entire fallback result
                }

                return {
                    feasible,
                    invalidPlacements,
                    currentClassCount,
                    simulatedClassCount,
                    feasibleSchedule, // Add the feasible schedule here
                    source,
                    // Add any other metrics if needed
                };

            } catch (error) {
                console.error('Error during solver simulation, falling back to basic simulation:', error);
                const fallbackResult = basicConstraintSimulation(scheduleData, currentConstraints, newConstraints);
                fallbackResult.source = 'fallback_runtime_error';
                return fallbackResult;
            }
        }
    };
})();

// Export the IIFE result as the default ES Module export
export default ConstraintSolverWrapper;