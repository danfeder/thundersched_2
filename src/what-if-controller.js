// Controller for What-If Analysis feature

// Assuming UIManager, DataManager, ConstraintSolverWrapper, ConfigController are passed in
// Import necessary modules if they are not passed via constructor
// import ConstraintSolverWrapper from './solver-wrapper.js'; 

class WhatIfController {
    constructor(dataManager, uiManager, solverWrapper, configController) {
        this.dataManager = dataManager;
        this.uiManager = uiManager;
        this.solverWrapper = solverWrapper; // Assuming ConstraintSolverWrapper instance is passed
        this.configController = configController; // For showConfirmDialog utility
        
        // Internal state for What-If analysis
        this.whatIfState = {
            isLibraryLoaded: false,
            hasRun: false,
            lastSimulation: null,
            isLoading: false
        };
        
        console.log("WhatIfController initialized");

        // Bind methods that might be used as event handlers if needed later
        // (Example: if attaching directly without arrow functions)
        // this.runWhatIfSimulation = this.runWhatIfSimulation.bind(this);
        // this.applyWhatIfResults = this.applyWhatIfResults.bind(this);
    }

    // Method to show the What-If modal and initialize it
    showWhatIfAnalysis() {
        console.log('WhatIfController.showWhatIfAnalysis called');
        
        const modal = document.getElementById('what-if-modal');
        if (!modal) {
             console.error("What-If modal element not found!");
             return;
        }
        
        // Reset the form to current constraint values
        const currentConstraints = this.dataManager.getConfig(); 
        
        const consecutiveInput = document.getElementById('what-if-consecutive');
        const consecutiveValue = document.getElementById('what-if-consecutive-value');
        const dailyInput = document.getElementById('what-if-daily');
        const dailyValue = document.getElementById('what-if-daily-value');
        const weeklyMinInput = document.getElementById('what-if-weekly-min');
        const weeklyMinValue = document.getElementById('what-if-weekly-min-value');
        const weeklyMaxInput = document.getElementById('what-if-weekly-max');
        const weeklyMaxValue = document.getElementById('what-if-weekly-max-value');

        if (consecutiveInput) consecutiveInput.value = currentConstraints.maxConsecutiveClasses;
        if (consecutiveValue) consecutiveValue.textContent = currentConstraints.maxConsecutiveClasses;
        if (dailyInput) dailyInput.value = currentConstraints.maxClassesPerDay;
        if (dailyValue) dailyValue.textContent = currentConstraints.maxClassesPerDay;
        if (weeklyMinInput) weeklyMinInput.value = currentConstraints.minClassesPerWeek;
        if (weeklyMinValue) weeklyMinValue.textContent = currentConstraints.minClassesPerWeek;
        if (weeklyMaxInput) weeklyMaxInput.value = currentConstraints.maxClassesPerWeek;
        if (weeklyMaxValue) weeklyMaxValue.textContent = currentConstraints.maxClassesPerWeek;
        
        // Reset results display
        const resultsEl = document.getElementById('what-if-results');
        const statusEl = document.getElementById('what-if-status');
        const actionsEl = document.querySelector('.what-if-advanced-actions');

        if (resultsEl) resultsEl.style.display = 'none';
        if (statusEl) statusEl.innerHTML = '<div class="status-message">Adjust constraints and click "Simulate" to see potential impact</div>';
        if (actionsEl) actionsEl.style.display = 'none';
        
        // Setup sliders
        this.setupWhatIfSliders(); 
        
        // Show the modal (UIManager might handle this later)
        modal.style.display = 'block'; 
        
        // Start preloading the solver library in the background
        if (!this.whatIfState.isLibraryLoaded) { 
            this.whatIfState.isLibraryLoaded = true; 
            // Use the injected solverWrapper instance
            this.solverWrapper.initialize().then(() => {
                 console.log("Solver library preloaded successfully for What-If.");
            }).catch(error => {
                console.log('Solver preload failed, What-If will use fallback simulation:', error);
                // No need to reset isLibraryLoaded, fallback will be used automatically
            });
        }
    }

    // Method to set up slider interactions
    setupWhatIfSliders() {
        const consecutiveSlider = document.getElementById('what-if-consecutive');
        const consecutiveValue = document.getElementById('what-if-consecutive-value');
        const dailySlider = document.getElementById('what-if-daily');
        const dailyValue = document.getElementById('what-if-daily-value');
        const weeklyMinSlider = document.getElementById('what-if-weekly-min');
        const weeklyMinValue = document.getElementById('what-if-weekly-min-value');
        const weeklyMaxSlider = document.getElementById('what-if-weekly-max');
        const weeklyMaxValue = document.getElementById('what-if-weekly-max-value');

        // Use instance properties for handlers if needed, or ensure they are bound correctly
        const handleConsecutiveInput = () => { if(consecutiveValue) consecutiveValue.textContent = consecutiveSlider.value; };
        const handleDailyInput = () => { if(dailyValue) dailyValue.textContent = dailySlider.value; };
        const handleWeeklyMinInput = () => {
            if (weeklyMinSlider && weeklyMaxSlider && parseInt(weeklyMinSlider.value) > parseInt(weeklyMaxSlider.value)) {
                weeklyMaxSlider.value = weeklyMinSlider.value;
                if(weeklyMaxValue) weeklyMaxValue.textContent = weeklyMinSlider.value;
            }
            if(weeklyMinValue) weeklyMinValue.textContent = weeklyMinSlider.value;
        };
        const handleWeeklyMaxInput = () => {
             if (weeklyMaxSlider && weeklyMinSlider && parseInt(weeklyMaxSlider.value) < parseInt(weeklyMinSlider.value)) {
                 weeklyMinSlider.value = weeklyMaxSlider.value;
                 if(weeklyMinValue) weeklyMinValue.textContent = weeklyMaxSlider.value;
             }
             if(weeklyMaxValue) weeklyMaxValue.textContent = weeklyMaxSlider.value;
        };

        // Simple assignment assuming sliders exist and listeners are managed elsewhere or added once
        if (consecutiveSlider) consecutiveSlider.oninput = handleConsecutiveInput;
        if (dailySlider) dailySlider.oninput = handleDailyInput;
        if (weeklyMinSlider) weeklyMinSlider.oninput = handleWeeklyMinInput;
        if (weeklyMaxSlider) weeklyMaxSlider.oninput = handleWeeklyMaxInput;
    }

    // Public method to run the simulation
    async runWhatIfSimulation() {
        console.log('WhatIfController.runWhatIfSimulation called');
        // Ensure 'this' context is correct when calling the implementation
        return await this._runWhatIfSimulationImpl();
    }

    // Private implementation details
    async _runWhatIfSimulationImpl() {
        const resultContainer = document.getElementById('what-if-results');
        const statusContainer = document.getElementById('what-if-status');
        const actionContainer = document.querySelector('.what-if-advanced-actions');
        const retryButtonId = 'retry-simulation-btn';

        if (!resultContainer || !statusContainer) {
            console.error('What-If modal result/status containers not found');
            // Use injected uiManager
            this.uiManager.showMessage('error', 'Error: Could not find What-If display elements.');
            return;
        }

        try {
            console.log('Inside _runWhatIfSimulationImpl');
            
            // Show loading state using this.whatIfState
            this.whatIfState.isLoading = true;
            statusContainer.innerHTML = '<div class="loading-indicator">Running simulation...</div>';
            resultContainer.style.display = 'none';
            if (actionContainer) actionContainer.style.display = 'none';
            
            // Get current and new constraints using this.dataManager
            const currentConstraints = this.dataManager.getConfig();
            const consecutiveInput = document.getElementById('what-if-consecutive');
            const dailyInput = document.getElementById('what-if-daily');
            const weeklyMinInput = document.getElementById('what-if-weekly-min');
            const weeklyMaxInput = document.getElementById('what-if-weekly-max');

            const newConstraints = {
                maxConsecutiveClasses: parseInt(consecutiveInput?.value ?? currentConstraints.maxConsecutiveClasses),
                maxClassesPerDay: parseInt(dailyInput?.value ?? currentConstraints.maxClassesPerDay),
                minClassesPerWeek: parseInt(weeklyMinInput?.value ?? currentConstraints.minClassesPerWeek),
                maxClassesPerWeek: parseInt(weeklyMaxInput?.value ?? currentConstraints.maxClassesPerWeek)
            };
            
            if (newConstraints.minClassesPerWeek > newConstraints.maxClassesPerWeek) {
                throw new Error('Minimum weekly classes cannot be greater than maximum');
            }
            
            // Create a deep copy using this.dataManager
            const scheduleCopy = JSON.parse(JSON.stringify(this.dataManager.scheduleWeeks));
            
            const timeoutMs = 10000;
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Simulation timed out')), timeoutMs);
            });
            
            // Run the simulation using this.solverWrapper and this.dataManager
            const simulationPromise = this.solverWrapper.simulateConstraintChanges(
                scheduleCopy,
                currentConstraints,
                newConstraints,
                this.dataManager
            );
            
            const simulation = await Promise.race([simulationPromise, timeoutPromise]);
            
            // Use this.whatIfState
            this.whatIfState.lastSimulation = simulation;
            this.whatIfState.hasRun = true;
            
            // Call display method using this
            this.displayWhatIfResults(simulation, currentConstraints, newConstraints);
            
            if (actionContainer) actionContainer.style.display = 'flex';

        } catch (error) {
            console.error('What-if simulation error:', error);
            statusContainer.innerHTML = `
                <div class="error-message">
                    Simulation failed: ${error.message || 'Unknown error'}
                    <button id="${retryButtonId}" class="btn">Retry</button>
                </div>
            `;
            
            const retryBtn = document.getElementById(retryButtonId);
            if (retryBtn) {
                 // Use arrow function to preserve 'this' when calling runWhatIfSimulation
                 retryBtn.onclick = () => this.runWhatIfSimulation();
            }

        } finally {
            // Use this.whatIfState
            this.whatIfState.isLoading = false;
        }
    }

    // Method to display simulation results
    displayWhatIfResults(simulation, currentConstraints, newConstraints) {
        const resultContainer = document.getElementById('what-if-results');
        const statusContainer = document.getElementById('what-if-status');
        if (!resultContainer || !statusContainer) return;

        // --- Show Source & Status Message ---
        let sourceMessage = '';
        if (simulation.source && simulation.source !== 'solver') {
            let fallbackReason = 'an unknown issue';
            if (simulation.source.includes('fallback_init_error')) fallbackReason = 'solver initialization failed';
            else if (simulation.source.includes('fallback_solver_missing')) fallbackReason = 'solver was missing after initialization';
            else if (simulation.source.includes('fallback_timeout')) fallbackReason = 'solver timed out';
            else if (simulation.source.includes('fallback_solver_error')) fallbackReason = 'solver reported an error';
            else if (simulation.source.includes('fallback_runtime_error')) fallbackReason = 'an unexpected error occurred during simulation';
            else if (simulation.source.includes('basicSimulation')) fallbackReason = 'basic simulation was used';

            sourceMessage = `<div class="status-info"><i>(Note: Analysis based on fallback simulation because ${fallbackReason}.)</i></div>`;
        }

        let statusMessage = '';
        if (simulation.feasible) {
            statusMessage = `<div class="status-success">✓ Schedule appears to be feasible with the new constraints</div>`;
        } else {
            if (simulation.source === 'solver_infeasible_fallback_analysis') {
                 statusMessage = `<div class="status-error">✗ Solver determined the schedule is <strong>infeasible</strong> with these constraints.</div>` +
                                 `<div class="status-info"><i>Showing ${simulation.invalidPlacements?.length ?? 0} potential conflicts found by basic analysis:</i></div>`;
            } else {
                 statusMessage = `<div class="status-warning">⚠ These constraints would cause ${simulation.invalidPlacements?.length ?? 0} placement conflicts (based on fallback analysis)</div>`;
            }
        }
        
        statusContainer.innerHTML = sourceMessage + statusMessage;
        
        // Helper function to format date (could be moved to a utility module)
        const formatDisplayDate = (dateStr) => {
            try {
                 const date = new Date(dateStr);
                 // Add timezone offset to potentially correct for UTC interpretation if needed
                 // date.setMinutes(date.getMinutes() + date.getTimezoneOffset()); 
                 return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
            } catch (e) { return dateStr; } // Fallback
        };
        
        // Build results content
        let resultsHtml = `
            <h4>Impact Analysis</h4>
            <table class="impact-table">
                <tr><th>Constraint</th><th>Current</th><th>Simulated</th></tr>
                <tr><td>Max Consecutive Classes</td><td>${currentConstraints.maxConsecutiveClasses}</td><td>${newConstraints.maxConsecutiveClasses}</td></tr>
                <tr><td>Max Classes Per Day</td><td>${currentConstraints.maxClassesPerDay}</td><td>${newConstraints.maxClassesPerDay}</td></tr>
                <tr><td>Weekly Class Target</td><td>${currentConstraints.minClassesPerWeek}-${currentConstraints.maxClassesPerWeek}</td><td>${newConstraints.minClassesPerWeek}-${newConstraints.maxClassesPerWeek}</td></tr>
                <tr><td>Total Placements</td><td>${simulation.currentClassCount ?? 'N/A'}</td><td>${simulation.simulatedClassCount ?? 'N/A'}</td></tr>
            </table>
        `;
        
        // Show affected placements if any
        const invalidPlacements = simulation.invalidPlacements || [];
        if (invalidPlacements.length > 0) {
            resultsHtml += `<h4>Placements Removed by Solver</h4><div class="affected-placements"><ul>`;
            const reasons = {};
            invalidPlacements.forEach(p => { reasons[p.reason] = (reasons[p.reason] || []); reasons[p.reason].push(p); });
            Object.entries(reasons).forEach(([reason, placements]) => {
                resultsHtml += `<li><strong>${reason}</strong>: ${placements.length} placements</li>`;
                if (placements.length > 0) {
                    resultsHtml += '<ul>';
                    placements.slice(0, 3).forEach(p => { resultsHtml += `<li>${p.className} on ${formatDisplayDate(p.dateStr)} period ${p.period}</li>`; });
                    if (placements.length > 3) { resultsHtml += `<li>...and ${placements.length - 3} more</li>`; }
                    resultsHtml += '</ul>';
                }
            });
            resultsHtml += `</ul></div>`;
        }
        
        // Show the feasible schedule if it exists and is not empty
        if (simulation.feasibleSchedule && Object.keys(simulation.feasibleSchedule).length > 0) {
            resultsHtml += `<h4>Proposed Feasible Schedule (${simulation.simulatedClassCount} placements)</h4><div class="feasible-schedule-list"><ul>`;
            const sortedWeeks = Object.keys(simulation.feasibleSchedule).sort((a, b) => parseInt(a) - parseInt(b));
            sortedWeeks.forEach(weekOffset => {
                const weekData = simulation.feasibleSchedule[weekOffset];
                const sortedDates = Object.keys(weekData).sort();
                sortedDates.forEach(dateStr => {
                    const dayData = weekData[dateStr];
                    const sortedPeriods = Object.keys(dayData).sort((a, b) => parseInt(a) - parseInt(b));
                    sortedPeriods.forEach(period => { resultsHtml += `<li>${dayData[period]} on ${formatDisplayDate(dateStr)} period ${period}</li>`; });
                });
            });
            resultsHtml += `</ul></div>`;
        }

        resultContainer.innerHTML = resultsHtml;
        resultContainer.style.display = 'block';
    }

    // Method to apply the results of the What-If simulation
    applyWhatIfResults() {
        // Get new constraint values from the modal inputs
        const consecutiveInput = document.getElementById('what-if-consecutive');
        const dailyInput = document.getElementById('what-if-daily');
        const weeklyMinInput = document.getElementById('what-if-weekly-min');
        const weeklyMaxInput = document.getElementById('what-if-weekly-max');
        
        // Use current config as fallback if inputs are missing
        const currentConfig = this.dataManager.getConfig();
        const newConstraints = {
            maxConsecutiveClasses: parseInt(consecutiveInput?.value ?? currentConfig.maxConsecutiveClasses),
            maxClassesPerDay: parseInt(dailyInput?.value ?? currentConfig.maxClassesPerDay),
            minClassesPerWeek: parseInt(weeklyMinInput?.value ?? currentConfig.minClassesPerWeek),
            maxClassesPerWeek: parseInt(weeklyMaxInput?.value ?? currentConfig.maxClassesPerWeek)
        };
        
        // If the last simulation showed invalid placements, ask for confirmation
        // Use this.whatIfState
        const invalidPlacements = this.whatIfState.lastSimulation?.invalidPlacements || [];
        if (invalidPlacements.length > 0) {
            // Build details HTML for the confirmation dialog
            let detailsHtml = `<p>The following ${invalidPlacements.length} placements will be removed:</p><ul>`;
            invalidPlacements.slice(0, 5).forEach(p => {
                 // Add safety check for p.dateStr
                 const dateStr = p.dateStr || 'Unknown Date';
                 let formattedDate = dateStr;
                 try {
                      const date = new Date(dateStr);
                      formattedDate = date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
                 } catch (e) { /* Keep original string if invalid */ }
                 detailsHtml += `<li>${p.className} on ${formattedDate} period ${p.period}</li>`;
            });
            if (invalidPlacements.length > 5) detailsHtml += `<li>...and ${invalidPlacements.length - 5} more</li>`;
            detailsHtml += '</ul>';
            
            // Use the ConfigController's dialog utility via this.configController
            this.configController.showConfirmDialog({
                title: 'Apply Constraint Changes',
                message: 'Changing these constraints will invalidate existing placements. What would you like to do?',
                details: detailsHtml,
                buttons: [
                    {
                        text: 'Remove invalid placements',
                        class: 'btn',
                        // Use arrow function to preserve 'this' context
                        action: () => {
                            this.applyConstraintChangesWithRemovals(newConstraints, invalidPlacements);
                        }
                    },
                    { text: 'Cancel', class: 'btn btn-secondary' }
                ]
            });
        } else {
            // No invalid placements, apply directly using this
            this.applyConstraintChangesWithRemovals(newConstraints, []);
        }
    }

    // Private method to apply changes (with or without removals)
    applyConstraintChangesWithRemovals(newConstraints, invalidPlacements) {
        // Use this.dataManager
        if (invalidPlacements && invalidPlacements.length > 0) {
            const currentWeek = this.dataManager.currentWeekOffset;
            
            invalidPlacements.forEach(placement => {
                if (placement.weekOffset !== undefined) {
                     this.dataManager.currentWeekOffset = placement.weekOffset;
                     this.dataManager.unscheduleClass(placement.dateStr, placement.period);
                } else {
                     console.warn("Invalid placement data missing weekOffset:", placement);
                }
            });
            
            this.dataManager.currentWeekOffset = currentWeek;
        }
        
        // Use this.dataManager
        this.dataManager.updateConfig(newConstraints);
        
        const modal = document.getElementById('what-if-modal');
        if (modal) modal.style.display = 'none'; // UIManager hide later?
        
        // Use this.uiManager and this.scheduler
        // TODO: Replace direct calls with event emissions
        // Pass scheduler, assume teacherModeActive is false after applying What-If
        this.uiManager.renderScheduleGrid(this.scheduler, false);
        this.uiManager.renderUnscheduledClasses(); // No args needed
        this.uiManager.updateProgress();
        this.uiManager.updateConstraintStatus(this.scheduler);
        
        // TODO: Replace direct DOM check with event or controller interaction
        // Need access to analyticsController instance if we want to update it here
        if (document.getElementById('analytics-modal')?.style.display === 'block' && this.analyticsController) {
             console.log("Attempting to update analytics view after What-If apply.");
             this.analyticsController.updateAnalyticsView();
        } else if (document.getElementById('analytics-modal')?.style.display === 'block') {
             console.warn("Analytics modal open, but analyticsController instance not available to update view.");
        }
        
        // Use this.uiManager
        if (invalidPlacements && invalidPlacements.length > 0) {
            this.uiManager.showMessage('warning', `Constraints updated. ${invalidPlacements.length} affected classes have been unscheduled.`);
        } else {
            this.uiManager.showMessage('success', 'Constraints updated successfully.');
        }
    }
}

export default WhatIfController;