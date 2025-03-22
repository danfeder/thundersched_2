// Main application logic

document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM fully loaded');
    const dataManager = new DataManager();
    const scheduler = new Scheduler(dataManager);
    
    // Make dataManager and scheduler available globally
    window.dataManager = dataManager;
    window.scheduler = scheduler;
    
    // Set up direct event handlers for What-If functionality after a short delay
    // to ensure all other scripts have run
    setTimeout(function() {
        console.log('Setting up direct What-If button handlers...');
        
        const simulateBtn = document.getElementById('what-if-simulate-btn');
        if (simulateBtn) {
            console.log('Adding direct click handler for simulation button');
            simulateBtn.addEventListener('click', function(event) {
                console.log('Simulate button clicked (direct handler from app.js)');
                if (typeof window.runWhatIfSimulation === 'function') {
                    window.runWhatIfSimulation();
                }
                // Prevent event bubbling
                event.stopPropagation();
            }, true); // Use capture to ensure this runs first
        } else {
            console.warn('Simulation button not found in DOM yet');
        }
    }, 2000); // Wait 2 seconds to ensure everything is loaded
    
    // Add debugging helper for console
    window.debugScheduler = {
        inspectSavedSchedules: function() {
            console.log('Saved schedules in dataManager:', dataManager.savedSchedules);
            
            // Try to read directly from localStorage
            try {
                const raw = localStorage.getItem('cooking-saved-schedules');
                console.log('Raw saved schedules from localStorage:', raw);
                
                if (raw) {
                    const parsed = JSON.parse(raw);
                    console.log('Parsed saved schedules from localStorage:', parsed);
                } else {
                    console.log('No saved schedules found in localStorage');
                }
            } catch (e) {
                console.error('Error reading from localStorage:', e);
            }
            
            return 'Check console for saved schedules information';
        },
        
        // Add a new debug function to fix a specific saved schedule
        fixOneDay: function(scheduleName) {
            try {
                // Find the schedule by name
                const schedule = dataManager.savedSchedules.find(s => s.name === scheduleName);
                if (!schedule) {
                    console.error(`Schedule "${scheduleName}" not found`);
                    return `Schedule "${scheduleName}" not found`;
                }
                
                console.log(`Fixing schedule "${scheduleName}"`);
                
                // Check for each date in the schedule and shift by one day
                Object.keys(schedule.scheduleData).forEach(weekOffset => {
                    const oldDates = Object.keys(schedule.scheduleData[weekOffset]);
                    const newWeekData = {};
                    
                    oldDates.forEach(oldDateStr => {
                        // Parse the date and subtract one day
                        const [year, month, day] = oldDateStr.split('-').map(num => parseInt(num, 10));
                        const oldDate = new Date(year, month - 1, day);
                        oldDate.setDate(oldDate.getDate() - 1);
                        
                        // Format the new date
                        const newDateStr = dataManager.getFormattedDate(oldDate);
                        console.log(`  Shifting date: ${oldDateStr} -> ${newDateStr}`);
                        
                        // Copy the data to the new date
                        newWeekData[newDateStr] = schedule.scheduleData[weekOffset][oldDateStr];
                    });
                    
                    // Replace the data in this week
                    schedule.scheduleData[weekOffset] = newWeekData;
                });
                
                // Find the start date from the first day
                if (Object.keys(schedule.scheduleData).length > 0) {
                    const firstWeekOffset = Object.keys(schedule.scheduleData).sort()[0];
                    if (firstWeekOffset) {
                        const firstWeekDates = Object.keys(schedule.scheduleData[firstWeekOffset]).sort();
                        if (firstWeekDates.length > 0) {
                            const [year, month, day] = firstWeekDates[0].split('-').map(num => parseInt(num, 10));
                            const firstDate = new Date(year, month - 1, day);
                            const monday = dataManager.getMondayOfWeek(firstDate);
                            schedule.startDate = dataManager.getFormattedDate(monday);
                            console.log(`  Set startDate to ${schedule.startDate}`);
                        }
                    }
                }
                
                // Save back to localStorage
                localStorage.setItem('cooking-saved-schedules', JSON.stringify(dataManager.savedSchedules));
                console.log(`Schedule "${scheduleName}" fixed and saved`);
                
                return `Schedule "${scheduleName}" fixed. Please reload this page to see the changes.`;
            } catch (e) {
                console.error('Error fixing schedule:', e);
                return 'Error fixing schedule: ' + e.message;
            }
        }
    };
    
    // Add helper methods for data persistence
    window.saveScheduleToLocalStorage = function() {
        localStorage.setItem('cooking-class-schedule', JSON.stringify(dataManager.scheduleWeeks));
        console.log("Schedule explicitly saved to localStorage");
    };
    
    window.saveTeacherUnavailabilityToLocalStorage = function() {
        localStorage.setItem('teacher-unavailability', JSON.stringify(dataManager.teacherUnavailability));
        console.log("Teacher unavailability explicitly saved to localStorage");
    };
    
    // Make render functions available globally
    window.renderUnscheduledClasses = renderUnscheduledClasses;
    window.updateProgress = updateProgress;
    window.showMessage = showMessage;
    
    // Global state for teacher mode
    let teacherModeActive = false;
    
    // Load class data from CSV
    await dataManager.loadClassesFromCSV();
    
    // Set up UI
    initializeUI();
    
    // Render initial state
    renderScheduleGrid();
    renderUnscheduledClasses();
    updateProgress();
    updateConstraintStatus();
    
    // Show welcome message
    showMessage('info', 'Welcome! Click on a class to see available slots, then drag and drop to schedule it.', 6000);
    
    // Add event listeners for buttons
    document.getElementById('suggest-next-btn').addEventListener('click', suggestNextClass);
    document.getElementById('export-btn').addEventListener('click', exportSchedule);
    document.getElementById('help-btn').addEventListener('click', showHelp);
    document.getElementById('reset-btn').addEventListener('click', resetSchedule);
    document.getElementById('config-btn').addEventListener('click', showConfigModal);
    document.getElementById('save-schedule-btn').addEventListener('click', showSaveScheduleModal);
    document.getElementById('load-schedule-btn').addEventListener('click', showLoadScheduleModal);
    document.getElementById('analytics-btn').addEventListener('click', showAnalyticsModal);
    
    // Let's expose all the what-if analysis functions to the global scope
    // so they can be accessed by the inline script
    
    // Expose the simulation and other functions to the global scope
    console.log('Exposing What-If Analysis functions to global scope');
    
    // Make sure this is called AFTER all the functions are defined
    document.addEventListener('DOMContentLoaded', function() {
        // This will happen after the entire file is parsed and executed
        console.log('Setting up What-If Analysis global object');
        
        // Add explicit function references
        window.whatIfAnalysis = {
            showWhatIfAnalysis: window.showWhatIfAnalysis,
            runWhatIfSimulation: window.runWhatIfSimulation, // Reference the global function
            displayWhatIfResults: displayWhatIfResults,
            applyWhatIfResults: window.applyWhatIfResults
        };
        
        console.log('What-If Analysis functions exposed:', Object.keys(window.whatIfAnalysis));
    });
    
    // Define legacy object for backward compatibility 
    window.whatIfAnalysis = {
        runWhatIfSimulation: function() {
            console.log('Running What-If simulation via legacy global object');
            // Call the proper implementation with async/await support
            if (typeof window.runWhatIfSimulation === 'function') {
                window.runWhatIfSimulation();
                return;
            }
            
            // Fallback if the main function isn't available
            const resultContainer = document.getElementById('what-if-results');
            const statusContainer = document.getElementById('what-if-status');
            const actionContainer = document.querySelector('.what-if-advanced-actions');
            
            // Show loading state
            statusContainer.innerHTML = '<div class="loading-indicator">Running simulation (legacy)...</div>';
            resultContainer.style.display = 'none';
            if (actionContainer) actionContainer.style.display = 'none';
            
            try {
                // Get current and new constraints
                const currentConstraints = dataManager.getConfig();
                const newConstraints = {
                    maxConsecutiveClasses: parseInt(document.getElementById('what-if-consecutive').value),
                    maxClassesPerDay: parseInt(document.getElementById('what-if-daily').value),
                    minClassesPerWeek: parseInt(document.getElementById('what-if-weekly-min').value),
                    maxClassesPerWeek: parseInt(document.getElementById('what-if-weekly-max').value)
                };
                
                // Create a deep copy of schedule data
                const scheduleCopy = JSON.parse(JSON.stringify(dataManager.scheduleWeeks));
                
                // Run the simulation - don't use await here as this is not in an async function
                // Use promise chaining instead
                ConstraintSolverWrapper.simulateConstraintChanges(
                    scheduleCopy, 
                    currentConstraints, 
                    newConstraints
                ).then(function(simulation) {
                    whatIfState.lastSimulation = simulation;
                    whatIfState.hasRun = true;
                    
                    // Display results
                    displayWhatIfResults(simulation, currentConstraints, newConstraints);
                    
                    // Show advanced actions
                    actionContainer.style.display = 'flex';
                }).catch(function(error) {
                    console.error('What-if simulation error (legacy):', error);
                    statusContainer.innerHTML = `
                        <div class="error-message">
                            Simulation failed: ${error.message || 'Unknown error'}
                            <button id="retry-simulation-btn" class="btn">Retry</button>
                        </div>
                    `;
                    
                    // Add retry handler
                    document.getElementById('retry-simulation-btn').addEventListener('click', window.runWhatIfSimulation);
                }).finally(function() {
                    whatIfState.isLoading = false;
                });
                
                // Return early since we're handling results in the promise chain
                return;
            } catch (error) {
                console.error('What-if simulation error:', error);
                statusContainer.innerHTML = `
                    <div class="error-message">
                        Simulation failed: ${error.message || 'Unknown error'}
                        <button id="retry-simulation-btn" class="btn">Retry</button>
                    </div>
                `;
                
                // Add retry handler
                document.getElementById('retry-simulation-btn').addEventListener('click', window.whatIfAnalysis.runWhatIfSimulation);
            } finally {
                whatIfState.isLoading = false;
            }
        },
        applyWhatIfResults: function() {
            console.log('Applying What-If results via global object');
            
            // Get new constraint values
            const newConstraints = {
                maxConsecutiveClasses: parseInt(document.getElementById('what-if-consecutive').value),
                maxClassesPerDay: parseInt(document.getElementById('what-if-daily').value),
                minClassesPerWeek: parseInt(document.getElementById('what-if-weekly-min').value),
                maxClassesPerWeek: parseInt(document.getElementById('what-if-weekly-max').value)
            };
            
            // If we have invalid placements, ask for confirmation
            if (whatIfState.lastSimulation && whatIfState.lastSimulation.invalidPlacements.length > 0) {
                if (confirm(`Applying these constraints will cause ${whatIfState.lastSimulation.invalidPlacements.length} invalid placements. Do you want to continue?`)) {
                    applyConstraintChangesWithRemovals(newConstraints, whatIfState.lastSimulation.invalidPlacements);
                }
            } else {
                // No invalid placements, apply directly
                applyConstraintChangesWithRemovals(newConstraints, []);
            }
        },
        setupWhatIfSliders: window.setupWhatIfSliders
    };
    
    console.log('What-If Analysis functions exposed:', Object.keys(window.whatIfAnalysis));
    
    // This event listener was causing duplicate submissions
    // See the setTimeout below that adds onsubmit handler
    
    // Teacher mode toggle
    const teacherModeToggle = document.getElementById('teacher-mode');
    teacherModeToggle.addEventListener('change', toggleTeacherMode);
    
    // Week navigation
    document.getElementById('prev-week-btn').addEventListener('click', () => navigateWeek(-1));
    document.getElementById('next-week-btn').addEventListener('click', () => navigateWeek(1));
    
    // Date picker change event
    const datePicker = document.getElementById('start-date');
    datePicker.addEventListener('change', setStartDate);
    
    // Initialize date picker with default start date
    const startDatePicker = document.getElementById('start-date');
    const formattedStartDate = dataManager.getFormattedDate(dataManager.scheduleStartDate);
    console.log("Setting date picker to:", formattedStartDate);
    startDatePicker.value = formattedStartDate;
    
    // Display current week
    updateCurrentWeekDisplay();
    
    // Config form submission
    document.getElementById('config-form').addEventListener('submit', function(e) {
        e.preventDefault();
        handleConfigFormSubmit();
    });
    
    // Reset config button
    document.getElementById('reset-config-btn').addEventListener('click', resetConfigForm);
    
    // Modal close buttons
    document.querySelectorAll('.modal .close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Cancel buttons in modals
    document.querySelectorAll('.modal .cancel-btn').forEach(cancelBtn => {
        cancelBtn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        document.querySelectorAll('.modal').forEach(modal => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Ensure save schedule form submission is working
    // This is redundant but ensures the event listener is added
    setTimeout(() => {
        const saveForm = document.getElementById('save-schedule-form');
        if (saveForm) {
            saveForm.onsubmit = handleSaveScheduleSubmit;
            console.log('Added onsubmit handler to save-schedule-form');
        }
    }, 1000);
    
    function initializeUI() {
        const scheduleGrid = document.getElementById('schedule-grid');
        scheduleGrid.innerHTML = ''; // Clear the grid
        
        // Get dates for the current week
        const weekDates = dataManager.getCurrentWeekDates();
        
        // Debug current week dates
        console.log("initializing UI with dates:", weekDates.map(d => ({
            date: d.toDateString(),
            day: d.getDay(),
            dayName: dataManager.getDayFromDate(d),
            formatted: dataManager.getFormattedDate(d)
        })));
        
        // Add empty cell in top-left corner
        scheduleGrid.appendChild(createElementWithClass('div', 'grid-header', ''));
        
        // Add date headers
        weekDates.forEach(date => {
            const dayName = dataManager.getDayFromDate(date);
            // Skip if it's a weekend day
            if (dayName === 'Saturday' || dayName === 'Sunday') return;
            
            const dateStr = dataManager.getFormattedDate(date);
            
            // Format as "Mon, Mar 17"
            const options = { weekday: 'short', month: 'short', day: 'numeric' };
            const formattedDate = date.toLocaleDateString(undefined, options);
            
            const headerCell = createElementWithClass('div', 'grid-header');
            headerCell.innerHTML = formattedDate;
            headerCell.dataset.dayname = dayName; // Add data attribute for debugging
            scheduleGrid.appendChild(headerCell);
        });
        
        // Add period rows with labels
        for (let period = 1; period <= 8; period++) {
            // Add period label
            scheduleGrid.appendChild(createElementWithClass('div', 'period-label', `Period ${period}`));
            
            // Add cells for each day in this period
            weekDates.forEach(date => {
                const dayName = dataManager.getDayFromDate(date);
                // Skip weekends
                if (dayName === 'Saturday' || dayName === 'Sunday') return;
                
                const dateStr = dataManager.getFormattedDate(date);
                const cell = createElementWithClass('div', 'grid-cell');
                cell.dataset.date = dateStr;
                cell.dataset.period = period;
                cell.dataset.dayname = dayName; // Add dayname for debugging
                
                // Add teacher mode click handler
                cell.addEventListener('click', handleCellClick);
                
                // Add drag handlers for class scheduling
                cell.addEventListener('dragover', handleDragOver);
                cell.addEventListener('dragleave', handleDragLeave);
                cell.addEventListener('drop', handleDrop);
                
                scheduleGrid.appendChild(cell);
            });
        }
    }
    
    function renderScheduleGrid() {
        // Reinitialize UI to update date headers
        initializeUI();
        
        const schedule = dataManager.getSchedule();
        
        // Add scheduled classes to grid
        Object.entries(schedule).forEach(([dateStr, periods]) => {
            Object.entries(periods).forEach(([period, className]) => {
                if (className) {
                    const cell = document.querySelector(`.grid-cell[data-date="${dateStr}"][data-period="${period}"]`);
                    if (cell) {
                        const classElement = createElementWithClass('div', 'scheduled-class', className);
                        
                        // Make scheduled classes draggable
                        classElement.draggable = true;
                        classElement.dataset.className = className;
                        classElement.dataset.originalDate = dateStr;
                        classElement.dataset.originalPeriod = period;
                        
                        // Add drag and click handlers
                        classElement.addEventListener('dragstart', handleScheduledClassDragStart);
                        classElement.addEventListener('dragend', handleDragEnd);
                        classElement.addEventListener('click', (e) => {
                            e.stopPropagation(); // Prevent cell click
                            highlightAvailableSlots(className);
                        });
                        
                        // Add hover preview functionality for scheduled classes too
                        classElement.addEventListener('mouseenter', () => {
                            // Add a short delay before showing preview
                            classElement.hoverTimer = setTimeout(() => {
                                highlightAvailableSlots(className);
                                classElement.classList.add('hovering');
                            }, 200); // 200ms delay for intentional hovering
                        });
                        
                        classElement.addEventListener('mouseleave', () => {
                            // Clear the timer if mouse leaves before the delay completes
                            if (classElement.hoverTimer) {
                                clearTimeout(classElement.hoverTimer);
                            }
                            
                            // Only clear highlights if we're not currently dragging
                            if (!document.querySelector('.dragging')) {
                                clearHighlights();
                            }
                            classElement.classList.remove('hovering');
                        });
                        
                        // Add double-click to unschedule
                        classElement.addEventListener('dblclick', () => {
                            if (confirm(`Remove ${className} from this time slot?`)) {
                                dataManager.unscheduleClass(dateStr, period);
                                
                                // Explicitly save to localStorage to ensure persistence
                                if (window.saveScheduleToLocalStorage) {
                                    window.saveScheduleToLocalStorage();
                                }
                                
                                renderScheduleGrid();
                                renderUnscheduledClasses();
                                updateProgress();
                            }
                        });
                        
                        // Add tooltip for instructions
                        classElement.title = "Drag to reschedule or double-click to remove";
                        
                        cell.appendChild(classElement);
                        cell.classList.add('scheduled');
                    }
                }
            });
        });
        
        // Mark teacher unavailable periods
        markTeacherUnavailabilityPeriods();
        
        // Apply teacher mode active class if in teacher mode
        if (teacherModeActive) {
            document.querySelectorAll('.grid-cell:not(.scheduled)').forEach(cell => {
                cell.classList.add('teacher-mode-active');
            });
        }
        
        // Update constraint status indicators
        updateConstraintStatus();
    }
    
    function renderUnscheduledClasses() {
        const unscheduledClassesContainer = document.getElementById('unscheduled-classes');
        unscheduledClassesContainer.innerHTML = '';
        
        const unscheduledClasses = dataManager.getUnscheduledClasses();
        
        unscheduledClasses.forEach(classInfo => {
            const classElement = createElementWithClass('div', 'class-item', classInfo.name);
            classElement.draggable = true;
            classElement.dataset.className = classInfo.name;
            
            classElement.addEventListener('dragstart', handleDragStart);
            classElement.addEventListener('dragend', handleDragEnd);
            classElement.addEventListener('click', () => highlightAvailableSlots(classInfo.name));
            
            // Add hover preview functionality
            classElement.addEventListener('mouseenter', () => {
                // Add a short delay before showing preview to avoid unwanted flashes
                classElement.hoverTimer = setTimeout(() => {
                    highlightAvailableSlots(classInfo.name);
                    classElement.classList.add('hovering');
                }, 200); // 200ms delay for intentional hovering
            });
            
            classElement.addEventListener('mouseleave', () => {
                // Clear the timer if mouse leaves before the delay completes
                if (classElement.hoverTimer) {
                    clearTimeout(classElement.hoverTimer);
                }
                
                // Only clear highlights if we're not currently dragging
                if (!document.querySelector('.dragging')) {
                    clearHighlights();
                }
                classElement.classList.remove('hovering');
            });
            
            unscheduledClassesContainer.appendChild(classElement);
        });
    }
    
    function highlightAvailableSlots(className) {
        // Store teacher unavailability markers before clearing
        const teacherUnavailableCells = new Map();
        document.querySelectorAll('.grid-cell.teacher-unavailable').forEach(cell => {
            const date = cell.dataset.date;
            const period = cell.dataset.period;
            teacherUnavailableCells.set(`${date}-${period}`, cell);
        });
        
        // Clear previous highlights but maintain teacher-unavailable class
        document.querySelectorAll('.grid-cell').forEach(cell => {
            cell.classList.remove('available');
            cell.classList.remove('conflict');
            // Do NOT remove the teacher-unavailable class here
        });
        
        // Get current week dates
        const weekDates = dataManager.getCurrentWeekDates();
        
        // Get the class info to check conflicts
        const classInfo = dataManager.getClasses().find(c => c.name === className);
        if (!classInfo) return;
        
        // Process all cells on the grid
        weekDates.forEach(date => {
            const dateStr = dataManager.getFormattedDate(date);
            const dayOfWeek = dataManager.getDayFromDate(date);
            
            for (let period = 1; period <= 8; period++) {
                const cell = document.querySelector(`.grid-cell[data-date="${dateStr}"][data-period="${period}"]`);
                if (!cell) continue;
                
                // Skip cells that already have classes scheduled
                if (cell.classList.contains('scheduled')) continue;
                
                // First check for class-specific conflicts (these always take priority and show as red)
                if (classInfo.conflicts[dayOfWeek] && 
                    classInfo.conflicts[dayOfWeek].includes(Number(period))) {
                    cell.classList.add('conflict');
                    cell.title = `Conflict: ${className} cannot be scheduled during this period.`;
                    continue;
                }
                
                // Check for other constraints (but teacher unavailability does not make a cell invalid now)
                const validation = scheduler.isValidPlacement(className, dateStr, period);
                
                if (validation.valid) {
                    // No conflicts, mark as available - even if teacher is unavailable
                    cell.classList.add('available');
                    
                    // Set appropriate tooltip based on teacher availability
                    if (dataManager.isTeacherUnavailable(dateStr, period)) {
                        cell.title = `Available with confirmation - Teacher is marked as unavailable during this period.`;
                    } else {
                        cell.title = `Available slot for ${className}`;
                    }
                } else {
                    // Not valid for other reasons like consecutive classes or daily limits
                    cell.classList.add('conflict');
                    cell.title = validation.reason || `Conflict: This slot is not available for ${className}.`;
                }
                
                // Re-apply teacher unavailability class if it was there before
                // (Should be redundant since we're not removing it, but just to be safe)
                if (dataManager.isTeacherUnavailable(dateStr, period)) {
                    cell.classList.add('teacher-unavailable');
                }
            }
        });
    }
    
    function handleDragStart(e) {
        const className = e.target.dataset.className;
        e.dataTransfer.setData('text/plain', className);
        e.dataTransfer.setData('source', 'unscheduled');
        e.target.classList.add('dragging');
        
        // Add dragging-active class to the schedule grid to dim other classes
        document.getElementById('schedule-grid').classList.add('dragging-active');
        
        // Immediately show available slots and conflicts when dragging starts
        highlightAvailableSlots(className);
    }
    
    function handleScheduledClassDragStart(e) {
        const className = e.target.dataset.className;
        const originalDate = e.target.dataset.originalDate;
        const originalPeriod = e.target.dataset.originalPeriod;
        
        e.dataTransfer.setData('text/plain', className);
        e.dataTransfer.setData('source', 'scheduled');
        e.dataTransfer.setData('originalDate', originalDate);
        e.dataTransfer.setData('originalPeriod', originalPeriod);
        e.target.classList.add('dragging');
        
        // Add dragging-active class to the schedule grid to dim other classes
        document.getElementById('schedule-grid').classList.add('dragging-active');
        
        // Show available slots for this class (like when it's clicked)
        highlightAvailableSlots(className);
    }
    
    function handleDragOver(e) {
        e.preventDefault();
        
        // Add dragover class for visual feedback on both available and conflict cells
        const cell = e.target.closest('.grid-cell');
        if (cell) {
            if (cell.classList.contains('available') || cell.classList.contains('conflict')) {
                cell.classList.add('dragover');
            }
        }
    }
    
    function handleDragLeave(e) {
        // Remove dragover class when leaving a cell
        const cell = e.target.closest('.grid-cell');
        if (cell) {
            cell.classList.remove('dragover');
        }
    }
    
    function handleDragEnd(e) {
        // Remove the dragging class
        e.target.classList.remove('dragging');
        
        // Remove dragging-active class from schedule grid
        document.getElementById('schedule-grid').classList.remove('dragging-active');
        
        // Clear any dragover classes
        document.querySelectorAll('.dragover').forEach(el => {
            el.classList.remove('dragover');
        });
        
        // Clear highlighted cells when drag is canceled (not dropped)
        clearHighlights();
    }
    
    function handleDrop(e) {
        e.preventDefault();
        const className = e.dataTransfer.getData('text/plain');
        const source = e.dataTransfer.getData('source');
        const dateStr = e.target.dataset.date || e.target.parentElement.dataset.date;
        const period = e.target.dataset.period || e.target.parentElement.dataset.period;
        
        // Remove dragging class
        document.querySelector('.dragging')?.classList.remove('dragging');
        
        // Remove dragging-active class from schedule grid
        document.getElementById('schedule-grid').classList.remove('dragging-active');
        
        // Remove any dragover classes
        document.querySelectorAll('.dragover').forEach(el => el.classList.remove('dragover'));
        
        if (!dateStr || !period) return;
        
        // If this is a scheduled class being moved, remove it from its original position first
        if (source === 'scheduled') {
            const originalDate = e.dataTransfer.getData('originalDate');
            const originalPeriod = e.dataTransfer.getData('originalPeriod');
            
            // If dropping on same position, do nothing
            if (originalDate === dateStr && originalPeriod === period) {
                clearHighlights();
                return;
            }
            
            // Remove from original position
            dataManager.unscheduleClass(originalDate, originalPeriod);
            
            // Explicitly save to localStorage after unscheduling from original position
            if (window.saveScheduleToLocalStorage) {
                window.saveScheduleToLocalStorage();
            }
        }
        
        // First check if there's a class-specific conflict (these always take priority)
        const classInfo = dataManager.getClasses().find(c => c.name === className);
        if (classInfo) {
            // Get the day of week for this date
            const [year, month, day] = dateStr.split('-').map(num => parseInt(num, 10));
            const date = new Date(year, month - 1, day);
            const dayOfWeek = dataManager.getDayFromDate(date);
            
            // Check for class conflict directly - this is a hard constraint that cannot be overridden
            if (classInfo.conflicts[dayOfWeek] && 
                classInfo.conflicts[dayOfWeek].includes(Number(period))) {
                
                // Show error message
                showMessage('error', `Cannot place ${className} here: Class has a conflict during this period.`);
                
                // If this was a scheduled class that we removed, put it back
                if (source === 'scheduled') {
                    const originalDate = e.dataTransfer.getData('originalDate');
                    const originalPeriod = e.dataTransfer.getData('originalPeriod');
                    dataManager.scheduleClass(className, originalDate, originalPeriod);
                    renderScheduleGrid();
                }
                
                return; // Don't proceed with placement
            }
        }
        
        // ONLY THEN check for teacher unavailability (which can be overridden)
        if (dataManager.isTeacherUnavailable(dateStr, period)) {
            const confirmOverride = confirm('Teacher is unavailable during this period. Are you sure you want to schedule a class here?');
            if (!confirmOverride) {
                // If user cancels, put the class back if it was scheduled
                if (source === 'scheduled') {
                    const originalDate = e.dataTransfer.getData('originalDate');
                    const originalPeriod = e.dataTransfer.getData('originalPeriod');
                    dataManager.scheduleClass(className, originalDate, originalPeriod);
                    renderScheduleGrid();
                }
                return;
            }
            // If user confirms, continue with placement
        }
        
        // Validate placement for other constraints
        const validation = scheduler.isValidPlacement(className, dateStr, period);
        
        if (validation.valid) {
            // Schedule the class
            dataManager.scheduleClass(className, dateStr, period);
            
            // Explicitly save to localStorage to ensure persistence
            if (window.saveScheduleToLocalStorage) {
                window.saveScheduleToLocalStorage();
            }
            
            // Update UI
            renderScheduleGrid();
            renderUnscheduledClasses();
            updateProgress();
            
            // Clear highlights
            clearHighlights();
            
            // Show success message for rescheduled classes
            if (source === 'scheduled') {
                const date = new Date(dateStr);
                const dayName = dataManager.getDayFromDate(date);
                showMessage('success', `Moved ${className} to ${dayName}, ${dateStr}, Period ${period}`);
            }
        } else {
            // If this was a scheduled class that we removed, put it back
            if (source === 'scheduled') {
                const originalDate = e.dataTransfer.getData('originalDate');
                const originalPeriod = e.dataTransfer.getData('originalPeriod');
                dataManager.scheduleClass(className, originalDate, originalPeriod);
                renderScheduleGrid();
            }
            
            // Show error message
            showMessage('error', `Cannot place class here: ${validation.reason}`);
        }
    }
    
    function clearHighlights() {
        document.querySelectorAll('.grid-cell').forEach(cell => {
            cell.classList.remove('available');
            cell.classList.remove('conflict');
            cell.classList.remove('dragover');
            
            // IMPORTANT: We don't remove teacher-unavailable class here
            
            // Clear tooltip unless it's a scheduled cell or teacher unavailable cell
            if (!cell.classList.contains('scheduled')) {
                // If it's a teacher-unavailable cell, set appropriate tooltip
                if (cell.classList.contains('teacher-unavailable')) {
                    cell.title = 'Conflict: Teacher is unavailable during this period.';
                } else {
                    cell.removeAttribute('title');
                }
            }
        });
    }
    
    function updateProgress() {
        const totalClasses = dataManager.getClasses().length;
        const scheduledClassCount = totalClasses - dataManager.getUnscheduledClasses().length;
        const progressPercent = (scheduledClassCount / totalClasses) * 100;
        
        // Update progress bar
        const progressBar = document.getElementById('schedule-progress');
        progressBar.style.width = `${progressPercent}%`;
        
        // Update text
        const progressText = document.getElementById('progress-text');
        progressText.textContent = `${scheduledClassCount} of ${totalClasses} classes scheduled`;
    }
    
    function suggestNextClass() {
        // Clear any previous suggestions
        document.querySelectorAll('.class-item.suggested').forEach(item => {
            item.classList.remove('suggested');
        });
        
        // Get next suggested class
        const suggestedClass = scheduler.suggestNextClass();
        
        if (suggestedClass) {
            // Highlight the suggested class
            const classElement = document.querySelector(`.class-item[data-class-name="${suggestedClass.name}"]`);
            if (classElement) {
                classElement.classList.add('suggested');
                classElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                
                // Highlight available slots for this class
                highlightAvailableSlots(suggestedClass.name);
            }
        } else {
            showMessage('success', 'All classes have been scheduled!');
        }
    }
    
    function exportSchedule() {
        // Get all weeks from the schedule
        const allWeeks = dataManager.scheduleWeeks;
        
        // Create CSV content
        let csvContent = 'Date,Day,Period 1,Period 2,Period 3,Period 4,Period 5,Period 6,Period 7,Period 8\n';
        
        // Sort weeks by offset
        const sortedWeekOffsets = Object.keys(allWeeks).sort((a, b) => Number(a) - Number(b));
        
        sortedWeekOffsets.forEach(weekOffset => {
            const weekSchedule = allWeeks[weekOffset];
            
            // Sort dates within each week
            const sortedDates = Object.keys(weekSchedule).sort();
            
            sortedDates.forEach(dateStr => {
                const date = new Date(dateStr);
                const dayName = dataManager.getDayFromDate(date);
                
                let row = `${dateStr},${dayName}`;
                
                // Add each period
                for (let period = 1; period <= 8; period++) {
                    const className = weekSchedule[dateStr][period] || '';
                    row += `,${className}`;
                }
                
                csvContent += row + '\n';
            });
            
            // Add a blank line between weeks
            csvContent += '\n';
        });
        
        // Create and trigger download
        const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', 'cooking_class_schedule.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Show success message
        showMessage('success', 'Complete schedule for all weeks exported successfully!');
    }
    
    function showHelp() {
        document.getElementById('help-modal').style.display = 'block';
    }
    
    function resetSchedule() {
        // Ask for confirmation before resetting
        if (confirm('Are you sure you want to reset the schedule for the current week? This will remove all scheduled classes for this week only.')) {
            // Reset the schedule
            dataManager.resetSchedule();
            
            // Update UI
            renderScheduleGrid();
            renderUnscheduledClasses();
            updateProgress();
            clearHighlights();
            
            // Show message
            showMessage('info', 'Schedule for the current week has been reset.');
        }
    }
    
    function navigateWeek(direction) {
        // Navigate to previous or next week
        dataManager.changeWeek(direction);
        
        // Update UI
        renderScheduleGrid();
        updateProgress();
        clearHighlights();
        updateCurrentWeekDisplay();
    }
    
    function setStartDate(event) {
        const startDateInput = event.target || document.getElementById('start-date');
        const dateValue = startDateInput.value;
        
        if (dateValue) {
            try {
                // Show visual feedback that change is happening
                startDateInput.classList.add('updating');
                showMessage('info', 'Updating schedule...');
                
                // Use setTimeout to allow the UI to update before processing
                setTimeout(() => {
                    // Parse the date from the input - use proper date construction to avoid timezone issues
                    const [year, month, day] = dateValue.split('-').map(num => parseInt(num, 10));
                    // Month is 0-indexed in JavaScript Date
                    const newStartDate = new Date(year, month - 1, day, 0, 0, 0);
                    
                    console.log("Selected date value:", dateValue);
                    console.log("Year/Month/Day:", year, month, day);
                    console.log("Parsed date object:", newStartDate.toDateString());
                    
                    // Set the new start date
                    dataManager.setStartDate(newStartDate);
                    
                    // Update UI
                    renderScheduleGrid();
                    updateProgress();
                    updateConstraintStatus();
                    clearHighlights();
                    updateCurrentWeekDisplay();
                    
                    // Update date picker to show the Monday of the week
                    const mondayDate = dataManager.getFormattedDate(dataManager.scheduleStartDate);
                    startDateInput.value = mondayDate;
                    
                    // Format date for display
                    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                    const displayDate = dataManager.scheduleStartDate.toLocaleDateString(undefined, options);
                    showMessage('success', `Viewing week of ${displayDate}`);
                    
                    // Remove updating class
                    startDateInput.classList.remove('updating');
                }, 50);
            } catch (error) {
                console.error("Date parsing error:", error);
                startDateInput.classList.remove('updating');
                showMessage('error', 'Invalid date format. Please try again.');
            }
        } else {
            showMessage('error', 'Please select a valid date');
        }
    }
    
    function updateCurrentWeekDisplay() {
        const weekDisplay = document.getElementById('current-week-display');
        const dates = dataManager.getCurrentWeekDates();
        
        if (dates && dates.length > 0) {
            // Ensure we're using the actual Monday-Friday range that the calendar shows
            // The first date in the array should be Monday
            const startDate = dates[0];
            // Last date in the array should be Friday
            const endDate = dates[dates.length - 1];
            
            // Format as "Mar 17 - Mar 21, 2025"
            const formatOptions = { month: 'short', day: 'numeric' };
            const yearOptions = { year: 'numeric' };
            
            const formattedStart = startDate.toLocaleDateString(undefined, formatOptions);
            const formattedEnd = endDate.toLocaleDateString(undefined, formatOptions);
            const year = endDate.toLocaleDateString(undefined, yearOptions);
            
            weekDisplay.textContent = `${formattedStart} - ${formattedEnd}, ${year}`;
        }
    }
    
    function showMessage(type, message, duration = 4000) {
        const messageArea = document.getElementById('message-area');
        
        // Clear previous message classes
        messageArea.className = 'message-area';
        
        // Add the new message type
        messageArea.classList.add(type);
        messageArea.classList.add('visible');
        messageArea.textContent = message;
        
        // Auto-hide after duration
        setTimeout(() => {
            messageArea.classList.remove('visible');
        }, duration);
    }
    
    function createElementWithClass(tagName, className, textContent = '') {
        const element = document.createElement(tagName);
        element.className = className;
        element.textContent = textContent;
        return element;
    }
    
    // Teacher mode functions
    function toggleTeacherMode(e) {
        teacherModeActive = e.target.checked;
        
        if (teacherModeActive) {
            // Enable teacher mode UI
            showMessage('info', 'Teacher Mode active. Click on time slots to mark when you are unavailable.', 6000);
            document.querySelectorAll('.grid-cell:not(.scheduled)').forEach(cell => {
                cell.classList.add('teacher-mode-active');
            });
        } else {
            // Disable teacher mode UI
            showMessage('info', 'Teacher Mode disabled. Back to regular scheduling mode.', 4000);
            document.querySelectorAll('.grid-cell').forEach(cell => {
                cell.classList.remove('teacher-mode-active');
            });
        }
    }
    
    function handleCellClick(e) {
        const cell = e.target.closest('.grid-cell');
        if (!cell) return;
        
        // Only process clicks in teacher mode and on unscheduled cells
        if (teacherModeActive && !cell.classList.contains('scheduled')) {
            const dateStr = cell.dataset.date;
            const period = cell.dataset.period;
            
            // Toggle the teacher unavailability for this period
            const isNowUnavailable = dataManager.toggleTeacherUnavailability(dateStr, period);
            
            // Explicitly save to localStorage to ensure persistence
            if (window.saveTeacherUnavailabilityToLocalStorage) {
                window.saveTeacherUnavailabilityToLocalStorage();
                console.log("Teacher unavailability saved for:", dateStr, period, isNowUnavailable);
            }
            
            // Update the visual indicator
            if (isNowUnavailable) {
                cell.classList.add('teacher-unavailable');
                cell.title = 'Conflict: Teacher is unavailable during this period.';
            } else {
                cell.classList.remove('teacher-unavailable');
                cell.removeAttribute('title');
            }
            
            // Update any class highlights if a class is selected
            const selectedClass = document.querySelector('.class-item.suggested');
            if (selectedClass) {
                highlightAvailableSlots(selectedClass.dataset.className);
            }
        }
    }
    
    function markTeacherUnavailabilityPeriods() {
        // Get dates for the current week
        const weekDates = dataManager.getCurrentWeekDates();
        
        weekDates.forEach(date => {
            const dateStr = dataManager.getFormattedDate(date);
            
            // Check each period for teacher unavailability
            for (let period = 1; period <= 8; period++) {
                const cell = document.querySelector(`.grid-cell[data-date="${dateStr}"][data-period="${period}"]`);
                if (!cell) continue;
                
                // First remove any existing unavailability marker
                cell.classList.remove('teacher-unavailable');
                
                // Then check and add marker if unavailable
                if (dataManager.isTeacherUnavailable(dateStr, period)) {
                    cell.classList.add('teacher-unavailable');
                    cell.title = 'Conflict: Teacher is unavailable during this period.';
                }
            }
        });
    }
    
    // Configuration UI functions
    function updateConstraintStatus() {
        const config = dataManager.getConfig();
        const weeklyClasses = scheduler.countWeeklyClasses();
        
        document.getElementById('week-count').textContent = weeklyClasses;
        document.getElementById('week-limit').textContent = `${config.minClassesPerWeek}-${config.maxClassesPerWeek}`;
        
        const indicator = document.getElementById('weekly-constraint-indicator');
        
        if (weeklyClasses > config.maxClassesPerWeek) {
            indicator.className = 'constraint-indicator exceeded';
        } else if (weeklyClasses >= config.minClassesPerWeek) {
            indicator.className = 'constraint-indicator optimal';
        } else {
            indicator.className = 'constraint-indicator under';
        }
    }
    
    function showConfigModal() {
        const modal = document.getElementById('config-modal');
        const config = dataManager.getConfig();
        const hasExistingSchedule = scheduler.hasAnyClassesScheduled();
        
        // Populate form with current values
        document.getElementById('max-consecutive').value = config.maxConsecutiveClasses;
        document.getElementById('max-daily').value = config.maxClassesPerDay;
        document.getElementById('min-weekly').value = config.minClassesPerWeek;
        document.getElementById('max-weekly').value = config.maxClassesPerWeek;
        
        // Add warning if schedule exists
        const warningContainer = document.getElementById('config-warning-container');
        warningContainer.innerHTML = '';
        
        if (hasExistingSchedule) {
            const warning = document.createElement('div');
            warning.className = 'warning-message';
            warning.textContent = 'Warning: Changing constraints may invalidate parts of your current schedule.';
            warningContainer.appendChild(warning);
        }
        
        // Show the modal
        modal.style.display = 'block';
    }
    
    function resetConfigForm() {
        if (confirm('Reset configuration to default values?')) {
            // Reset form values
            document.getElementById('max-consecutive').value = 2;
            document.getElementById('max-daily').value = 4;
            document.getElementById('min-weekly').value = 12;
            document.getElementById('max-weekly').value = 16;
            
            showMessage('info', 'Form reset to default values. Click Save to apply changes.');
        }
    }
    
    function handleConfigFormSubmit() {
        // Get values from form
        const newConfig = {
            maxConsecutiveClasses: parseInt(document.getElementById('max-consecutive').value),
            maxClassesPerDay: parseInt(document.getElementById('max-daily').value),
            minClassesPerWeek: parseInt(document.getElementById('min-weekly').value),
            maxClassesPerWeek: parseInt(document.getElementById('max-weekly').value)
        };
        
        // Validate ranges
        if (newConfig.maxClassesPerWeek < newConfig.minClassesPerWeek) {
            showMessage('error', 'Maximum weekly classes must be greater than minimum weekly classes.');
            return;
        }
        
        // Check if any constraints are being tightened
        const currentConfig = dataManager.getConfig();
        const isTightening = 
            newConfig.maxConsecutiveClasses < currentConfig.maxConsecutiveClasses ||
            newConfig.maxClassesPerDay < currentConfig.maxClassesPerDay ||
            newConfig.maxClassesPerWeek < currentConfig.maxClassesPerWeek;
        
        if (isTightening && scheduler.hasAnyClassesScheduled()) {
            // Find what would become invalid
            const invalidPlacements = scheduler.findInvalidPlacementsWithNewConstraints(newConfig);
            
            if (invalidPlacements.length > 0) {
                // Build details HTML
                let detailsHtml = `<p>The following ${invalidPlacements.length} placements would become invalid:</p>`;
                detailsHtml += '<ul>';
                
                invalidPlacements.slice(0, 10).forEach(p => {
                    detailsHtml += `<li>${p.className} on ${p.dateStr} period ${p.period}: ${p.reason}</li>`;
                });
                
                if (invalidPlacements.length > 10) {
                    detailsHtml += `<li>...and ${invalidPlacements.length - 10} more</li>`;
                }
                
                detailsHtml += '</ul>';
                
                // Show confirmation with details
                showConfirmDialog({
                    title: 'Constraint Change Impact',
                    message: 'Changing these constraints will invalidate existing placements. What would you like to do?',
                    details: detailsHtml,
                    buttons: [
                        {
                            text: 'Remove invalid placements',
                            class: 'btn btn-danger',
                            action: () => {
                                // Remove invalid placements
                                invalidPlacements.forEach(p => {
                                    dataManager.unscheduleClass(p.dateStr, p.period);
                                });
                                
                                // Update config
                                dataManager.updateConfig(newConfig);
                                document.getElementById('config-modal').style.display = 'none';
                                
                                // Explicitly save schedule to localStorage
                                window.saveScheduleToLocalStorage();
                                
                                // Refresh UI
                                renderScheduleGrid();
                                renderUnscheduledClasses();
                                updateProgress();
                                updateConstraintStatus();
                                showMessage('warning', `Constraints updated. ${invalidPlacements.length} invalid placements were removed.`);
                            }
                        },
                        {
                            text: 'Keep current schedule',
                            class: 'btn',
                            action: () => {
                                // Don't change config
                                document.getElementById('config-modal').style.display = 'none';
                                showMessage('info', 'Constraint changes cancelled to preserve current schedule.');
                            }
                        }
                    ]
                });
                return;
            }
        }
        
        // No conflicts or user chose to proceed
        dataManager.updateConfig(newConfig);
        document.getElementById('config-modal').style.display = 'none';
        
        // Refresh UI
        renderScheduleGrid();
        updateConstraintStatus();
        
        // If a class is selected, refresh its available slots
        const selectedClass = document.querySelector('.class-item.suggested');
        if (selectedClass) {
            highlightAvailableSlots(selectedClass.dataset.className);
        }
        
        showMessage('success', 'Scheduling constraints updated successfully.');
    }
    
    function showConfirmDialog(options) {
        const modal = document.getElementById('confirm-dialog');
        const titleEl = document.getElementById('confirm-title');
        const messageEl = document.getElementById('confirm-message');
        const detailsEl = document.getElementById('confirm-details');
        const buttonsEl = document.getElementById('confirm-buttons');
        
        // Set content
        titleEl.textContent = options.title || 'Confirmation';
        messageEl.textContent = options.message || 'Are you sure?';
        
        // Set details if provided
        if (options.details) {
            detailsEl.innerHTML = options.details;
            detailsEl.style.display = 'block';
        } else {
            detailsEl.style.display = 'none';
        }
        
        // Clear previous buttons
        buttonsEl.innerHTML = '';
        
        // Add buttons
        options.buttons.forEach(btn => {
            const button = document.createElement('button');
            button.textContent = btn.text;
            button.className = btn.class || 'btn';
            
            button.addEventListener('click', () => {
                modal.style.display = 'none';
                if (typeof btn.action === 'function') {
                    btn.action();
                }
            });
            
            buttonsEl.appendChild(button);
        });
        
        // Show the modal
        modal.style.display = 'block';
    }
    
    // Schedule save/load functions
    function showSaveScheduleModal() {
        // Check if there's anything to save
        const hasScheduledClasses = scheduler.hasAnyClassesScheduled();
        if (!hasScheduledClasses) {
            showMessage('error', 'Nothing to save. Please schedule at least one class first.');
            return;
        }
        
        // Reset form
        const modal = document.getElementById('save-schedule-modal');
        const form = document.getElementById('save-schedule-form');
        form.reset();
        
        // Suggest a default name
        document.getElementById('schedule-name').value = "Schedule " + (dataManager.savedSchedules.length + 1);
        
        // Show modal
        modal.style.display = 'block';
        
        // Focus on name field
        document.getElementById('schedule-name').focus();
    }
    
    // Flag to prevent duplicate submissions
    let isSavingSchedule = false;
    
    function handleSaveScheduleSubmit(e) {
        e.preventDefault();
        console.log('Save schedule form submitted');
        
        // Prevent duplicate submissions
        if (isSavingSchedule) {
            console.log('Already processing a save request');
            return;
        }
        
        isSavingSchedule = true;
        
        const name = document.getElementById('schedule-name').value.trim();
        if (!name) {
            showMessage('error', 'Please enter a schedule name.');
            isSavingSchedule = false;
            return;
        }
        
        // Check for duplicate names
        const isDuplicateName = dataManager.savedSchedules.some(schedule => 
            schedule.name.toLowerCase() === name.toLowerCase()
        );
        
        if (isDuplicateName) {
            showMessage('error', `A schedule named "${name}" already exists. Please use a different name.`);
            isSavingSchedule = false;
            return;
        }
        
        const description = document.getElementById('schedule-description').value.trim();
        console.log('Saving schedule with name:', name, 'description:', description);
        
        // Create a unique ID
        const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
        const timestamp = new Date().toISOString();
        
        // Create a deep copy of relevant data
        const savedSchedule = {
            id,
            name,
            description,
            createdAt: timestamp,
            lastModified: timestamp,
            startDate: dataManager.getFormattedDate(dataManager.scheduleStartDate), // Save the schedule start date
            scheduleData: JSON.parse(JSON.stringify(dataManager.scheduleWeeks)),
            classData: JSON.parse(JSON.stringify(dataManager.classes)),
            constraintData: JSON.parse(JSON.stringify(dataManager.config)),
            teacherData: JSON.parse(JSON.stringify(dataManager.teacherUnavailability))
        };
        
        // Add to saved schedules
        if (dataManager.addSavedSchedule(savedSchedule)) {
            // Hide modal
            document.getElementById('save-schedule-modal').style.display = 'none';
            
            showMessage('success', `Schedule "${name}" saved successfully.`);
        }
        
        // Reset the saving flag
        isSavingSchedule = false;
    }
    
    function showLoadScheduleModal() {
        const modal = document.getElementById('load-schedule-modal');
        const listContainer = document.getElementById('saved-schedules-list');
        
        // Debug log saved schedules
        console.log('Showing load schedule modal. Saved schedules:', dataManager.savedSchedules);
        
        // Clear existing list
        listContainer.innerHTML = '';
        
        if (!dataManager.savedSchedules || dataManager.savedSchedules.length === 0) {
            console.log('No saved schedules found');
            listContainer.innerHTML = '<div class="empty-message">No saved schedules found.</div>';
        } else {
            // Calculate a "fingerprint" for the current schedule to identify if any saved schedules match
            const currentFingerprint = calculateScheduleFingerprint(
                dataManager.scheduleWeeks,
                dataManager.classes,
                dataManager.config,
                dataManager.teacherUnavailability
            );
            
            // Create list items for each saved schedule
            dataManager.savedSchedules.forEach(schedule => {
                const item = document.createElement('div');
                item.className = 'saved-schedule-item';
                
                // Check if this saved schedule matches the currently loaded one
                const savedFingerprint = calculateScheduleFingerprint(
                    schedule.scheduleData,
                    schedule.classData,
                    schedule.constraintData,
                    schedule.teacherData
                );
                
                const isCurrentSchedule = (currentFingerprint === savedFingerprint);
                if (isCurrentSchedule) {
                    item.classList.add('current');
                }
                
                const dateOptions = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
                const formattedDate = new Date(schedule.createdAt).toLocaleDateString(undefined, dateOptions);
                const formattedModified = schedule.lastModified && schedule.lastModified !== schedule.createdAt ? 
                    new Date(schedule.lastModified).toLocaleDateString(undefined, dateOptions) : null;
                
                // Calculate scheduled class count accurately
                let scheduledClassCount = 0;
                Object.values(schedule.scheduleData).forEach(week => {
                    Object.values(week).forEach(day => {
                        Object.values(day).forEach(className => {
                            if (className && typeof className === 'string') scheduledClassCount++;
                        });
                    });
                });
                
                const currentTag = isCurrentSchedule ? '<span class="current-tag">Current</span>' : '';
                
                item.innerHTML = `
                    <div class="schedule-info">
                        <h3>${schedule.name} ${currentTag}</h3>
                        <p class="schedule-date">Created: ${formattedDate}</p>
                        ${formattedModified ? `<p class="schedule-modified">Modified: ${formattedModified}</p>` : ''}
                        <p class="schedule-description">${schedule.description || 'No description'}</p>
                        <p class="schedule-stats">
                            ${scheduledClassCount} classes scheduled
                        </p>
                    </div>
                    <div class="schedule-actions">
                        <button class="btn btn-small preview-btn" data-id="${schedule.id}">Preview</button>
                        <button class="btn btn-small load-btn" data-id="${schedule.id}">Load</button>
                        <button class="btn btn-small btn-danger delete-btn" data-id="${schedule.id}">Delete</button>
                    </div>
                `;
                
                listContainer.appendChild(item);
            });
            
            // Add event listeners
            document.querySelectorAll('.preview-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const scheduleId = e.target.dataset.id;
                    showPreviewModal(scheduleId);
                });
            });
            
            document.querySelectorAll('.load-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const scheduleId = e.target.dataset.id;
                    modal.style.display = 'none';
                    loadSavedSchedule(scheduleId);
                });
            });
            
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const scheduleId = e.target.dataset.id;
                    if (confirm('Are you sure you want to delete this saved schedule? This cannot be undone.')) {
                        deleteSavedSchedule(scheduleId);
                        // Re-render the list
                        showLoadScheduleModal();
                    }
                });
            });
        }
        
        modal.style.display = 'block';
    }
    
    function calculateScheduleFingerprint(scheduleData, classData, configData, teacherData) {
        // Create a simplified fingerprint to identify if schedules are effectively the same
        try {
            const scheduleStr = JSON.stringify(scheduleData);
            const classStr = JSON.stringify(classData);
            const configStr = JSON.stringify(configData);
            const teacherStr = JSON.stringify(teacherData);
            
            // Simple hash function
            const combineStrings = scheduleStr + classStr + configStr + teacherStr;
            let hash = 0;
            for (let i = 0; i < combineStrings.length; i++) {
                const char = combineStrings.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32bit integer
            }
            return hash.toString(36);
        } catch (e) {
            console.error('Error calculating schedule fingerprint:', e);
            return Math.random().toString(36); // Fallback to a random value
        }
    }
    
    function showPreviewModal(scheduleId) {
        const savedSchedule = dataManager.getSavedScheduleById(scheduleId);
        if (!savedSchedule) {
            showMessage('error', 'Could not find the saved schedule.');
            return;
        }
        
        const modal = document.getElementById('preview-schedule-modal');
        const contentEl = document.getElementById('preview-content');
        
        // Calculate schedule stats
        let scheduledClassCount = 0;
        let weekCount = 0;
        const weekSummaries = [];
        
        // Process each week
        Object.keys(savedSchedule.scheduleData).forEach(weekOffset => {
            weekCount++;
            let weekClassCount = 0;
            
            // Get a sample date from this week for display
            const sampleDate = Object.keys(savedSchedule.scheduleData[weekOffset])[0];
            const weekDate = sampleDate ? new Date(sampleDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : `Week ${weekOffset}`;
            
            // Count classes in this week
            Object.values(savedSchedule.scheduleData[weekOffset]).forEach(day => {
                Object.values(day).forEach(className => {
                    if (className && typeof className === 'string') {
                        scheduledClassCount++;
                        weekClassCount++;
                    }
                });
            });
            
            weekSummaries.push(`<div class="week-preview">
                <div class="week-title">Week ${parseInt(weekOffset) + 1} (${weekDate}):</div>
                <div class="stat-item">${weekClassCount} classes scheduled</div>
            </div>`);
        });
        
        // Build preview HTML
        contentEl.innerHTML = `
            <div class="preview-section">
                <h3>${savedSchedule.name}</h3>
                <p>${savedSchedule.description || 'No description'}</p>
                <p class="schedule-date">Created: ${new Date(savedSchedule.createdAt).toLocaleDateString(undefined, 
                    {year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}</p>
            </div>
            
            <div class="preview-section">
                <h3>Schedule Summary</h3>
                <div class="preview-stats">
                    <div class="stat-item">${scheduledClassCount} total classes scheduled</div>
                    <div class="stat-item">${savedSchedule.classData.length} classes defined</div>
                    <div class="stat-item">${weekCount} weeks</div>
                </div>
            </div>
            
            <div class="preview-section">
                <h3>Constraint Settings</h3>
                <div class="preview-stats">
                    <div class="stat-item">Max consecutive: ${savedSchedule.constraintData.maxConsecutiveClasses}</div>
                    <div class="stat-item">Max per day: ${savedSchedule.constraintData.maxClassesPerDay}</div>
                    <div class="stat-item">Per week: ${savedSchedule.constraintData.minClassesPerWeek}-${savedSchedule.constraintData.maxClassesPerWeek}</div>
                </div>
            </div>
            
            <div class="preview-section">
                <h3>Weekly Breakdown</h3>
                ${weekSummaries.join('')}
            </div>
        `;
        
        // Set up load button
        const loadBtn = document.getElementById('load-preview-btn');
        loadBtn.dataset.id = scheduleId;
        loadBtn.onclick = function() {
            modal.style.display = 'none';
            loadSavedSchedule(this.dataset.id);
        };
        
        modal.style.display = 'block';
    }
    
    function loadSavedSchedule(id) {
        // Find the schedule by ID
        const savedSchedule = dataManager.getSavedScheduleById(id);
        if (!savedSchedule) {
            showMessage('error', 'Could not find the saved schedule.');
            return;
        }
        
        // Check if current schedule has any classes scheduled
        const hasCurrentClasses = scheduler.hasAnyClassesScheduled();
        if (hasCurrentClasses) {
            // Ask for confirmation before replacing current schedule
            const confirmLoadTitle = 'Confirm Schedule Load';
            const confirmLoadMessage = 'Loading a saved schedule will replace your current schedule. Continue?';
            
            showConfirmDialog({
                title: confirmLoadTitle,
                message: confirmLoadMessage,
                buttons: [
                    {
                        text: 'Continue',
                        class: 'btn',
                        action: () => proceedWithScheduleLoad(savedSchedule)
                    },
                    {
                        text: 'Cancel',
                        class: 'btn btn-secondary'
                    }
                ]
            });
        } else {
            // No current schedule, proceed directly
            proceedWithScheduleLoad(savedSchedule);
        }
    }
    
    function proceedWithScheduleLoad(savedSchedule) {
        // Check for class differences between saved and current
        const classDifferences = findClassDifferences(savedSchedule.classData, dataManager.classes);
        
        if (classDifferences.hasChanges) {
            // Show conflict resolution dialog
            showConflictResolutionDialog(savedSchedule, classDifferences);
        } else {
            // No conflicts, load directly
            applyLoadedSchedule(savedSchedule, 'full');
        }
    }
    
    function findClassDifferences(savedClasses, currentClasses) {
        const missing = []; // Classes in saved but not in current
        const modified = []; // Classes in both but with different conflicts
        const added = []; // Classes in current but not in saved
        
        // Find missing and modified classes
        savedClasses.forEach(savedClass => {
            const currentClass = currentClasses.find(c => c.name === savedClass.name);
            
            if (!currentClass) {
                missing.push(savedClass);
            } else {
                // Check if conflicts are different
                const savedConflictsJSON = JSON.stringify(savedClass.conflicts);
                const currentConflictsJSON = JSON.stringify(currentClass.conflicts);
                
                if (savedConflictsJSON !== currentConflictsJSON) {
                    modified.push({
                        name: savedClass.name,
                        savedConflicts: savedClass.conflicts,
                        currentConflicts: currentClass.conflicts
                    });
                }
            }
        });
        
        // Find added classes
        currentClasses.forEach(currentClass => {
            if (!savedClasses.some(c => c.name === currentClass.name)) {
                added.push(currentClass);
            }
        });
        
        return {
            hasChanges: missing.length > 0 || modified.length > 0 || added.length > 0,
            missing,
            modified,
            added
        };
    }
    
    function showConflictResolutionDialog(savedSchedule, differences) {
        const modal = document.getElementById('conflict-resolution-modal');
        const contentEl = document.getElementById('conflict-details');
        
        contentEl.innerHTML = `
            <h3>Class Changes Detected</h3>
            <p>There are differences between the classes in the saved schedule and your current classes:</p>
            
            ${differences.missing.length > 0 ? `
                <div class="conflict-section">
                    <h4>${differences.missing.length} Missing Classes</h4>
                    <p>These classes exist in the saved schedule but not in your current data:</p>
                    <ul>
                        ${differences.missing.map(c => `<li>${c.name}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            
            ${differences.modified.length > 0 ? `
                <div class="conflict-section">
                    <h4>${differences.modified.length} Modified Classes</h4>
                    <p>These classes have different conflict periods:</p>
                    <ul>
                        ${differences.modified.map(c => `<li>${c.name}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            
            ${differences.added.length > 0 ? `
                <div class="conflict-section">
                    <h4>${differences.added.length} New Classes</h4>
                    <p>These classes exist in your current data but not in the saved schedule:</p>
                    <ul>
                        ${differences.added.map(c => `<li>${c.name}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            
            <h3>How would you like to proceed?</h3>
        `;
        
        // Set up action buttons
        const actionsEl = document.getElementById('conflict-actions');
        actionsEl.innerHTML = '';
        
        // Full restore button (uses saved class data)
        const fullRestoreBtn = document.createElement('button');
        fullRestoreBtn.className = 'btn';
        fullRestoreBtn.textContent = 'Full Restore (Use Saved Classes)';
        fullRestoreBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            applyLoadedSchedule(savedSchedule, 'full');
        });
        actionsEl.appendChild(fullRestoreBtn);
        
        // Adapt button (uses current class data)
        const adaptBtn = document.createElement('button');
        adaptBtn.className = 'btn';
        adaptBtn.textContent = 'Adapt to Current Classes';
        adaptBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            applyLoadedSchedule(savedSchedule, 'adapt');
        });
        actionsEl.appendChild(adaptBtn);
        
        // Cancel button
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn btn-secondary';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
        actionsEl.appendChild(cancelBtn);
        
        modal.style.display = 'block';
    }
    
    function applyLoadedSchedule(savedSchedule, mode) {
        try {
            if (mode === 'full') {
                // Full restore - use all saved data including classes
                // First, set the scheduleStartDate from savedSchedule if available
                if (savedSchedule.startDate) {
                    // Parse the date string safely to avoid timezone issues
                    const [year, month, day] = savedSchedule.startDate.split('-').map(num => parseInt(num, 10));
                    dataManager.scheduleStartDate = new Date(year, month - 1, day); // month is 0-indexed in JS
                    console.log("Restored schedule start date:", dataManager.scheduleStartDate.toDateString());
                } else {
                    // If no startDate in the saved schedule, try to infer it from the schedule data
                    console.log("No startDate in saved schedule, attempting to infer it");
                    const firstWeekOffset = Object.keys(savedSchedule.scheduleData).sort()[0];
                    if (firstWeekOffset) {
                        // Get the first date in the first week
                        const firstWeekDates = Object.keys(savedSchedule.scheduleData[firstWeekOffset]).sort();
                        if (firstWeekDates.length > 0) {
                            // Parse the first date string
                            const [year, month, day] = firstWeekDates[0].split('-').map(num => parseInt(num, 10));
                            const firstDate = new Date(year, month - 1, day);
                            // Find the Monday of that week
                            dataManager.scheduleStartDate = dataManager.getMondayOfWeek(firstDate);
                            console.log("Inferred start date:", dataManager.scheduleStartDate.toDateString());
                        }
                    }
                }
                
                dataManager.scheduleWeeks = JSON.parse(JSON.stringify(savedSchedule.scheduleData));
                dataManager.classes = JSON.parse(JSON.stringify(savedSchedule.classData));
                dataManager.config = JSON.parse(JSON.stringify(savedSchedule.constraintData));
                dataManager.teacherUnavailability = JSON.parse(JSON.stringify(savedSchedule.teacherData));
                
                // Save to localStorage
                localStorage.setItem('cooking-class-schedule', JSON.stringify(dataManager.scheduleWeeks));
                localStorage.setItem('cooking-classes', JSON.stringify(dataManager.classes));
                localStorage.setItem('cooking-class-config', JSON.stringify(dataManager.config));
                localStorage.setItem('teacher-unavailability', JSON.stringify(dataManager.teacherUnavailability));
                
                // If the Class Manager is open, reset its state
                if (document.getElementById('class-manager-modal').style.display === 'block') {
                    if (typeof refreshClassList === 'function') {
                        refreshClassList(null);
                    }
                    if (typeof clearConflicts === 'function') {
                        clearConflicts();
                    }
                    
                    // Clear and disable the form until a class is selected
                    const classEditForm = document.getElementById('class-edit-form');
                    if (classEditForm) {
                        classEditForm.classList.add('disabled');
                        
                        const classNameInput = document.getElementById('class-name');
                        const classGradeSelect = document.getElementById('class-grade');
                        if (classNameInput && classGradeSelect) {
                            classNameInput.value = '';
                            classGradeSelect.value = 'PK';
                        }
                    }
                }
                
            } else if (mode === 'adapt') {
                // Adapt mode - keep current classes but load scheduled placements where possible
                
                // First, set the scheduleStartDate from savedSchedule if available
                if (savedSchedule.startDate) {
                    // Parse the date string safely to avoid timezone issues
                    const [year, month, day] = savedSchedule.startDate.split('-').map(num => parseInt(num, 10));
                    dataManager.scheduleStartDate = new Date(year, month - 1, day); // month is 0-indexed in JS
                    console.log("Restored schedule start date (adapt mode):", dataManager.scheduleStartDate.toDateString());
                } else if (Object.keys(savedSchedule.scheduleData).length > 0) {
                    // If no startDate in the saved schedule, try to infer it from the schedule data
                    console.log("No startDate in saved schedule (adapt mode), attempting to infer it");
                    const firstWeekOffset = Object.keys(savedSchedule.scheduleData).sort()[0];
                    if (firstWeekOffset) {
                        // Get the first date in the first week
                        const firstWeekDates = Object.keys(savedSchedule.scheduleData[firstWeekOffset]).sort();
                        if (firstWeekDates.length > 0) {
                            // Parse the first date string
                            const [year, month, day] = firstWeekDates[0].split('-').map(num => parseInt(num, 10));
                            const firstDate = new Date(year, month - 1, day);
                            // Find the Monday of that week
                            dataManager.scheduleStartDate = dataManager.getMondayOfWeek(firstDate);
                            console.log("Inferred start date (adapt mode):", dataManager.scheduleStartDate.toDateString());
                        }
                    }
                }
                
                dataManager.scheduleWeeks = {};
                
                // Create empty weeks matching saved structure
                Object.keys(savedSchedule.scheduleData).forEach(weekOffset => {
                    dataManager.scheduleWeeks[weekOffset] = {};
                    
                    Object.keys(savedSchedule.scheduleData[weekOffset]).forEach(dateStr => {
                        dataManager.scheduleWeeks[weekOffset][dateStr] = {};
                        
                        // Initialize all periods as empty
                        for (let period = 1; period <= 8; period++) {
                            dataManager.scheduleWeeks[weekOffset][dateStr][period] = null;
                        }
                    });
                });
                
                // Apply scheduled classes that still exist
                Object.keys(savedSchedule.scheduleData).forEach(weekOffset => {
                    Object.keys(savedSchedule.scheduleData[weekOffset]).forEach(dateStr => {
                        Object.keys(savedSchedule.scheduleData[weekOffset][dateStr]).forEach(period => {
                            const className = savedSchedule.scheduleData[weekOffset][dateStr][period];
                            if (className && typeof className === 'string') {
                                // Check if class still exists
                                const classExists = dataManager.classes.some(c => c.name === className);
                                if (classExists) {
                                    dataManager.scheduleWeeks[weekOffset][dateStr][period] = className;
                                }
                            }
                        });
                    });
                });
                
                // Load config and teacher unavailability
                dataManager.config = JSON.parse(JSON.stringify(savedSchedule.constraintData));
                dataManager.teacherUnavailability = JSON.parse(JSON.stringify(savedSchedule.teacherData));
                
                // Save to localStorage
                localStorage.setItem('cooking-class-schedule', JSON.stringify(dataManager.scheduleWeeks));
                localStorage.setItem('cooking-class-config', JSON.stringify(dataManager.config));
                localStorage.setItem('teacher-unavailability', JSON.stringify(dataManager.teacherUnavailability));
                
                // If the Class Manager is open, reset its state
                if (document.getElementById('class-manager-modal').style.display === 'block') {
                    if (typeof refreshClassList === 'function') {
                        refreshClassList(null);
                    }
                    if (typeof clearConflicts === 'function') {
                        clearConflicts();
                    }
                    
                    // Clear and disable the form until a class is selected
                    const classEditForm = document.getElementById('class-edit-form');
                    if (classEditForm) {
                        classEditForm.classList.add('disabled');
                        
                        const classNameInput = document.getElementById('class-name');
                        const classGradeSelect = document.getElementById('class-grade');
                        if (classNameInput && classGradeSelect) {
                            classNameInput.value = '';
                            classGradeSelect.value = 'PK';
                        }
                    }
                }
            }
            
            // Reset to the first week of the schedule
            dataManager.currentWeekOffset = 0;
            
            // Update UI
            renderScheduleGrid();
            renderUnscheduledClasses();
            updateProgress();
            updateConstraintStatus();
            
            showMessage('success', `Schedule "${savedSchedule.name}" loaded successfully.`);
        } catch (error) {
            console.error('Error applying loaded schedule:', error);
            showMessage('error', 'Failed to load schedule due to an error. Please try again.');
        }
    }
    
    function deleteSavedSchedule(id) {
        // Find the schedule to get its name
        const schedule = dataManager.getSavedScheduleById(id);
        if (!schedule) return;
        
        const name = schedule.name;
        
        // Delete the schedule
        if (dataManager.deleteSavedSchedule(id)) {
            showMessage('success', `Schedule "${name}" deleted.`);
        } else {
            showMessage('error', `Failed to delete schedule "${name}". Please try again.`);
        }
    }
    
    // ---- Analytics Functions ----
    
    function showAnalyticsModal() {
        const modal = document.getElementById('analytics-modal');
        
        // Show the modal
        modal.style.display = 'block';
        
        // Initialize the analytics view
        updateAnalyticsView();
        
        // Add change event to view selector
        document.getElementById('analytics-view-selector').addEventListener('change', updateAnalyticsView);
        
        // Add event listener for generate suggestions button
        document.getElementById('generate-suggestions-btn').addEventListener('click', generateAndDisplaySuggestions);
        
        // Add direct event listener to the What-If button
        const whatIfButton = document.getElementById('show-what-if-btn');
        if (whatIfButton) {
            console.log('Found What-If button in analytics modal, adding click handler');
            whatIfButton.onclick = function() {
                console.log('What-If button clicked directly');
                showWhatIfAnalysis();
            };
        } else {
            console.error('What-If button not found in analytics modal');
        }
    }
    
    // Track what-if state
    const whatIfState = {
        isLibraryLoaded: false,
        hasRun: false,
        lastSimulation: null,
        isLoading: false
    };
    
    // Expose this function to the global scope for the inline onclick handler
    window.showWhatIfAnalysis = function() {
        console.log('showWhatIfAnalysis function called');
        
        // Get the modal
        const modal = document.getElementById('what-if-modal');
        
        // Reset the form to current constraint values
        const currentConstraints = dataManager.getConfig();
        
        document.getElementById('what-if-consecutive').value = currentConstraints.maxConsecutiveClasses;
        document.getElementById('what-if-consecutive-value').textContent = currentConstraints.maxConsecutiveClasses;
        
        document.getElementById('what-if-daily').value = currentConstraints.maxClassesPerDay;
        document.getElementById('what-if-daily-value').textContent = currentConstraints.maxClassesPerDay;
        
        document.getElementById('what-if-weekly-min').value = currentConstraints.minClassesPerWeek;
        document.getElementById('what-if-weekly-min-value').textContent = currentConstraints.minClassesPerWeek;
        
        document.getElementById('what-if-weekly-max').value = currentConstraints.maxClassesPerWeek;
        document.getElementById('what-if-weekly-max-value').textContent = currentConstraints.maxClassesPerWeek;
        
        // Reset results
        document.getElementById('what-if-results').style.display = 'none';
        document.getElementById('what-if-status').innerHTML = '<div class="status-message">Adjust constraints and click "Simulate" to see potential impact</div>';
        document.querySelector('.what-if-advanced-actions').style.display = 'none';
        
        // Setup sliders
        setupWhatIfSliders();
        
        // Show the modal
        modal.style.display = 'block';
        
        // Start preloading the solver library in the background
        if (!whatIfState.isLibraryLoaded) {
            whatIfState.isLibraryLoaded = true;
            ConstraintSolverWrapper.initialize().catch(error => {
                console.log('Solver preload failed, will use fallback simulation:', error);
            });
        }
    }
    
    // Expose function globally
    window.setupWhatIfSliders = function() {
        // Max consecutive classes slider
        const consecutiveSlider = document.getElementById('what-if-consecutive');
        const consecutiveValue = document.getElementById('what-if-consecutive-value');
        
        consecutiveSlider.addEventListener('input', function() {
            consecutiveValue.textContent = this.value;
        });
        
        // Max daily classes slider
        const dailySlider = document.getElementById('what-if-daily');
        const dailyValue = document.getElementById('what-if-daily-value');
        
        dailySlider.addEventListener('input', function() {
            dailyValue.textContent = this.value;
        });
        
        // Weekly min-max sliders
        const weeklyMinSlider = document.getElementById('what-if-weekly-min');
        const weeklyMinValue = document.getElementById('what-if-weekly-min-value');
        const weeklyMaxSlider = document.getElementById('what-if-weekly-max');
        const weeklyMaxValue = document.getElementById('what-if-weekly-max-value');
        
        weeklyMinSlider.addEventListener('input', function() {
            // Ensure min doesn't exceed max
            if (parseInt(this.value) > parseInt(weeklyMaxSlider.value)) {
                weeklyMaxSlider.value = this.value;
                weeklyMaxValue.textContent = this.value;
            }
            weeklyMinValue.textContent = this.value;
        });
        
        weeklyMaxSlider.addEventListener('input', function() {
            // Ensure max doesn't go below min
            if (parseInt(this.value) < parseInt(weeklyMinSlider.value)) {
                weeklyMinSlider.value = this.value;
                weeklyMinValue.textContent = this.value;
            }
            weeklyMaxValue.textContent = this.value;
        });
    }
    
    // Define the simulation function
    // Using function declaration for better hoisting
    async function runWhatIfSimulation() {
        console.log('runWhatIfSimulation called - definition in app.js');
        return await _runWhatIfSimulationImpl();
    }
    
    // Expose it globally in multiple ways for maximum compatibility
    window.runWhatIfSimulation = runWhatIfSimulation;
    
    // Implementation details - keep these private
    async function _runWhatIfSimulationImpl() {
        try {
            console.log('Inside _runWhatIfSimulationImpl - getting DOM elements');
            
            const resultContainer = document.getElementById('what-if-results');
            if (!resultContainer) {
                console.error('Could not find what-if-results element');
                alert('Error: Could not find the results container');
                return;
            }
            
            const statusContainer = document.getElementById('what-if-status');
            if (!statusContainer) {
                console.error('Could not find what-if-status element');
                alert('Error: Could not find the status container');
                return;
            }
            
            const actionContainer = document.querySelector('.what-if-advanced-actions');
            if (!actionContainer) {
                console.error('Could not find what-if-advanced-actions element');
                // Non-critical, so continue
            }
            
            console.log('Running What-If simulation implementation with DOM elements:', {
                resultContainer: resultContainer.id,
                statusContainer: statusContainer.id,
                actionContainer: actionContainer ? 'found' : 'not found'
            });
            
            // Show loading state
            whatIfState.isLoading = true;
            statusContainer.innerHTML = '<div class="loading-indicator">Running simulation...</div>';
            resultContainer.style.display = 'none';
            if (actionContainer) {
                actionContainer.style.display = 'none';
            }
            
            // Get current and new constraints
            const currentConstraints = dataManager.getConfig();
            const newConstraints = {
                maxConsecutiveClasses: parseInt(document.getElementById('what-if-consecutive').value),
                maxClassesPerDay: parseInt(document.getElementById('what-if-daily').value),
                minClassesPerWeek: parseInt(document.getElementById('what-if-weekly-min').value),
                maxClassesPerWeek: parseInt(document.getElementById('what-if-weekly-max').value)
            };
            
            // Validate that min doesn't exceed max
            if (newConstraints.minClassesPerWeek > newConstraints.maxClassesPerWeek) {
                throw new Error('Minimum weekly classes cannot be greater than maximum');
            }
            
            // Create a deep copy of schedule data
            const scheduleCopy = JSON.parse(JSON.stringify(dataManager.scheduleWeeks));
            
            // Run simulation with timeout protection
            const timeoutMs = 5000; // 5 seconds timeout
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Simulation timed out')), timeoutMs);
            });
            
            // Run the simulation
            const simulationPromise = ConstraintSolverWrapper.simulateConstraintChanges(
                scheduleCopy, 
                currentConstraints, 
                newConstraints
            );
            
            // Race the simulation against the timeout
            const simulation = await Promise.race([simulationPromise, timeoutPromise]);
            whatIfState.lastSimulation = simulation;
            whatIfState.hasRun = true;
            
            // Display results
            displayWhatIfResults(simulation, currentConstraints, newConstraints);
            
            // Show advanced actions
            actionContainer.style.display = 'flex';
        } catch (error) {
            console.error('What-if simulation error:', error);
            statusContainer.innerHTML = `
                <div class="error-message">
                    Simulation failed: ${error.message || 'Unknown error'}
                    <button id="retry-simulation-btn" class="btn">Retry</button>
                </div>
            `;
            
            // Add retry handler
            document.getElementById('retry-simulation-btn').addEventListener('click', runWhatIfSimulation);
        } finally {
            whatIfState.isLoading = false;
        }
    }
    
    // This definition was moved to before the implementation - it's now redundant
    // Additional logging to help debug
    console.log('Simulation function exposed as window.runWhatIfSimulation:', typeof window.runWhatIfSimulation);
    
    function displayWhatIfResults(simulation, currentConstraints, newConstraints) {
        const resultContainer = document.getElementById('what-if-results');
        const statusContainer = document.getElementById('what-if-status');
        
        // Show appropriate status message
        if (simulation.feasible) {
            statusContainer.innerHTML = `
                <div class="status-success">
                    ✓ Schedule appears to be feasible with the new constraints
                </div>
            `;
        } else {
            statusContainer.innerHTML = `
                <div class="status-warning">
                    ⚠ These constraints would cause ${simulation.invalidPlacements.length} placement conflicts
                </div>
            `;
        }
        
        // Helper function to format date
        function formatDisplayDate(dateStr) {
            const date = new Date(dateStr);
            return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
        }
        
        // Build results content
        let resultsHtml = `
            <h4>Impact Analysis</h4>
            <table class="impact-table">
                <tr>
                    <th>Constraint</th>
                    <th>Current</th>
                    <th>Simulated</th>
                </tr>
                <tr>
                    <td>Max Consecutive Classes</td>
                    <td>${currentConstraints.maxConsecutiveClasses}</td>
                    <td>${newConstraints.maxConsecutiveClasses}</td>
                </tr>
                <tr>
                    <td>Max Classes Per Day</td>
                    <td>${currentConstraints.maxClassesPerDay}</td>
                    <td>${newConstraints.maxClassesPerDay}</td>
                </tr>
                <tr>
                    <td>Weekly Class Target</td>
                    <td>${currentConstraints.minClassesPerWeek}-${currentConstraints.maxClassesPerWeek}</td>
                    <td>${newConstraints.minClassesPerWeek}-${newConstraints.maxClassesPerWeek}</td>
                </tr>
                <tr>
                    <td>Valid Class Placements</td>
                    <td>${simulation.currentClassCount || 'N/A'}</td>
                    <td>${simulation.simulatedClassCount || simulation.currentClassCount - simulation.invalidPlacements.length}</td>
                </tr>
                <tr>
                    <td>Invalid Placements</td>
                    <td>0</td>
                    <td>${simulation.invalidPlacements.length}</td>
                </tr>
            </table>
        `;
        
        // Show affected placements if any
        if (simulation.invalidPlacements.length > 0) {
            resultsHtml += `
                <h4>Affected Placements</h4>
                <div class="affected-placements">
                    <ul>
            `;
            
            // Group by reason
            const reasons = {};
            simulation.invalidPlacements.forEach(placement => {
                if (!reasons[placement.reason]) {
                    reasons[placement.reason] = [];
                }
                reasons[placement.reason].push(placement);
            });
            
            // Show grouped by reason
            Object.entries(reasons).forEach(([reason, placements]) => {
                resultsHtml += `<li><strong>${reason}</strong>: ${placements.length} placements</li>`;
                
                // Show up to 3 examples per reason
                if (placements.length > 0) {
                    resultsHtml += '<ul>';
                    placements.slice(0, 3).forEach(placement => {
                        resultsHtml += `
                            <li>
                                ${placement.className} on ${formatDisplayDate(placement.dateStr)} period ${placement.period}
                            </li>
                        `;
                    });
                    
                    if (placements.length > 3) {
                        resultsHtml += `<li>...and ${placements.length - 3} more</li>`;
                    }
                    
                    resultsHtml += '</ul>';
                }
            });
            
            resultsHtml += `
                    </ul>
                </div>
            `;
        }
        
        resultContainer.innerHTML = resultsHtml;
        resultContainer.style.display = 'block';
    }
    
    // Expose function globally
    window.applyWhatIfResults = function() {
        // Get new constraint values
        const newConstraints = {
            maxConsecutiveClasses: parseInt(document.getElementById('what-if-consecutive').value),
            maxClassesPerDay: parseInt(document.getElementById('what-if-daily').value),
            minClassesPerWeek: parseInt(document.getElementById('what-if-weekly-min').value),
            maxClassesPerWeek: parseInt(document.getElementById('what-if-weekly-max').value)
        };
        
        // If we have invalid placements, ask for confirmation
        if (whatIfState.lastSimulation && whatIfState.lastSimulation.invalidPlacements.length > 0) {
            // Use the confirm dialog
            const invalidPlacements = whatIfState.lastSimulation.invalidPlacements;
            
            // Build details HTML
            let detailsHtml = `<p>The following ${invalidPlacements.length} placements will be removed:</p>`;
            detailsHtml += '<ul>';
            
            invalidPlacements.slice(0, 5).forEach(p => {
                const date = new Date(p.dateStr);
                const formattedDate = date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
                detailsHtml += `<li>${p.className} on ${formattedDate} period ${p.period}</li>`;
            });
            
            if (invalidPlacements.length > 5) {
                detailsHtml += `<li>...and ${invalidPlacements.length - 5} more</li>`;
            }
            
            detailsHtml += '</ul>';
            
            showConfirmDialog({
                title: 'Apply Constraint Changes',
                message: 'Changing these constraints will invalidate existing placements. What would you like to do?',
                details: detailsHtml,
                buttons: [
                    {
                        text: 'Remove invalid placements',
                        class: 'btn',
                        action: () => {
                            applyConstraintChangesWithRemovals(newConstraints, invalidPlacements);
                        }
                    },
                    {
                        text: 'Cancel',
                        class: 'btn btn-secondary',
                        action: () => {
                            // Do nothing
                        }
                    }
                ]
            });
        } else {
            // No invalid placements, apply directly
            applyConstraintChangesWithRemovals(newConstraints, []);
        }
    }
    
    function applyConstraintChangesWithRemovals(newConstraints, invalidPlacements) {
        // If there are invalid placements, remove them
        if (invalidPlacements.length > 0) {
            // Save current week offset to restore later
            const currentWeek = dataManager.currentWeekOffset;
            
            invalidPlacements.forEach(placement => {
                // Navigate to the week where the placement is located
                dataManager.currentWeekOffset = placement.weekOffset;
                // Then unschedule the class from that week
                dataManager.unscheduleClass(placement.dateStr, placement.period);
            });
            
            // Restore the current week
            dataManager.currentWeekOffset = currentWeek;
        }
        
        // Update constraints
        dataManager.updateConfig(newConstraints);
        
        // Close the modal
        document.getElementById('what-if-modal').style.display = 'none';
        
        // Update the schedule display
        renderScheduleGrid();
        renderUnscheduledClasses();
        updateProgress();
        updateConstraintStatus();
        
        // Update analytics if it's still open
        if (document.getElementById('analytics-modal').style.display === 'block') {
            updateAnalyticsView();
        }
        
        // Show message
        if (invalidPlacements.length > 0) {
            showMessage('warning', `Constraints updated. ${invalidPlacements.length} affected classes have been unscheduled.`);
        } else {
            showMessage('success', 'Constraints updated successfully.');
        }
    }
    
    function generateAndDisplaySuggestions() {
        const container = document.getElementById('suggestions-container');
        
        try {
            // Show a loading message
            container.innerHTML = '<p class="loading-indicator">Analyzing schedule...</p>';
            
            // Create copies of data to prevent accidental modification
            const scheduleCopy = JSON.parse(JSON.stringify(dataManager.scheduleWeeks));
            const constraintsCopy = JSON.parse(JSON.stringify(dataManager.getConfig()));
            
            // Get current metrics
            const metrics = ScheduleAnalytics.calculateMetrics(scheduleCopy, constraintsCopy);
            
            // Generate suggestions
            const suggestions = ScheduleAnalytics.generateSuggestions(metrics);
            
            // Clear container
            container.innerHTML = '';
            
            if (suggestions.length === 0) {
                container.innerHTML = `
                    <div class="info-message">
                        <p><strong>No optimization suggestions available.</strong></p>
                        <p>Your schedule appears to be well-optimized! If you'd like to see suggestions, try:</p>
                        <ul>
                            <li>Adding more classes to your schedule</li>
                            <li>Creating some underutilized days (days with fewer classes)</li>
                            <li>Using specific periods more heavily than others</li>
                        </ul>
                    </div>`;
                return;
            }
            
            // Add a header with suggestion count
            const header = document.createElement('div');
            header.className = 'suggestions-header';
            header.innerHTML = `<p>Found <strong>${suggestions.length} potential optimizations</strong> for your schedule:</p>`;
            container.appendChild(header);
            
            // Create suggestions list
            const list = document.createElement('div');
            list.className = 'suggestions-list';
            
            // Add icon mapping for suggestion types
            const typeIcons = {
                'balance': '⚖️',
                'compression': '📏',
                'utilization': '📊',
                'weekly': '📅',
                'quality': '🌟'
            };
            
            suggestions.forEach(suggestion => {
                const item = document.createElement('div');
                item.className = `suggestion-item suggestion-${suggestion.type}`;
                
                const icon = typeIcons[suggestion.type] || '';
                
                const title = document.createElement('h4');
                title.innerHTML = `${icon} ${suggestion.message}`;
                
                const details = document.createElement('p');
                details.textContent = suggestion.details;
                details.className = 'suggestion-details';
                
                item.appendChild(title);
                item.appendChild(details);
                list.appendChild(item);
            });
            
            container.appendChild(list);
        } catch (error) {
            console.error('Error generating suggestions (safely contained):', error);
            container.innerHTML = '<p>Unable to generate suggestions at this time.</p>';
        }
    }
    
    function updateAnalyticsView() {
        try {
            // Create COPIES of data to prevent accidental modification
            const scheduleCopy = JSON.parse(JSON.stringify(dataManager.scheduleWeeks));
            const constraintsCopy = JSON.parse(JSON.stringify(dataManager.getConfig()));
            
            // Calculate metrics
            const metrics = ScheduleAnalytics.calculateMetrics(scheduleCopy, constraintsCopy);
            
            // Update UI with metrics
            updateMetricsDisplay(metrics);
            
            // Update visualization based on currently selected view
            updateVisualization(metrics);
            
            // Update insights
            updateInsights(metrics);
        } catch (error) {
            console.error('Error updating analytics (safely contained):', error);
            
            // Show fallback content if there's an error
            document.getElementById('metric-span').textContent = 'Unavailable';
            document.getElementById('metric-balance').textContent = 'Unavailable';
            document.getElementById('metric-quality').textContent = 'Unavailable';
            document.getElementById('analytics-insights-content').innerHTML = '<p>Unable to generate analytics at this time. Please try again later.</p>';
        }
    }
    
    function updateMetricsDisplay(metrics) {
        // Update schedule span
        document.getElementById('metric-span').textContent = metrics.scheduleSpan + ' days';
        
        // Calculate and display average balance score
        let totalScore = 0;
        let dayCount = 0;
        
        Object.values(metrics.dailyBalance).forEach(dayData => {
            totalScore += dayData.score;
            dayCount++;
        });
        
        const avgBalance = dayCount > 0 ? Math.round(totalScore / dayCount) : 0;
        document.getElementById('metric-balance').textContent = avgBalance + '%';
        document.getElementById('balance-gauge').querySelector('.gauge-fill').style.width = avgBalance + '%';
        
        // Update overall quality
        document.getElementById('metric-quality').textContent = metrics.overallQuality + '%';
        document.getElementById('quality-gauge').querySelector('.gauge-fill').style.width = metrics.overallQuality + '%';
    }
    
    function updateVisualization(metrics) {
        const container = document.getElementById('analytics-visualization');
        const viewType = document.getElementById('analytics-view-selector').value;
        
        // Clear container
        container.innerHTML = '';
        
        try {
            switch (viewType) {
                case 'heatmap':
                    renderHeatmapVisualization(container, metrics);
                    break;
                case 'periods':
                    renderPeriodUtilizationVisualization(container, metrics);
                    break;
                case 'constraints':
                    renderConstraintVisualization(container, metrics);
                    break;
                default:
                    renderHeatmapVisualization(container, metrics);
            }
        } catch (error) {
            console.error('Visualization error (safely contained):', error);
            container.innerHTML = '<div class="error-message">Visualization unavailable</div>';
        }
    }
    
    function renderHeatmapVisualization(container, metrics) {
        // Get all dates that have balance data
        const dates = Object.keys(metrics.dailyBalance).sort();
        
        // Skip if no dates
        if (dates.length === 0) {
            container.innerHTML = '<div class="info-message">No scheduled classes to visualize.</div>';
            return;
        }
        
        // Create heatmap container
        const heatmapContainer = document.createElement('div');
        heatmapContainer.className = 'heatmap-container';
        
        // Add empty top-left cell
        heatmapContainer.appendChild(createElementWithClass('div', 'heatmap-header', ''));
        
        // Add date headers
        dates.forEach(dateStr => {
            const date = new Date(dateStr);
            const options = { weekday: 'short', month: 'short', day: 'numeric' };
            const formattedDate = date.toLocaleDateString(undefined, options);
            
            const header = createElementWithClass('div', 'heatmap-header', formattedDate);
            heatmapContainer.appendChild(header);
        });
        
        // Add rows for each period
        for (let period = 1; period <= 8; period++) {
            // Add period label
            heatmapContainer.appendChild(createElementWithClass('div', 'heatmap-period', `P${period}`));
            
            // Add cells for each date
            dates.forEach(dateStr => {
                const weekOffset = findWeekOffsetForDate(dateStr);
                let className = '';
                let cellClass = 'heatmap-cell empty';
                
                // Check if a class is scheduled in this slot
                if (weekOffset !== null && 
                    dataManager.scheduleWeeks[weekOffset] && 
                    dataManager.scheduleWeeks[weekOffset][dateStr] && 
                    dataManager.scheduleWeeks[weekOffset][dateStr][period]) {
                    
                    className = dataManager.scheduleWeeks[weekOffset][dateStr][period];
                    
                    // Cell class based on day balance status
                    const dayStatus = metrics.dailyBalance[dateStr]?.status || 'balanced';
                    cellClass = `heatmap-cell ${dayStatus}`;
                }
                
                const cell = createElementWithClass('div', cellClass, className);
                heatmapContainer.appendChild(cell);
            });
        }
        
        container.appendChild(heatmapContainer);
    }
    
    function renderPeriodUtilizationVisualization(container, metrics) {
        const periodData = metrics.periodUtilization;
        
        // Create a simple bar chart showing period utilization
        const chartContainer = document.createElement('div');
        chartContainer.className = 'period-chart-container';
        
        // Add title
        const title = document.createElement('h3');
        title.textContent = 'Period Utilization';
        chartContainer.appendChild(title);
        
        // Create chart
        const chart = document.createElement('div');
        chart.className = 'period-chart';
        
        for (let period = 1; period <= 8; period++) {
            const data = periodData[period];
            
            const barContainer = document.createElement('div');
            barContainer.className = 'period-bar-container';
            
            const label = document.createElement('div');
            label.className = 'period-label';
            label.textContent = `Period ${period}`;
            
            const bar = document.createElement('div');
            bar.className = 'period-bar';
            
            const fill = document.createElement('div');
            fill.className = 'period-bar-fill';
            fill.style.width = `${data.percentage}%`;
            
            const value = document.createElement('div');
            value.className = 'period-value';
            value.textContent = `${Math.round(data.percentage)}% (${data.count})`;
            
            bar.appendChild(fill);
            barContainer.appendChild(label);
            barContainer.appendChild(bar);
            barContainer.appendChild(value);
            
            chart.appendChild(barContainer);
        }
        
        chartContainer.appendChild(chart);
        container.appendChild(chartContainer);
    }
    
    function renderConstraintVisualization(container, metrics) {
        const constraintData = metrics.constraintPressure;
        
        // Create container
        const constraintContainer = document.createElement('div');
        constraintContainer.className = 'constraint-chart-container';
        
        // Add title
        const title = document.createElement('h3');
        title.textContent = 'Constraint Pressure';
        constraintContainer.appendChild(title);
        
        // Daily constraint section
        const dailySection = document.createElement('div');
        dailySection.className = 'constraint-section';
        
        const dailyTitle = document.createElement('h4');
        dailyTitle.textContent = 'Daily Class Load';
        dailySection.appendChild(dailyTitle);
        
        // Create chart for daily constraints
        const dailyDates = Object.keys(constraintData.daily).sort();
        const dailyChart = document.createElement('div');
        dailyChart.className = 'daily-constraint-chart';
        
        dailyDates.forEach(dateStr => {
            const data = constraintData.daily[dateStr];
            const date = new Date(dateStr);
            const dayName = date.toLocaleDateString(undefined, { weekday: 'short' });
            
            const barContainer = document.createElement('div');
            barContainer.className = 'constraint-bar-container';
            
            const label = document.createElement('div');
            label.className = 'constraint-label';
            label.textContent = `${dayName} ${date.getDate()}`;
            
            const bar = document.createElement('div');
            bar.className = 'constraint-bar';
            
            const fill = document.createElement('div');
            fill.className = 'constraint-bar-fill';
            fill.style.width = `${data.pressure}%`;
            
            // Color based on pressure (green → yellow → red)
            if (data.pressure < 70) {
                fill.style.backgroundColor = '#81c784'; // Light green
            } else if (data.pressure < 90) {
                fill.style.backgroundColor = '#ffd54f'; // Yellow
            } else {
                fill.style.backgroundColor = '#e57373'; // Light red
            }
            
            const value = document.createElement('div');
            value.className = 'constraint-value';
            value.textContent = `${data.count}/${data.limit}`;
            
            bar.appendChild(fill);
            barContainer.appendChild(label);
            barContainer.appendChild(bar);
            barContainer.appendChild(value);
            
            dailyChart.appendChild(barContainer);
        });
        
        dailySection.appendChild(dailyChart);
        constraintContainer.appendChild(dailySection);
        
        // Weekly constraint section
        const weeklySection = document.createElement('div');
        weeklySection.className = 'constraint-section';
        
        const weeklyTitle = document.createElement('h4');
        weeklyTitle.textContent = 'Weekly Class Load';
        weeklySection.appendChild(weeklyTitle);
        
        // Create chart for weekly constraints
        const weeklyOffsets = Object.keys(constraintData.weekly).sort();
        const weeklyChart = document.createElement('div');
        weeklyChart.className = 'weekly-constraint-chart';
        
        weeklyOffsets.forEach(offset => {
            const data = constraintData.weekly[offset];
            
            const barContainer = document.createElement('div');
            barContainer.className = 'constraint-bar-container';
            
            const label = document.createElement('div');
            label.className = 'constraint-label';
            label.textContent = `Week ${parseInt(offset) + 1}`;
            
            const bar = document.createElement('div');
            bar.className = 'constraint-bar';
            
            const fill = document.createElement('div');
            fill.className = 'constraint-bar-fill';
            fill.style.width = `${data.pressure}%`;
            
            // Color based on pressure (blue → green → yellow → red)
            if (data.count < data.minLimit) {
                fill.style.backgroundColor = '#64b5f6'; // Blue - below minimum
            } else if (data.pressure < 70) {
                fill.style.backgroundColor = '#81c784'; // Green - comfortably within range
            } else if (data.pressure < 90) {
                fill.style.backgroundColor = '#ffd54f'; // Yellow - approaching maximum
            } else {
                fill.style.backgroundColor = '#e57373'; // Red - at or over maximum
            }
            
            const value = document.createElement('div');
            value.className = 'constraint-value';
            value.textContent = `${data.count} (${data.minLimit}-${data.maxLimit})`;
            
            bar.appendChild(fill);
            barContainer.appendChild(label);
            barContainer.appendChild(bar);
            barContainer.appendChild(value);
            
            weeklyChart.appendChild(barContainer);
        });
        
        weeklySection.appendChild(weeklyChart);
        constraintContainer.appendChild(weeklySection);
        
        container.appendChild(constraintContainer);
    }
    
    function updateInsights(metrics) {
        const container = document.getElementById('analytics-insights-content');
        
        try {
            // Generate insights
            const insights = ScheduleAnalytics.generateInsights(metrics);
            
            // Clear container
            container.innerHTML = '';
            
            if (insights.length === 0) {
                container.innerHTML = '<p>No analytics insights available for this schedule.</p>';
                return;
            }
            
            // Create insights list
            const list = document.createElement('ul');
            list.className = 'insights-list';
            
            insights.forEach(insight => {
                const item = document.createElement('li');
                item.className = `insight-item insight-${insight.type}`;
                item.textContent = insight.message;
                list.appendChild(item);
            });
            
            container.appendChild(list);
        } catch (error) {
            console.error('Error generating insights (safely contained):', error);
            container.innerHTML = '<p>Insights unavailable</p>';
        }
    }
    
    function findWeekOffsetForDate(dateStr) {
        // Find which week offset contains this date
        for (const weekOffset in dataManager.scheduleWeeks) {
            if (dataManager.scheduleWeeks[weekOffset][dateStr]) {
                return weekOffset;
            }
        }
        return null;
    }
});