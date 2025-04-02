import { UIManager } from './ui-manager.js'; // Use named import for the class
import { getDayFromDate, getFormattedDate } from './date-utils.js'; // Import date utilities
// Import other necessary services/modules as needed
// import dataManager from './data-manager.js'; // Example if needed
// import scheduler from './scheduler.js'; // Example if needed

/**
 * Centralized service for handling complex UI interactions and orchestrating actions.
 * Listens for events from UIManager and dispatches higher-level actions.
 */
class EventHandlerService {
    /**
     * @param {import('./repositories/schedule-repository.js').ScheduleRepository} scheduleRepository
     * @param {import('./scheduler.js').Scheduler} scheduler
     * @param {import('./ui-manager.js').UIManager} uiManager
     * @param {import('./config-controller.js').default} configController
     * @param {import('./save-load-controller.js').default} saveLoadController
     * @param {import('./analytics-controller.js').default} analyticsController
     * @param {import('./what-if-controller.js').default} whatIfController
     */
    constructor(scheduleRepository, scheduler, uiManager, configController, saveLoadController, analyticsController, whatIfController) {
        this.scheduleRepository = scheduleRepository; // Use scheduleRepository
        this.scheduler = scheduler;
        this.uiManager = uiManager;
        this.configController = configController;
        this.saveLoadController = saveLoadController;
        this.analyticsController = analyticsController;
        this.whatIfController = whatIfController;
        console.log("EventHandlerService initialized");
        // TODO: Add event listeners for events emitted by UIManager
        // e.g., uiManager.on('ui:cellClicked', this.handleCellClick.bind(this));
        // e.g., uiManager.on('ui:classDragStart', this.handleDragStart.bind(this));
        // ... etc.
    }

    // --- Drag and Drop Handlers ---

    handleDragStart(e) {
        const className = e.target.dataset.className;
        e.dataTransfer.setData('text/plain', className);
        e.dataTransfer.setData('source', 'unscheduled');
        e.target.classList.add('dragging');
        
        // Add dragging-active class to the schedule grid to dim other classes
        document.getElementById('schedule-grid').classList.add('dragging-active');
        
        // Immediately show available slots and conflicts when dragging starts
        this.uiManager.highlightAvailableSlots(className, this.scheduler); // Use this.uiManager
    }
    
    handleScheduledClassDragStart(e) {
        const className = e.target.dataset.className; // Fix: Get className here
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
        this.uiManager.highlightAvailableSlots(className, this.scheduler); // Use this.uiManager
    }
    
    handleDragOver(e) {
        e.preventDefault(); // Necessary to allow dropping
        // Add dragover class for visual feedback on both available and conflict cells
        const cell = e.target.closest('.grid-cell');
        if (cell) {
            if (cell.classList.contains('available') || cell.classList.contains('conflict')) {
                cell.classList.add('dragover');
            }
        }
    }
    
    handleDragLeave(e) {
        // Remove dragover class when leaving a cell
        const cell = e.target.closest('.grid-cell');
        if (cell) {
            cell.classList.remove('dragover');
        }
    }
    
    handleDragEnd(e) {
        // Remove the dragging class
        // Check if target exists before removing class
        if (e.target) {
             e.target.classList.remove('dragging');
        }
        
        // Remove dragging-active class from schedule grid
        document.getElementById('schedule-grid').classList.remove('dragging-active');
        
        // Clear any dragover classes
        document.querySelectorAll('.dragover').forEach(el => {
            el.classList.remove('dragover');
        });
        
        // Clear highlighted cells when drag is canceled (not dropped)
        this.uiManager.clearHighlights(); // Use this.uiManager
    }
    
    handleDrop(e) {
        e.preventDefault();
        const className = e.dataTransfer.getData('text/plain');
        const source = e.dataTransfer.getData('source');
        const targetElement = e.target.closest('.grid-cell') || e.target; // Ensure we get the cell or its content
        const dateStr = targetElement.dataset.date;
        const period = targetElement.dataset.period;
        
        // Log target and dataset info
        console.log(`[handleDrop] Event target:`, e.target);
        console.log(`[handleDrop] Target element:`, targetElement);
        console.log(`[handleDrop] Target dataset:`, JSON.stringify(targetElement.dataset));
        console.log(`[handleDrop] Derived dateStr: ${dateStr}, period: ${period}`);

        // Remove dragging class
        document.querySelector('.dragging')?.classList.remove('dragging');
        
        // Remove dragging-active class from schedule grid
        document.getElementById('schedule-grid').classList.remove('dragging-active');
        
        // Remove any dragover classes
        document.querySelectorAll('.dragover').forEach(el => el.classList.remove('dragover'));
        
        if (!dateStr || !period) {
            console.warn('[handleDrop] Drop target lacks date/period data.');
            this.uiManager.clearHighlights(); // Use this.uiManager
            return;
        }
        
        // If this is a scheduled class being moved, remove it from its original position first
        if (source === 'scheduled') {
            const originalDate = e.dataTransfer.getData('originalDate');
            const originalPeriod = e.dataTransfer.getData('originalPeriod');
            
            // If dropping on same position, do nothing
            if (originalDate === dateStr && originalPeriod === period) {
                this.uiManager.clearHighlights(); // Use this.uiManager
                return;
            }
            
            // Remove from original position
            this.scheduleRepository.unscheduleClass(originalDate, originalPeriod); // Use scheduleRepository
            
            // Explicitly save to localStorage after unscheduling from original position
            if (window.saveScheduleToLocalStorage) { // Keep global check for now
                window.saveScheduleToLocalStorage();
            }
        }
        
        // First check if there's a class-specific conflict (these always take priority)
        // Access classRepository via scheduleRepository
        const classInfo = this.scheduleRepository.classRepository.getClasses().find(c => c.name === className);
        if (classInfo) {
            // Get the day of week for this date
            const [year, month, day] = dateStr.split('-').map(num => parseInt(num, 10));
            const date = new Date(year, month - 1, day);
            const dayOfWeek = getDayFromDate(date); // Use imported function
            
            // Check for class conflict directly - this is a hard constraint that cannot be overridden
            if (classInfo.conflicts[dayOfWeek] &&
                classInfo.conflicts[dayOfWeek].includes(Number(period))) {
                
                // Show error message
                this.uiManager.showMessage('error', `Cannot place ${className} here: Class has a conflict during this period.`); // Use this.uiManager

                // If this was a scheduled class that we removed, put it back
                if (source === 'scheduled') {
                    const originalDate = e.dataTransfer.getData('originalDate');
                    const originalPeriod = e.dataTransfer.getData('originalPeriod');
                    this.scheduleRepository.scheduleClass(className, originalDate, originalPeriod); // Use scheduleRepository
                    this.uiManager.renderScheduleGrid(this.scheduler, this.teacherModeActive); // Use this.uiManager
                }
                this.uiManager.clearHighlights(); // Use this.uiManager
                return; // Don't proceed with placement
            }
        }
        
        // ONLY THEN check for teacher unavailability (which can be overridden)
        if (this.scheduleRepository.isTeacherUnavailable(dateStr, period)) { // Use scheduleRepository
            // Use uiManager's confirm dialog if available, otherwise fallback
            const confirmOverride = confirm('Teacher is unavailable during this period. Are you sure you want to schedule a class here?');
            if (!confirmOverride) {
                // If user cancels, put the class back if it was scheduled
                if (source === 'scheduled') {
                    const originalDate = e.dataTransfer.getData('originalDate');
                    const originalPeriod = e.dataTransfer.getData('originalPeriod');
                    this.scheduleRepository.scheduleClass(className, originalDate, originalPeriod); // Use scheduleRepository
                    this.uiManager.renderScheduleGrid(this.scheduler, this.teacherModeActive); // Use this.uiManager and pass args
                }
                this.uiManager.clearHighlights(); // Use this.uiManager
                return;
            }
            // If user confirms, continue with placement
        }
        
        // Validate placement for other constraints
        const validation = this.scheduler.isValidPlacement(className, dateStr, period); // Use this.scheduler
        
        if (validation.valid) {
            // Schedule the class
            this.scheduleRepository.scheduleClass(className, dateStr, period); // Use scheduleRepository
            
            // Explicitly save to localStorage to ensure persistence
            if (window.saveScheduleToLocalStorage) { // Keep global check for now
                window.saveScheduleToLocalStorage();
            }
            
            // Update UI
            this.uiManager.renderScheduleGrid(this.scheduler, this.teacherModeActive); // Use this.uiManager
            this.uiManager.renderUnscheduledClasses(this.scheduler); // Use this.uiManager
            this.uiManager.updateProgress(); // Use this.uiManager
            
            // Clear highlights
            this.uiManager.clearHighlights(); // Use this.uiManager
            
            // Show success message for rescheduled classes
            if (source === 'scheduled') {
                const date = new Date(dateStr + 'T00:00:00Z'); // Ensure UTC parsing
                const dayName = this.scheduleRepository.dateUtils.getDayFromDate(date); // Use scheduleRepository.dateUtils
                this.uiManager.showMessage('success', `Moved ${className} to ${dayName}, ${dateStr}, Period ${period}`); // Use this.uiManager
            } else {
                 this.uiManager.showMessage('success', `Scheduled ${className} successfully.`); // Use this.uiManager
            }
        } else {
            // If this was a scheduled class that we removed, put it back
            if (source === 'scheduled') {
                const originalDate = e.dataTransfer.getData('originalDate');
                const originalPeriod = e.dataTransfer.getData('originalPeriod');
                this.scheduleRepository.scheduleClass(className, originalDate, originalPeriod); // Use scheduleRepository
                this.uiManager.renderScheduleGrid(this.scheduler, this.teacherModeActive); // Use this.uiManager and pass args
            }

            // Show error message
            this.uiManager.showMessage('error', `Cannot place class here: ${validation.reason}`); // Use this.uiManager
            this.uiManager.clearHighlights(); // Use this.uiManager
        }
    }

    // --- Button/Action Handlers ---

    suggestNextClass() {
        // Clear any previous suggestions
        document.querySelectorAll('.class-item.suggested').forEach(item => {
            item.classList.remove('suggested');
        });
        
        // Get next suggested class
        const suggestedClass = this.scheduler.suggestNextClass(); // Use this.scheduler
        
        if (suggestedClass) {
            // Highlight the suggested class
            const classElement = document.querySelector(`.class-item[data-class-name="${suggestedClass.name}"]`);
            if (classElement) {
                classElement.classList.add('suggested');
                classElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                
                // Highlight available slots for this class
                this.uiManager.highlightAvailableSlots(suggestedClass.name, this.scheduler); // Use this.uiManager
            }
        } else {
            this.uiManager.showMessage('success', 'All classes have been scheduled!'); // Use this.uiManager
        }
    }

    exportSchedule() {
        // Get all weeks from the schedule via the DataStore
        const allWeeks = this.dataManager.dataStore.scheduleWeeks; // Access via dataStore
        
        // Create CSV content
        let csvContent = 'Date,Day,Period 1,Period 2,Period 3,Period 4,Period 5,Period 6,Period 7,Period 8\n';
        
        // Sort weeks by offset
        const sortedWeekOffsets = Object.keys(allWeeks).sort((a, b) => Number(a) - Number(b));
        
        sortedWeekOffsets.forEach(weekOffset => {
            const weekSchedule = allWeeks[weekOffset];
            
            // Sort dates within each week
            const sortedDates = Object.keys(weekSchedule).sort();
            
            sortedDates.forEach(dateStr => {
                const date = new Date(dateStr + 'T00:00:00Z'); // Ensure UTC parsing
                const dayName = getDayFromDate(date); // Use imported function
                
                let row = `${dateStr},${dayName}`;
                
                // Add each period
                for (let period = 1; period <= 8; period++) {
                    const className = weekSchedule[dateStr]?.[period] || ''; // Safer access
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
        this.uiManager.showMessage('success', 'Complete schedule for all weeks exported successfully!'); // Use this.uiManager
    }

    resetSchedule() {
        // Use uiManager's confirm dialog if available, otherwise fallback
        if (confirm('Are you sure you want to reset the schedule for the current week? This will remove all scheduled classes for this week only.')) {
            // Reset the schedule
            this.scheduleRepository.resetSchedule(); // Use scheduleRepository
            
            // Update UI (These should ideally be triggered by events later)
            this.uiManager.renderScheduleGrid(this.scheduler, this.teacherModeActive); // Use this.uiManager
            this.uiManager.renderUnscheduledClasses(this.scheduler); // Use this.uiManager
            this.uiManager.updateProgress(); // Use this.uiManager
            this.uiManager.clearHighlights(); // Use this.uiManager

            // Show message
            this.uiManager.showMessage('info', 'Schedule for the current week has been reset.'); // Use this.uiManager
        }
    }
navigateWeek(direction) {
    // Navigate to previous or next week
    this.scheduleRepository.changeWeek(direction); // Use scheduleRepository
    
    
        
        // Update UI (These should ideally be triggered by events later)
        this.uiManager.renderScheduleGrid(this.scheduler, this.teacherModeActive); // Use this.uiManager
        this.uiManager.updateProgress(); // Use this.uiManager
        this.uiManager.clearHighlights(); // Use this.uiManager
        this.uiManager.updateCurrentWeekDisplay(); // Use this.uiManager
    }

    setStartDate(event) {
        const startDateInput = event.target; // Event listener context provides target
        const dateValue = startDateInput.value;
        
        if (dateValue) {
            try {
                // Show visual feedback that change is happening
                startDateInput.classList.add('updating');
                this.uiManager.showMessage('info', 'Updating schedule...'); // Use this.uiManager

                // Use setTimeout to allow the UI to update before processing
                setTimeout(() => {
                    // Parse the date from the input - use proper date construction to avoid timezone issues
                    const [year, month, day] = dateValue.split('-').map(num => parseInt(num, 10));
                    // Month is 0-indexed in JavaScript Date
                    const newStartDate = new Date(year, month - 1, day, 0, 0, 0);
                    
                    console.log("Selected date value:", dateValue);
                    console.log("Parsed date object:", newStartDate.toDateString());
                    
                    // Set the new start date
                    this.scheduleRepository.setStartDate(newStartDate); // Use scheduleRepository
                    
                    // Update UI (These should ideally be triggered by events later)
                    this.uiManager.renderScheduleGrid(this.scheduler, this.teacherModeActive); // Use this.uiManager
                    this.uiManager.updateProgress(); // Use this.uiManager
                    this.uiManager.updateConstraintStatus(this.scheduler); // Use this.uiManager
                    this.uiManager.clearHighlights(); // Use this.uiManager
                    this.uiManager.updateCurrentWeekDisplay(); // Use this.uiManager
                    
                    // Update date picker to show the Monday of the week
                    // Access dataStore via scheduleRepository
                    const mondayDate = getFormattedDate(this.scheduleRepository.dataStore.scheduleStartDate);
                    startDateInput.value = mondayDate;
                    
                    // Format date for display
                    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                    const displayDate = this.scheduleRepository.dataStore.scheduleStartDate.toLocaleDateString(undefined, options);
                    this.uiManager.showMessage('success', `Viewing week of ${displayDate}`); // Use this.uiManager

                    // Remove updating class
                    startDateInput.classList.remove('updating');
                }, 50);
            } catch (error) {
                console.error("Date parsing error:", error);
                startDateInput.classList.remove('updating');
                this.uiManager.showMessage('error', 'Invalid date format. Please try again.'); // Use this.uiManager
            }
        } else {
            this.uiManager.showMessage('error', 'Please select a valid date'); // Use this.uiManager
        }
    }

    // --- Teacher Mode Handlers ---
    // Need to manage teacherModeActive state within this service
    teacherModeActive = false; // Add as a class property

    toggleTeacherMode(e) {
        this.teacherModeActive = e.target.checked; // Use this.teacherModeActive
        
        if (this.teacherModeActive) {
            // Enable teacher mode UI
            this.uiManager.showMessage('info', 'Teacher Mode active. Click on time slots to mark when you are unavailable.', 6000); // Use this.uiManager
            document.querySelectorAll('.grid-cell:not(.scheduled)').forEach(cell => {
                cell.classList.add('teacher-mode-active');
            });
        } else {
            // Disable teacher mode UI
            this.uiManager.showMessage('info', 'Teacher Mode disabled. Back to regular scheduling mode.', 4000); // Use this.uiManager
            document.querySelectorAll('.grid-cell').forEach(cell => {
                cell.classList.remove('teacher-mode-active');
            });
        }
        // Re-render grid to apply/remove visual styles consistently
        // TODO: Ideally, UIManager would handle adding/removing a class to a container element instead of full re-render
        this.uiManager.renderScheduleGrid(this.scheduler, this.teacherModeActive); // Use this.uiManager
    }

    handleCellClick(e) {
        const cell = e.target.closest('.grid-cell');
        if (!cell) return;
        
        // Handle teacher mode clicks
        if (this.teacherModeActive && !cell.classList.contains('scheduled')) { // Use this.teacherModeActive
            const dateStr = cell.dataset.date;
            const period = cell.dataset.period;
            
            // Toggle the teacher unavailability for this period
            const isNowUnavailable = this.scheduleRepository.toggleTeacherUnavailability(dateStr, period); // Use scheduleRepository
            
            // Explicitly save to localStorage to ensure persistence
            if (window.saveTeacherUnavailabilityToLocalStorage) { // Keep global check for now
                window.saveTeacherUnavailabilityToLocalStorage();
                console.log("Teacher unavailability saved for:", dateStr, period, isNowUnavailable);
            }
            
            // Update the visual indicator directly on the cell
            if (isNowUnavailable) {
                cell.classList.add('teacher-unavailable');
                cell.title = 'Conflict: Teacher is unavailable during this period.';
            } else {
                cell.classList.remove('teacher-unavailable');
                cell.removeAttribute('title');
            }
            
            // Update any class highlights if a class is selected
            const selectedClassElement = document.querySelector('.class-item.suggested'); // Renamed variable
            if (selectedClassElement) {
                // highlightAvailableSlots was moved to uiManager
                this.uiManager.highlightAvailableSlots(selectedClassElement.dataset.className, this.scheduler); // Use this.uiManager
            }
        }
        // TODO: Add handling for regular cell clicks (e.g., showing class details) if needed here later
    }

    // --- Attach Global Listeners ---

    attachGlobalListeners() {
        console.log("EventHandlerService: Attaching global listeners...");

        // Button listeners
        document.getElementById('suggest-next-btn')?.addEventListener('click', () => this.suggestNextClass());
        document.getElementById('export-btn')?.addEventListener('click', () => this.exportSchedule());
        // Help button - TODO: Create HelpController or move showHelp logic here/UIManager
        document.getElementById('help-btn')?.addEventListener('click', () => {
             // console.warn('showHelp handler needs to be moved');
             const helpModal = document.getElementById('help-modal');
             if (helpModal) helpModal.style.display = 'block'; // Basic show
        });
        // Reset button calls method on this service
        document.getElementById('reset-btn')?.addEventListener('click', () => this.resetSchedule());
        
        // Modal Trigger Buttons call methods on respective controllers
        document.getElementById('config-btn')?.addEventListener('click', () => {
             if (this.configController) this.configController.showConfigModal();
             else console.error("ConfigController not available");
        });
        document.getElementById('save-schedule-btn')?.addEventListener('click', () => {
             if (this.saveLoadController) this.saveLoadController.showSaveScheduleModal();
             else console.error("SaveLoadController not available");
        });
        document.getElementById('load-schedule-btn')?.addEventListener('click', () => {
             if (this.saveLoadController) this.saveLoadController.showLoadScheduleModal();
             else console.error("SaveLoadController not available");
        });
        document.getElementById('analytics-btn')?.addEventListener('click', () => {
             if (this.analyticsController) this.analyticsController.showAnalyticsModal();
             else console.error("AnalyticsController not available");
        });
        // Attach listener for the What-If button (likely inside Analytics modal)
        document.getElementById('show-what-if-btn')?.addEventListener('click', () => {
            if (this.whatIfController) this.whatIfController.showWhatIfAnalysis();
            else console.error("WhatIfController not available");
        });

        // Teacher mode toggle calls method on this service
        const teacherModeToggle = document.getElementById('teacher-mode');
        if (teacherModeToggle) {
            teacherModeToggle.addEventListener('change', (e) => this.toggleTeacherMode(e));
        } else {
             console.warn("Teacher mode toggle element not found");
        }

        // Week navigation
        document.getElementById('prev-week-btn')?.addEventListener('click', () => this.navigateWeek(-1));
        document.getElementById('next-week-btn')?.addEventListener('click', () => this.navigateWeek(1));

        // Date picker change event
        const datePicker = document.getElementById('start-date');
        if (datePicker) {
             datePicker.addEventListener('change', (e) => this.setStartDate(e));
        } else {
             console.warn("Start date picker element not found");
        }

        // Add listeners for modal form submissions
        const configForm = document.getElementById('config-form');
        if (configForm) {
            configForm.addEventListener('submit', (event) => {
                event.preventDefault(); // Prevent default page reload
                if (this.configController) {
                    this.configController.handleConfigFormSubmit(); // Call controller method
                } else {
                    console.error("ConfigController not available for form submission");
                }
            });
        } else {
            console.warn("Config form element not found");
        }
        
        // Example: document.getElementById('save-schedule-form')?.addEventListener('submit', (e) => this.handleSaveScheduleSubmit(e));
        
        console.log("EventHandlerService: Global listeners attached.");
    }

    // --- Placeholder methods for handlers to be moved from app.js ---

    // Example: Modal Handlers
    // showConfigModal() { ... }
    // handleConfigFormSubmit(event) { ... }
    // resetConfigForm() { ... }
    // showSaveScheduleModal() { ... }
    // handleSaveScheduleSubmit(event) { ... }
    // showLoadScheduleModal() { ... }
    // handleLoadScheduleClick(scheduleName) { ... }
    // handleDeleteScheduleClick(scheduleName) { ... }
    // handlePreviewScheduleClick(scheduleName) { ... }
    // handleLoadPreviewClick(scheduleName) { ... }
    // showAnalyticsModal() { ... }

    // ... other handlers ...
}

// Decide whether to export an instance or the class itself.
// For now, let's assume it might be instantiated in AppInitializer.
export default EventHandlerService;