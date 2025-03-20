// Main application logic

document.addEventListener('DOMContentLoaded', async () => {
    const dataManager = new DataManager();
    const scheduler = new Scheduler(dataManager);
    
    // Make dataManager available globally for the class manager
    window.dataManager = dataManager;
    
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
    
    // Show welcome message
    showMessage('info', 'Welcome! Click on a class to see available slots, then drag and drop to schedule it.', 6000);
    
    // Add event listeners for buttons
    document.getElementById('suggest-next-btn').addEventListener('click', suggestNextClass);
    document.getElementById('export-btn').addEventListener('click', exportSchedule);
    document.getElementById('help-btn').addEventListener('click', showHelp);
    document.getElementById('reset-btn').addEventListener('click', resetSchedule);
    
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
    
    // Help modal close button
    document.querySelector('.close').addEventListener('click', () => {
        document.getElementById('help-modal').style.display = 'none';
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('help-modal');
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    function initializeUI() {
        const scheduleGrid = document.getElementById('schedule-grid');
        scheduleGrid.innerHTML = ''; // Clear the grid
        
        // Get dates for the current week
        const weekDates = dataManager.getCurrentWeekDates();
        
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
                        classElement.addEventListener('click', (e) => {
                            e.stopPropagation(); // Prevent cell click
                            highlightAvailableSlots(className);
                        });
                        
                        // Add double-click to unschedule
                        classElement.addEventListener('dblclick', () => {
                            if (confirm(`Remove ${className} from this time slot?`)) {
                                dataManager.unscheduleClass(dateStr, period);
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
            classElement.addEventListener('click', () => highlightAvailableSlots(classInfo.name));
            
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
        e.dataTransfer.setData('text/plain', e.target.dataset.className);
        e.dataTransfer.setData('source', 'unscheduled');
        e.target.classList.add('dragging');
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
    
    function handleDrop(e) {
        e.preventDefault();
        const className = e.dataTransfer.getData('text/plain');
        const source = e.dataTransfer.getData('source');
        const dateStr = e.target.dataset.date || e.target.parentElement.dataset.date;
        const period = e.target.dataset.period || e.target.parentElement.dataset.period;
        
        // Remove dragging class
        document.querySelector('.dragging')?.classList.remove('dragging');
        
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
});