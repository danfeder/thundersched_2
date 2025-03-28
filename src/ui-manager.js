/**
 * UIManager
 * Handles direct DOM manipulation, rendering, and UI updates.
 */
class UIManager {
    // Reverted Constructor (doesn't require dataManager instance for now)
    constructor() {
                // Cache frequently accessed elements if necessary (or select when needed)
        this.messageArea = document.getElementById('message-area');
        // Add other element selections here as needed
        this.dataManager = null; // To be set later or passed into methods
        this.eventHandlerService = null; // Added for clarity
            }

    /**
     * Sets the required service dependencies for the UIManager.
     * @param {DataManager} dataManager - The DataManager instance.
     * @param {EventHandlerService} eventHandlerService - The EventHandlerService instance.
     */
    setDependencies(dataManager, eventHandlerService) {
                this.dataManager = dataManager;
        this.eventHandlerService = eventHandlerService;
                            }

    /* Original constructor requiring dataManager:
    constructor(dataManager) { // Accept DataManager instance
        if (!dataManager) {
            throw new Error("UIManager requires a DataManager instance.");
         }
         this.dataManager = dataManager; // Store DataManager instance
         // Cache frequently accessed elements if necessary (or select when needed)
         this.messageArea = document.getElementById('message-area');
         // Add other element selections here as needed
     }
 
     /**
     * Creates an element with a specified tag name, class name, and optional text content.
     * @param {string} tagName - The HTML tag name (e.g., 'div', 'button').
     * @param {string} className - The CSS class name(s) to apply.
     * @param {string} [textContent=''] - Optional text content for the element.
     * @returns {HTMLElement} The created element.
     */
    createElementWithClass(tagName, className, textContent = '') {
        const element = document.createElement(tagName);
        element.className = className;
        element.textContent = textContent;
        return element;
    }

    /**
     * Displays a message to the user in the message area.
     * @param {'info' | 'success' | 'warning' | 'error'} type - The type of message.
     * @param {string} message - The message text.
     * @param {number} [duration=4000] - How long to display the message (in ms). 0 for permanent.
     */
    showMessage(type, message, duration = 4000) {
        if (!this.messageArea) {
            console.error("Message area not found");
            return;
        }
        // Clear previous message classes
        this.messageArea.className = 'message-area'; // Reset classes

        // Add the new message type
        this.messageArea.classList.add(type);
        this.messageArea.classList.add('visible');
        this.messageArea.textContent = message;

        // Auto-hide after duration if duration is positive
        if (duration > 0) {
            // Clear any existing timer
            if (this.messageArea.timer) {
                clearTimeout(this.messageArea.timer);
            }
            this.messageArea.timer = setTimeout(() => {
                this.messageArea.classList.remove('visible');
                this.messageArea.timer = null; // Clear timer reference
            }, duration);
        }
    }

    // --- Other UI/Rendering methods will be moved here ---
    // initializeUI(...) {}
    // renderScheduleGrid(...) {}
    // renderUnscheduledClasses(...) {}
    // highlightAvailableSlots(...) {}
    // clearHighlights() {}
    // updateProgress(...) {}
    // updateCurrentWeekDisplay(...) {}
    // updateConstraintStatus(...) {}
    // showModal(modalId) {}
    // hideModal(modalId) {}
    // populateConfigForm(config) {}
    // populateSavedScheduleList(schedules) {}
    // etc.

    /**
     * Initializes the main schedule grid structure (headers, cells).
     * Attaches necessary event listeners provided by the caller.
     * @param {EventHandlerService} eventHandlerService - Instance of the service handling UI events.
     */
    initializeUI(eventHandlerService) {
                // Store the service instance for use by other rendering methods
        this.eventHandlerService = eventHandlerService;
        
        const scheduleGrid = document.getElementById('schedule-grid');
        if (!scheduleGrid) {
            console.error("Schedule grid element not found!");
            return;
        }
        // Ensure grid is empty before building structure
        scheduleGrid.innerHTML = ''; 

        // Get dates for the current week using the stored dataManager
        const weekDates = this.dataManager.getCurrentWeekDates();

        // Debug current week dates
        
        // Add empty cell in top-left corner
        scheduleGrid.appendChild(this.createElementWithClass('div', 'grid-header', ''));

        // Add date headers
        weekDates.forEach(date => {
            const dayName = this.dataManager.getDayFromDate(date);
            // Skip if it's a weekend day
            if (dayName === 'Saturday' || dayName === 'Sunday') return;

            const dateStr = this.dataManager.getFormattedDate(date);

            // Format as "Mon, Mar 17"
            const options = { weekday: 'short', month: 'short', day: 'numeric' };
            const formattedDate = date.toLocaleDateString(undefined, options);

            const headerCell = this.createElementWithClass('div', 'grid-header');
            headerCell.innerHTML = formattedDate;
            headerCell.dataset.dayname = dayName; // Add data attribute for debugging
            scheduleGrid.appendChild(headerCell);
        });

        // Add period rows with labels
        for (let period = 1; period <= 8; period++) {
            // Add period label
            scheduleGrid.appendChild(this.createElementWithClass('div', 'period-label', `Period ${period}`));

            // Add cells for each day in this period
            weekDates.forEach(date => {
                const dayName = this.dataManager.getDayFromDate(date);
                // Skip weekends
                if (dayName === 'Saturday' || dayName === 'Sunday') return;

                const dateStr = this.dataManager.getFormattedDate(date);
                const cell = this.createElementWithClass('div', 'grid-cell');
                cell.dataset.date = dateStr;
                cell.dataset.period = period;
                cell.dataset.dayname = dayName; // Add dayname for debugging

                // Attach listeners directly to the EventHandlerService methods
                if (this.eventHandlerService) {
                    // Teacher mode click handler
                    if (typeof this.eventHandlerService.handleCellClick === 'function') {
                         cell.addEventListener('click', (e) => this.eventHandlerService.handleCellClick(e));
                    } else {
                         console.warn("EventHandlerService missing handleCellClick method");
                    }

                    // Drag handlers for class scheduling
                    if (typeof this.eventHandlerService.handleDragOver === 'function') {
                         cell.addEventListener('dragover', (e) => this.eventHandlerService.handleDragOver(e));
                    } else {
                         console.warn("EventHandlerService missing handleDragOver method");
                    }

                    if (typeof this.eventHandlerService.handleDragLeave === 'function') {
                         cell.addEventListener('dragleave', (e) => this.eventHandlerService.handleDragLeave(e));
                    } else {
                         console.warn("EventHandlerService missing handleDragLeave method");
                    }
                    
                    if (typeof this.eventHandlerService.handleDrop === 'function') {
                         cell.addEventListener('drop', (e) => this.eventHandlerService.handleDrop(e));
                    } else {
                         console.warn("EventHandlerService missing handleDrop method");
                    }
                } else {
                    console.error("EventHandlerService instance not available in initializeUI");
                }

                scheduleGrid.appendChild(cell);
            });
        }
            }
    
    /**
     * Renders the main schedule grid, including scheduled classes and teacher unavailability.
     * @param {object} handlers - Object containing event handlers and state from the main app.
     * @param {function} handlers.handleScheduledClassDragStart
     * @param {function} handlers.handleDragEnd
     * @param {function} handlers.highlightAvailableSlots
     * @param {function} handlers.clearHighlights
     * @param {function} handlers.renderUnscheduledClasses
     * @param {function} handlers.updateProgress
     * @param {function} handlers.markTeacherUnavailabilityPeriods
     * @param {function} handlers.updateConstraintStatus
     * @param {boolean} handlers.teacherModeActive
     * @param {Scheduler} handlers.scheduler - Scheduler instance for validation
     * @param {object} handlers.uiEventHandlers - Handlers needed by initializeUI (e.g., handleCellClick) // Obsolete parameter
     * @param {Scheduler} scheduler - The scheduler instance for validation.
     * @param {boolean} teacherModeActive - Current state of teacher mode.
     */
    // Re-add scheduler and teacherModeActive parameters
    renderScheduleGrid(scheduler, teacherModeActive) {
                // Ensure dataManager and eventHandlerService are available
        if (!this.dataManager || !this.eventHandlerService) {
            console.error("UIManager.renderScheduleGrid: dataManager or eventHandlerService is not set.");
            return;
        }

        // Re-initialize UI structure for the *current* week in dataManager.
        // This ensures headers and cells match the data being rendered.
        this.initializeUI(this.eventHandlerService); 

        // Clear existing classes and highlights from cells before rendering new state
        // Note: initializeUI already clears the grid, so this might be redundant unless
        // we change initializeUI to not clear everything. For now, keep it simple.
        // document.querySelectorAll('.grid-cell').forEach(cell => { ... }); // Clearing is handled by initializeUI

        const schedule = this.dataManager.getSchedule();
        // DEBUG: Log the schedule data being used for rendering
                
        // Add scheduled classes to grid
        Object.entries(schedule).forEach(([dateStr, periods]) => {
            Object.entries(periods).forEach(([period, className]) => {
                if (className) {
                    const cell = document.querySelector(`.grid-cell[data-date="${dateStr}"][data-period="${period}"]`);
                                        if (cell) {
                        const classElement = this.createElementWithClass('div', 'scheduled-class', className);
                        
                        // Make scheduled classes draggable
                        classElement.draggable = true;
                        classElement.dataset.className = className;
                        classElement.dataset.originalDate = dateStr;
                        classElement.dataset.originalPeriod = period;
                        
                        // Add drag and click handlers using the stored EventHandlerService
                        if (this.eventHandlerService) {
                             if (typeof this.eventHandlerService.handleScheduledClassDragStart === 'function') {
                                  classElement.addEventListener('dragstart', (e) => this.eventHandlerService.handleScheduledClassDragStart(e));
                             } else {
                                  console.warn("EventHandlerService missing handleScheduledClassDragStart method");
                             }
                             if (typeof this.eventHandlerService.handleDragEnd === 'function') {
                                  classElement.addEventListener('dragend', (e) => this.eventHandlerService.handleDragEnd(e));
                             } else {
                                  console.warn("EventHandlerService missing handleDragEnd method");
                             }
                        } else {
                             console.error("EventHandlerService instance not available in renderScheduleGrid");
                        }

                        // Use internal highlightAvailableSlots, passing the scheduler
                        if (scheduler) {
                            classElement.addEventListener('click', (e) => {
                                e.stopPropagation(); // Prevent cell click
                                this.highlightAvailableSlots(className, scheduler); // Use passed scheduler
                            });
                            
                            // Add hover preview functionality for scheduled classes too
                            classElement.addEventListener('mouseenter', () => {
                                classElement.hoverTimer = setTimeout(() => {
                                    this.highlightAvailableSlots(className, scheduler); // Use passed scheduler
                                    classElement.classList.add('hovering');
                                }, 200);
                            });
                            
                            classElement.addEventListener('mouseleave', () => {
                                if (classElement.hoverTimer) {
                                    clearTimeout(classElement.hoverTimer);
                                }
                                // Only clear highlights if we're not currently dragging
                                if (!document.querySelector('.dragging')) {
                                    this.clearHighlights();
                                }
                                classElement.classList.remove('hovering');
                            });
                        } else {
                             console.warn("Scheduler instance not available via EventHandlerService for click/hover highlights");
                        }
                        
                        // Add double-click to unschedule
                        classElement.addEventListener('dblclick', () => {
                             if (confirm(`Remove ${className} from this time slot?`)) {
                                  this.dataManager.unscheduleClass(dateStr, period);
                                  
                                  // Explicitly save to localStorage (Consider moving this logic out later)
                                  if (window.saveScheduleToLocalStorage) { // Keep global check for now
                                       window.saveScheduleToLocalStorage();
                                  }
                                  
                                  // Re-render UI 
                                  this.renderScheduleGrid(scheduler, teacherModeActive); 
                                  this.renderUnscheduledClasses(scheduler); 
                                  this.updateProgress();
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
        
        // Mark teacher unavailable periods using internal method
        this.markTeacherUnavailabilityPeriods();
        
        // Apply teacher mode active class using the passed argument
        if (teacherModeActive) {
            document.querySelectorAll('.grid-cell:not(.scheduled)').forEach(cell => {
                cell.classList.add('teacher-mode-active');
            });
        } else {
             // Ensure class is removed if teacher mode is deactivated
             document.querySelectorAll('.grid-cell.teacher-mode-active').forEach(cell => {
                cell.classList.remove('teacher-mode-active');
            });
        }
        
        // Update constraint status indicators using internal method and passed scheduler
        if (scheduler) {
            this.updateConstraintStatus(scheduler);
        } else {
             console.warn("Scheduler instance not passed to renderScheduleGrid for updateConstraintStatus");
        }
    
            }
    
    /**
     * Renders the list of unscheduled classes in the sidebar.
     * @param {object} handlers - Object containing event handlers from the main app.
     * @param {function} handlers.handleDragStart
     * @param {function} handlers.handleDragEnd
     * @param {function} handlers.highlightAvailableSlots
     * @param {function} handlers.clearHighlights // Obsolete
     * @param {Scheduler} scheduler - Scheduler instance for validation (passed directly)
     */
    // Add scheduler parameter back
    renderUnscheduledClasses(scheduler) {
                // Ensure dataManager is available
        if (!this.dataManager) {
            console.error("UIManager.renderUnscheduledClasses: dataManager is not set.");
            return;
        }
        
        const unscheduledClassesContainer = document.getElementById('unscheduled-classes');
        if (!unscheduledClassesContainer) {
             console.error("Unscheduled classes container not found!");
             return;
        }
        unscheduledClassesContainer.innerHTML = '';
        
        const unscheduledClasses = this.dataManager.getUnscheduledClasses();
        
        unscheduledClasses.forEach(classInfo => {
            const classElement = this.createElementWithClass('div', 'class-item', classInfo.name);
            classElement.draggable = true;
            classElement.dataset.className = classInfo.name;
            
            // Add event listeners using the stored EventHandlerService
            if (this.eventHandlerService) {
                 if (typeof this.eventHandlerService.handleDragStart === 'function') {
                      classElement.addEventListener('dragstart', (e) => this.eventHandlerService.handleDragStart(e));
                 } else {
                      console.warn("EventHandlerService missing handleDragStart method");
                 }
                 if (typeof this.eventHandlerService.handleDragEnd === 'function') {
                      classElement.addEventListener('dragend', (e) => this.eventHandlerService.handleDragEnd(e));
                 } else {
                      console.warn("EventHandlerService missing handleDragEnd method");
                 }
            } else {
                 console.error("EventHandlerService instance not available in renderUnscheduledClasses");
            }

            // Use internal highlightAvailableSlots, passing the scheduler argument
            if (scheduler) {
                classElement.addEventListener('click', () => this.highlightAvailableSlots(classInfo.name, scheduler)); // Use passed scheduler
                
                // Add hover preview functionality
                classElement.addEventListener('mouseenter', () => {
                    classElement.hoverTimer = setTimeout(() => {
                        this.highlightAvailableSlots(classInfo.name, scheduler); // Use passed scheduler
                        classElement.classList.add('hovering');
                    }, 200);
                });
                
                classElement.addEventListener('mouseleave', () => {
                    if (classElement.hoverTimer) {
                        clearTimeout(classElement.hoverTimer);
                    }
                    // Only clear highlights if we're not currently dragging
                    if (!document.querySelector('.dragging')) {
                        this.clearHighlights();
                    }
                    classElement.classList.remove('hovering');
                });
            } else {
                 console.warn("Scheduler instance not available via EventHandlerService for click/hover highlights");
            }
            
            unscheduledClassesContainer.appendChild(classElement);
        });
            }
    
    /**
     * Highlights available slots on the grid for a given class.
     * @param {string} className - The name of the class to check slots for.
     * @param {Scheduler} scheduler - The scheduler instance for validation.
     */
    highlightAvailableSlots(className, scheduler) {
        // Ensure dataManager and scheduler are available
        if (!this.dataManager) {
            console.error("UIManager.highlightAvailableSlots: dataManager is not set.");
            return;
        }
        if (!scheduler) {
            console.error("UIManager.highlightAvailableSlots: scheduler instance is required.");
            return;
        }
        
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
        
        // Get current week dates using internal dataManager
        const weekDates = this.dataManager.getCurrentWeekDates();
        
        // Get the class info to check conflicts using internal dataManager
        const classInfo = this.dataManager.getClasses().find(c => c.name === className);
        if (!classInfo) return;
        
        // Process all cells on the grid
        weekDates.forEach(date => {
            const dateStr = this.dataManager.getFormattedDate(date);
            const dayOfWeek = this.dataManager.getDayFromDate(date);
            
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
                
                // Check for other constraints using the passed scheduler instance
                const validation = scheduler.isValidPlacement(className, dateStr, period);
                
                if (validation.valid) {
                    // No conflicts, mark as available - even if teacher is unavailable
                    cell.classList.add('available');
                    
                    // Set appropriate tooltip based on teacher availability using internal dataManager
                    if (this.dataManager.isTeacherUnavailable(dateStr, period)) {
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
                if (this.dataManager.isTeacherUnavailable(dateStr, period)) {
                    cell.classList.add('teacher-unavailable');
                }
            }
        });
        // console.log("UIManager: Slots Highlighted for", className); // Optional log
    }
    
    /**
     * Clears all 'available', 'conflict', and 'dragover' classes from grid cells,
     * and resets tooltips on non-scheduled cells.
     */
    clearHighlights() {
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
        // console.log("UIManager: Highlights Cleared"); // Optional log
    }
    
    /**
     * Updates the progress bar and text based on the number of scheduled classes.
     */
    updateProgress() {
        // Ensure dataManager is available
        if (!this.dataManager) {
            console.error("UIManager.updateProgress: dataManager is not set.");
            return;
        }
        
        const totalClasses = this.dataManager.getClasses().length;
        // Handle division by zero if there are no classes
        if (totalClasses === 0) {
            const progressBar = document.getElementById('schedule-progress');
            const progressText = document.getElementById('progress-text');
            if (progressBar) progressBar.style.width = '0%';
            if (progressText) progressText.textContent = '0 of 0 classes scheduled';
            return;
        }
        
        const scheduledClassCount = totalClasses - this.dataManager.getUnscheduledClasses().length;
        const progressPercent = (scheduledClassCount / totalClasses) * 100;
        
        // Update progress bar
        const progressBar = document.getElementById('schedule-progress');
        if (progressBar) {
            progressBar.style.width = `${progressPercent}%`;
        } else {
            console.warn("Progress bar element not found");
        }
        
        // Update text
        const progressText = document.getElementById('progress-text');
        if (progressText) {
            progressText.textContent = `${scheduledClassCount} of ${totalClasses} classes scheduled`;
        } else {
            console.warn("Progress text element not found");
        }
        // console.log("UIManager: Progress Updated"); // Optional log
    }
    
    /**
     * Updates the text display showing the current week's date range.
     */
    updateCurrentWeekDisplay() {
        const weekDisplay = document.getElementById('current-week-display');
        if (!weekDisplay) {
            console.warn("Current week display element not found");
            return;
        }
        
        // Ensure dataManager is available
        if (!this.dataManager) {
            console.error("UIManager.updateCurrentWeekDisplay: dataManager is not set.");
            weekDisplay.textContent = "Week dates unavailable";
            return;
        }
        
        const dates = this.dataManager.getCurrentWeekDates();
        
        if (dates && dates.length > 0) {
            // Ensure we're using the actual Monday-Friday range that the calendar shows
            const startDate = dates[0];
            const endDate = dates[dates.length - 1];
            
            // Format as "Mar 17 - Mar 21, 2025"
            const formatOptions = { month: 'short', day: 'numeric' };
            const yearOptions = { year: 'numeric' };
            
            const formattedStart = startDate.toLocaleDateString(undefined, formatOptions);
            const formattedEnd = endDate.toLocaleDateString(undefined, formatOptions);
            const year = endDate.toLocaleDateString(undefined, yearOptions);
            
            weekDisplay.textContent = `${formattedStart} - ${formattedEnd}, ${year}`;
        } else {
            weekDisplay.textContent = "Week dates unavailable";
        }
        // console.log("UIManager: Current Week Display Updated"); // Optional log
    }
    
    /**
     * Updates the constraint status indicators in the UI based on current config and schedule.
     * @param {Scheduler} scheduler - The scheduler instance to get counts.
     */
    updateConstraintStatus(scheduler) {
        // Ensure dataManager and scheduler are available
        if (!this.dataManager) {
            console.error("UIManager.updateConstraintStatus: dataManager is not set.");
            return;
        }
        if (!scheduler) {
            console.error("UIManager.updateConstraintStatus: scheduler instance is required.");
            return;
        }
        
        const config = this.dataManager.getConfig();
        const weeklyClasses = scheduler.countWeeklyClasses();
        
        const weekCountEl = document.getElementById('week-count');
        const weekLimitEl = document.getElementById('week-limit');
        const indicator = document.getElementById('weekly-constraint-indicator');
        
        if (weekCountEl) weekCountEl.textContent = weeklyClasses;
        if (weekLimitEl) weekLimitEl.textContent = `${config.minClassesPerWeek}-${config.maxClassesPerWeek}`;
        
        if (indicator) {
            if (weeklyClasses > config.maxClassesPerWeek) {
                indicator.className = 'constraint-indicator exceeded';
            } else if (weeklyClasses >= config.minClassesPerWeek) {
                indicator.className = 'constraint-indicator optimal';
            } else {
                indicator.className = 'constraint-indicator under';
            }
        } else {
            console.warn("Weekly constraint indicator element not found");
        }
        // console.log("UIManager: Constraint Status Updated"); // Optional log
    }
    
    /**
     * Marks cells on the grid where the teacher is marked as unavailable.
     */
    markTeacherUnavailabilityPeriods() {
        // Ensure dataManager is available
        if (!this.dataManager) {
            console.error("UIManager.markTeacherUnavailabilityPeriods: dataManager is not set.");
            return;
        }
        
        // Get dates for the current week
        const weekDates = this.dataManager.getCurrentWeekDates();
        
        weekDates.forEach(date => {
            const dateStr = this.dataManager.getFormattedDate(date);
            
            // Check each period for teacher unavailability
            for (let period = 1; period <= 8; period++) {
                const cell = document.querySelector(`.grid-cell[data-date="${dateStr}"][data-period="${period}"]`);
                if (!cell) continue;
                
                // First remove any existing unavailability marker
                cell.classList.remove('teacher-unavailable');
                
                // Then check and add marker if unavailable
                if (this.dataManager.isTeacherUnavailable(dateStr, period)) {
                    cell.classList.add('teacher-unavailable');
                    // Update title only if the cell isn't already scheduled or marked as a conflict
                    if (!cell.classList.contains('scheduled') && !cell.classList.contains('conflict')) {
                         cell.title = 'Conflict: Teacher is unavailable during this period.';
                    }
                }
            }
        });
        // console.log("UIManager: Teacher Unavailability Marked"); // Optional log
    }
  }
  
  // Export an instance or the class depending on desired usage pattern
// Using a single instance might be simpler for now
// Instantiate with a placeholder or handle dependency differently later
// For now, let's assume DataManager is globally available or handle it in app.js
// Reverting to default export for compatibility with class-manager.js

// !!! This needs a proper DataManager instance. We'll rely on app.js to create it first.
// This is a temporary workaround until dependency injection is fully implemented.
let uiManager;
// We cannot instantiate here without DataManager. app.js will create and potentially expose it.
// Or, we revert the constructor change temporarily. Let's revert constructor too.

// Reverted Constructor:
// constructor() {
//     this.dataManager = null; // Will be set by app.js or refactored later
//     this.messageArea = document.getElementById('message-area');
// }

// --- Reverting to simple instance export ---
// Note: The initializeUI method added previously still needs dataManager.
// This highlights the need for proper dependency management.
// For now, let's revert the constructor change as well to avoid errors on load.

// --- Misplaced constructor removed ---

// Re-exporting default instance
uiManager = new UIManager(); // Create instance (constructor doesn't need dataManager now)
export default uiManager;