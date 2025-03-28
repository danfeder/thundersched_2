// Data handling for the scheduler

export class DataManager { // Added export
    // Accept scheduler instance for constraint validation
    constructor(scheduler) {
        this.scheduler = scheduler; // Store scheduler instance
        this.classes = [];
        
        // Default to next Monday - ensure the date is a proper Date object
        const nextMonday = this.getNextMonday();
        console.log("Initial next Monday:", nextMonday.toDateString());
        
        // Explicitly set scheduleStartDate to ensure it's a Date object
        this.scheduleStartDate = new Date(nextMonday.getTime());
        this.scheduleWeeks = {}; // Schedule data organized by weeks
        this.currentWeekOffset = 0; // Current week offset from start date
        
        // Teacher unavailability data - organized by week offset, date, and period
        this.teacherUnavailability = {};
        
        // Default configuration settings
        this.config = {
            maxConsecutiveClasses: 2,
            maxClassesPerDay: 4,
            minClassesPerWeek: 12,
            maxClassesPerWeek: 16
        };
        
        // Add savedSchedules array
        this.savedSchedules = [];
        
        // Add savedClassCollections array for storing sets of class definitions
        this.savedClassCollections = [];
        
        // Initialize empty schedule for first week
        this.initializeEmptyWeek(0);
        
        // Try to load data from localStorage during initialization
        this.loadClassesFromLocalStorage();
        this.loadConfigFromLocalStorage();
        this.loadSavedSchedulesFromLocalStorage();
        this.loadSavedClassCollectionsFromLocalStorage();
        
        // Delayed validation of existing schedule against constraints (needs scheduler to be initialized)
        setTimeout(() => this.validateExistingScheduleAgainstConstraints(), 1000);
    }
    
    loadClassesFromLocalStorage() {
        try {
            const storedClasses = localStorage.getItem('cooking-classes');
            if (storedClasses) {
                this.classes = JSON.parse(storedClasses);
                console.log(`Loaded ${this.classes.length} classes from localStorage during initialization`);
                return true;
            }
        } catch (error) {
            console.error('Error loading classes from localStorage:', error);
        }
        return false;
    }
    
    getNextMonday() {
        const date = new Date();
        const day = date.getDay(); // 0 is Sunday, 1 is Monday, etc.
        // If today is Sunday (0), add 1 day to get to Monday
        // If today is Monday (1), add 7 days to get to next Monday
        // Otherwise, add days needed to get to next Monday
        const daysToAdd = day === 0 ? 1 : day === 1 ? 7 : 8 - day;
        date.setDate(date.getDate() + daysToAdd);
        return date;
    }
    
    // Get the Monday of the week containing the given date
    getMondayOfWeek(date) {
        // Create a new date to avoid modifying the original
        const newDate = new Date(date);
        
        // Debug log the input date
        console.log("Input date:", newDate.toDateString());
        
        const day = newDate.getDay(); // 0 is Sunday, 1 is Monday
        // Calculate days to subtract to get to Monday
        // If Sunday (0), subtract 6 days to get to previous Monday
        // If Monday (1), subtract 0 days
        // Otherwise subtract (day - 1) days
        const daysToSubtract = day === 0 ? 6 : day - 1;
        
        // Adjust to the Monday of this week
        newDate.setDate(newDate.getDate() - daysToSubtract);
        
        // Debug log the resulting Monday
        console.log("Monday of week:", newDate.toDateString());
        
        return newDate;
    }
    
    getFormattedDate(date) {
        // Using local date functions to avoid timezone issues
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`; // YYYY-MM-DD
    }
    
    getDayFromDate(date) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[date.getDay()];
    }
    
    getWeekDates(weekOffset = 0) {
        const weekDates = [];
        
        // Create a fresh copy of the start date (should always be a Monday)
        // Use a new Date constructor to avoid timezone issues
        const weekStartDate = new Date(
            this.scheduleStartDate.getFullYear(),
            this.scheduleStartDate.getMonth(),
            this.scheduleStartDate.getDate()
        );
        
        console.log("Before offset:", weekStartDate.toDateString());
        
        // Add weeks based on offset
        weekStartDate.setDate(weekStartDate.getDate() + (weekOffset * 7));
        
        console.log("After offset:", weekStartDate.toDateString(), "Offset:", weekOffset);
        
        // Verify the weekStartDate is Monday (day 1), if not adjust it
        const startDay = weekStartDate.getDay();
        if (startDay !== 1) {
            console.warn("Week start date is not Monday, adjusting...", 
                        "Current day:", startDay, 
                        "Date:", weekStartDate.toDateString());
            // If not Monday, adjust to the Monday of this week
            const daysToAdjust = startDay === 0 ? -6 : (1 - startDay);
            weekStartDate.setDate(weekStartDate.getDate() + daysToAdjust);
            console.log("Adjusted to Monday:", weekStartDate.toDateString());
        }
        
        // Generate dates for Monday through Friday (weekdays only)
        for (let i = 0; i < 5; i++) {
            const date = new Date(
                weekStartDate.getFullYear(),
                weekStartDate.getMonth(),
                weekStartDate.getDate() + i
            );
            
            console.log(`Date ${i}:`, date.toDateString(), "Day:", date.getDay());
            
            // Verify this is a weekday (1-5 where 1 is Monday, 5 is Friday)
            const day = date.getDay();
            if (day >= 1 && day <= 5) {
                weekDates.push(date);
            }
        }
        
        return weekDates;
    }
    
    setStartDate(date) {
        // Always use the Monday of the week containing the selected date
        this.scheduleStartDate = this.getMondayOfWeek(date);
        this.currentWeekOffset = 0;
        
        // Reinitialize empty schedule if no data for week 0
        if (!this.scheduleWeeks[0]) {
            this.initializeEmptyWeek(0);
        }
    }
    
    initializeEmptyWeek(weekOffset) {
        const weekSchedule = {};
        const weekDates = this.getWeekDates(weekOffset);
        
        weekDates.forEach(date => {
            const dateStr = this.getFormattedDate(date);
            weekSchedule[dateStr] = {};
            for (let period = 1; period <= 8; period++) {
                weekSchedule[dateStr][period] = null;
            }
        });
        
        this.scheduleWeeks[weekOffset] = weekSchedule;
        
        // Initialize empty teacher unavailability for this week if it doesn't exist
        if (!this.teacherUnavailability[weekOffset]) {
            this.teacherUnavailability[weekOffset] = {};
            weekDates.forEach(date => {
                const dateStr = this.getFormattedDate(date);
                this.teacherUnavailability[weekOffset][dateStr] = {};
            });
        }
        
        return weekSchedule;
    }
    
    getCurrentWeekSchedule() {
                // Initialize if this week doesn't exist yet
        if (!this.scheduleWeeks[this.currentWeekOffset]) {
                        this.initializeEmptyWeek(this.currentWeekOffset);
        }
        // Log the data being returned for this offset
        console.log(`DataManager: Returning schedule for offset ${this.currentWeekOffset}:`, JSON.stringify(this.scheduleWeeks[this.currentWeekOffset] || {}));
        // Return the schedule data for the current week offset
        return this.scheduleWeeks[this.currentWeekOffset];
        return this.scheduleWeeks[this.currentWeekOffset];
    }

    async loadClassesFromCSV() {
        try {
            // Check if we already have classes loaded from localStorage during initialization
            if (this.classes && this.classes.length > 0) {
                console.log(`Using ${this.classes.length} classes already loaded from localStorage`);
                return this.classes;
            }
            
            // Path to the CSV file
            const csvFilePath = 'ClassesAndConflicts.csv';
            
            try {
                // Fetch the CSV file
                const response = await fetch(csvFilePath);
                
                if (!response.ok) {
                    throw new Error(`Failed to load CSV file: ${response.status} ${response.statusText}`);
                }
                
                const csvText = await response.text();
                console.log("CSV loaded, parsing...");
                
                // Parse the CSV data
                const classData = this.parseCSVData(csvText);
                
                this.classes = classData;
                console.log(`Loaded ${this.classes.length} classes from CSV file`);
                
                // Store the classes in localStorage for persistence
                localStorage.setItem('cooking-classes', JSON.stringify(this.classes));
                console.log("Classes saved to localStorage");
                
                return this.classes;
            } catch (fetchError) {
                console.error('Error fetching CSV file:', fetchError);
                console.log('Attempting to load from localStorage...');
                
                // Attempt to load from localStorage as fallback
                const loadedFromLocalStorage = this.loadClassesFromLocalStorage();
                
                if (loadedFromLocalStorage) {
                    return this.classes;
                } else {
                    console.log('No classes found in localStorage, using hardcoded data');
                    // Hardcoded fallback data (just a few example classes)
                    this.classes = [
                        { name: "PK207", conflicts: { "Monday": [2], "Tuesday": [2], "Wednesday": [4], "Thursday": [3], "Friday": [1, 3] } },
                        { name: "K-313", conflicts: { "Monday": [1], "Tuesday": [4], "Wednesday": [2, 4], "Thursday": [4], "Friday": [8] } },
                        { name: "1-407", conflicts: { "Monday": [2], "Tuesday": [1], "Wednesday": [1], "Thursday": [2, 4], "Friday": [7] } }
                    ];
                    return this.classes;
                }
            }
        } catch (error) {
            console.error('Error in loadClassesFromCSV:', error);
            return [];
        }
    }
    
    parseCSVData(csvText) {
        // Split the CSV text into lines and remove any empty lines
        const lines = csvText.split('\n').filter(line => line.trim() !== '');
        
        // Skip the header row
        const dataRows = lines.slice(1);
        
        const classData = [];
        
        // Process each row
        for (const row of dataRows) {
            // Use our CSV row parser to handle quoted values correctly
            const values = this.parseCSVRow(row);
            
            if (values.length >= 6) { // Class name + 5 days of the week
                // Keep quotes in class name if they exist (for mixed-grade classes)
                // The CSV parser already removes the outer quotes but preserves commas inside
                const className = values[0].trim();
                
                const conflicts = {
                    "Monday": this.parseConflictPeriods(values[1]),
                    "Tuesday": this.parseConflictPeriods(values[2]),
                    "Wednesday": this.parseConflictPeriods(values[3]),
                    "Thursday": this.parseConflictPeriods(values[4]),
                    "Friday": this.parseConflictPeriods(values[5])
                };
                
                classData.push({ name: className, conflicts });
            }
        }
        
        return classData;
    }
    
    parseConflictPeriods(periodsString) {
        // Trim whitespace and remove any quotes
        const cleaned = periodsString.trim().replace(/"/g, '');
        
        // If empty, return an empty array
        if (!cleaned) return [];
        
        // Split by comma and convert to numbers
        return cleaned.split(',').map(period => {
            // Remove any surrounding whitespace for each period
            return parseInt(period.trim(), 10);
        });
    }

    parseCSVRow(row) {
        const values = [];
        let insideQuotes = false;
        let currentValue = '';
        
        for (let i = 0; i < row.length; i++) {
            const char = row[i];
            
            if (char === '"') {
                insideQuotes = !insideQuotes;
            } else if (char === ',' && !insideQuotes) {
                values.push(currentValue);
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        
        values.push(currentValue);
        return values;
    }

    getClasses() {
        return this.classes;
    }
    
    // Class management methods
    addClass(classInfo) {
        // Make sure the class doesn't already exist
        const existingClass = this.classes.find(c => c.name === classInfo.name);
        if (existingClass) {
            return false; // Class already exists
        }
        
        // Add the new class
        this.classes.push(classInfo);
        
        // Save to localStorage
        localStorage.setItem('cooking-classes', JSON.stringify(this.classes));
        console.log(`Class ${classInfo.name} added and saved to localStorage`);
        
        return true;
    }
    
    updateClass(oldName, updatedClassInfo) {
        // Find the class to update
        const index = this.classes.findIndex(c => c.name === oldName);
        if (index === -1) {
            return false; // Class not found
        }
        
        // Update the class
        this.classes[index] = updatedClassInfo;
        
        // If the name changed, we need to update any scheduled instances
        if (oldName !== updatedClassInfo.name) {
            // Update scheduled classes in all weeks
            Object.keys(this.scheduleWeeks).forEach(weekOffset => {
                const weekSchedule = this.scheduleWeeks[weekOffset];
                
                Object.keys(weekSchedule).forEach(dateStr => {
                    Object.keys(weekSchedule[dateStr]).forEach(period => {
                        if (weekSchedule[dateStr][period] === oldName) {
                            weekSchedule[dateStr][period] = updatedClassInfo.name;
                        }
                    });
                });
            });
            
            // Save updated schedule to localStorage
            localStorage.setItem('cooking-class-schedule', JSON.stringify(this.scheduleWeeks));
        }
        
        // Save updated classes to localStorage
        localStorage.setItem('cooking-classes', JSON.stringify(this.classes));
        console.log(`Class ${updatedClassInfo.name} updated and saved to localStorage`);
        
        return true;
    }
    
    deleteClass(className) {
        // Check if the class is scheduled anywhere
        if (this.isClassScheduled(className)) {
            return false; // Can't delete a scheduled class
        }
        
        // Remove the class
        const index = this.classes.findIndex(c => c.name === className);
        if (index === -1) {
            return false; // Class not found
        }
        
        this.classes.splice(index, 1);
        
        // Save to localStorage
        localStorage.setItem('cooking-classes', JSON.stringify(this.classes));
        console.log(`Class ${className} deleted and changes saved to localStorage`);
        
        return true;
    }
    
    isClassScheduled(className) {
        // Check all weeks to see if this class is scheduled anywhere
        return Object.values(this.scheduleWeeks).some(weekSchedule => {
            return Object.values(weekSchedule).some(daySchedule => {
                return Object.values(daySchedule).includes(className);
            });
        });
    }

    getSchedule() {
        return this.getCurrentWeekSchedule();
    }
    
    getCurrentWeekDates() {
        return this.getWeekDates(this.currentWeekOffset);
    }
    
    changeWeek(direction) {
        // direction: 1 for next week, -1 for previous week
        this.currentWeekOffset += direction;
        
        // Initialize if this week doesn't exist yet
        if (!this.scheduleWeeks[this.currentWeekOffset]) {
            this.initializeEmptyWeek(this.currentWeekOffset);
        }
        
        return this.getCurrentWeekSchedule();
    }

    scheduleClass(className, dateStr, period) {
        const schedule = this.getCurrentWeekSchedule();
        schedule[dateStr][period] = className;
    }

    unscheduleClass(dateStr, period) {
        const schedule = this.getCurrentWeekSchedule();
        schedule[dateStr][period] = null;
    }
    
    resetSchedule() {
        // Reset only current week
        this.scheduleWeeks[this.currentWeekOffset] = this.initializeEmptyWeek(this.currentWeekOffset);
    }
    
    resetAllSchedules() {
        // Reset all weeks
        this.scheduleWeeks = {};
        this.teacherUnavailability = {};
        this.initializeEmptyWeek(0);
        this.currentWeekOffset = 0;
    }

    getUnscheduledClasses() {
        const scheduledClasses = new Set();
        
        // Collect all scheduled classes from all weeks
        Object.values(this.scheduleWeeks).forEach(weekSchedule => {
            Object.values(weekSchedule).forEach(daySchedule => {
                Object.values(daySchedule).forEach(className => {
                    if (className) scheduledClasses.add(className);
                });
            });
        });
        
        // Filter out scheduled classes
        return this.classes.filter(classInfo => !scheduledClasses.has(classInfo.name));
    }
    
    // Get classes scheduled in the current week
    getCurrentWeekScheduledClasses() {
        const scheduledClasses = new Set();
        const currentWeekSchedule = this.getCurrentWeekSchedule();
        
        Object.values(currentWeekSchedule).forEach(daySchedule => {
            Object.values(daySchedule).forEach(className => {
                if (className) scheduledClasses.add(className);
            });
        });
        
        return Array.from(scheduledClasses);
    }

    hasConflict(className, dateStr, period) {
        const classInfo = this.classes.find(c => c.name === className);
        if (!classInfo) return false;
        
        // Get day of week from date - IMPORTANT: Use UTC date parts to avoid timezone issues
        const [year, month, day] = dateStr.split('-').map(num => parseInt(num, 10));
        const date = new Date(year, month - 1, day); // month is 0-indexed in JS
        const dayOfWeek = this.getDayFromDate(date);
        
        // Can't schedule classes on weekends
        if (dayOfWeek === 'Saturday' || dayOfWeek === 'Sunday') {
            return true;
        }
        
        // Check conflicts based on day of week - This is the most fundamental conflict
        if (classInfo.conflicts[dayOfWeek] && 
            classInfo.conflicts[dayOfWeek].includes(Number(period))) {
            return true;
        }
        
        // Check if teacher is unavailable during this period
        if (this.isTeacherUnavailable(dateStr, period)) {
            return true;
        }
        
        return false;
    }
    
    // Teacher unavailability methods
    isTeacherUnavailable(dateStr, period) {
        // Find the week offset for this date
        // Use consistent date creation method to avoid timezone issues
        const [year, month, day] = dateStr.split('-').map(num => parseInt(num, 10));
        const date = new Date(year, month - 1, day); // month is 0-indexed in JS
        
        const monday = this.getMondayOfWeek(date);
        const startMonday = this.getMondayOfWeek(this.scheduleStartDate);
        
        // Calculate the difference in days and convert to weeks
        const diffTime = monday.getTime() - startMonday.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        const weekOffset = Math.round(diffDays / 7); // Use Math.round to handle precision issues
        
        // Check if there's unavailability data for this date and period
        return this.teacherUnavailability[weekOffset] && 
               this.teacherUnavailability[weekOffset][dateStr] && 
               this.teacherUnavailability[weekOffset][dateStr][period] === true;
    }
    
    toggleTeacherUnavailability(dateStr, period) {
        // Find the correct week offset for this date to ensure persistence
        // Use consistent date creation method to avoid timezone issues
        const [year, month, day] = dateStr.split('-').map(num => parseInt(num, 10));
        const date = new Date(year, month - 1, day); // month is 0-indexed in JS
        
        const monday = this.getMondayOfWeek(date);
        const startMonday = this.getMondayOfWeek(this.scheduleStartDate);
        
        // Calculate the difference in days and convert to weeks
        const diffTime = monday.getTime() - startMonday.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        const weekOffset = Math.round(diffDays / 7); // Use Math.round to handle precision issues
        
        // Make sure we have initialized data for this week
        if (!this.teacherUnavailability[weekOffset]) {
            this.teacherUnavailability[weekOffset] = {};
        }
        
        // Get the week data for the correct week offset
        const weekData = this.teacherUnavailability[weekOffset];
        
        // Initialize the date entry if it doesn't exist
        if (!weekData[dateStr]) {
            weekData[dateStr] = {};
        }
        
        // Toggle the unavailability for this period
        const isCurrentlyUnavailable = weekData[dateStr][period] === true;
        weekData[dateStr][period] = !isCurrentlyUnavailable;
        
        // Update the data structure
        this.teacherUnavailability[weekOffset] = weekData;
        
        
        return !isCurrentlyUnavailable; // Return the new state
    }
    
    // Configuration management methods
    loadConfigFromLocalStorage() {
        try {
            const storedConfig = localStorage.getItem('cooking-class-config');
            if (storedConfig) {
                this.config = {...this.config, ...JSON.parse(storedConfig)};
                console.log('Loaded configuration from localStorage:', this.config);
            }
        } catch (error) {
            console.error('Error loading configuration from localStorage:', error);
        }
    }
    
    saveConfigToLocalStorage() {
        localStorage.setItem('cooking-class-config', JSON.stringify(this.config));
        console.log('Saved configuration to localStorage:', this.config);
    }
    
    getConfig() {
        return this.config;
    }
    
    updateConfig(newConfig) {
        this.config = {...this.config, ...newConfig};
        this.saveConfigToLocalStorage();
        return this.config;
    }
    
    validateExistingScheduleAgainstConstraints() {
        // This will be called after initialization to check existing schedule against default constraints
        // Use the stored scheduler instance instead of global window.scheduler
        if (Object.keys(this.scheduleWeeks).length > 0 && this.scheduler) {
            const invalidPlacements = this.scheduler.findInvalidPlacementsWithNewConstraints(this.config);
            if (invalidPlacements.length > 0) {
                console.warn(`Found ${invalidPlacements.length} placement(s) that violate current constraints`);
                // We don't auto-remove them, but could notify the user in the UI
            }
        }
    }
    
    // Saved schedules management methods
    loadSavedSchedulesFromLocalStorage() {
        try {
            const storedSchedules = localStorage.getItem('cooking-saved-schedules');
            console.log('Raw stored schedules from localStorage:', storedSchedules);
            
            if (storedSchedules) {
                this.savedSchedules = JSON.parse(storedSchedules);
                
                // Migrate old saved schedules to add startDate if missing
                let migratedSchedules = false;
                this.savedSchedules.forEach(schedule => {
                    if (!schedule.startDate && schedule.scheduleData) {
                        console.log(`Migrating schedule "${schedule.name}" to add startDate`);
                        migratedSchedules = true;
                        
                        // Try to infer startDate from schedule data
                        const firstWeekOffset = Object.keys(schedule.scheduleData).sort()[0];
                        if (firstWeekOffset) {
                            // Get the first date in the first week
                            const firstWeekDates = Object.keys(schedule.scheduleData[firstWeekOffset]).sort();
                            if (firstWeekDates.length > 0) {
                                // Parse the first date string to a Date
                                const [year, month, day] = firstWeekDates[0].split('-').map(num => parseInt(num, 10));
                                const firstDate = new Date(year, month - 1, day);
                                
                                // Find the Monday of that week
                                const monday = this.getMondayOfWeek(firstDate);
                                
                                // Format and save as startDate
                                schedule.startDate = this.getFormattedDate(monday);
                                console.log(`  Inferred startDate: ${schedule.startDate} for schedule "${schedule.name}"`);
                            }
                        }
                    }
                });
                
                // Save migrated schedules back to localStorage
                if (migratedSchedules) {
                    console.log('Saving migrated schedules with added startDates');
                    localStorage.setItem('cooking-saved-schedules', JSON.stringify(this.savedSchedules));
                }
                
                console.log(`Loaded ${this.savedSchedules.length} saved schedules from localStorage:`, this.savedSchedules);
            } else {
                console.log('No saved schedules found in localStorage');
                this.savedSchedules = [];
            }
        } catch (error) {
            console.error('Error loading saved schedules from localStorage:', error);
            this.savedSchedules = []; // Initialize with empty array on error
            // Show error notification to user if we have a message system
            if (typeof showMessage === 'function') {
                showMessage('error', 'There was an error loading your saved schedules. Some data may be lost.');
            }
        }
    }
    
    saveSavedSchedulesToLocalStorage() {
        try {
            console.log('Saving schedules to localStorage:', this.savedSchedules);
            localStorage.setItem('cooking-saved-schedules', JSON.stringify(this.savedSchedules));
            console.log('Successfully saved schedules to localStorage');
            return true;
        } catch (error) {
            console.error('Error saving schedules to localStorage:', error);
            // Check if it's a quota exceeded error
            if (error instanceof DOMException && error.name === 'QuotaExceededError') {
                this.showErrorMessage('Storage limit exceeded. Try deleting some saved schedules first.');
            } else {
                this.showErrorMessage('Failed to save schedule. An unexpected error occurred.');
            }
            return false;
        }
    }
    
    addSavedSchedule(schedule) {
        // Add lastModified field if not present
        if (!schedule.lastModified) {
            schedule.lastModified = schedule.createdAt;
        }
        
        this.savedSchedules.push(schedule);
        return this.saveSavedSchedulesToLocalStorage();
    }
    
    updateSavedSchedule(id, updates) {
        const index = this.savedSchedules.findIndex(s => s.id === id);
        if (index !== -1) {
            // Update lastModified timestamp
            updates.lastModified = new Date().toISOString();
            
            // Apply updates to the schedule
            this.savedSchedules[index] = {...this.savedSchedules[index], ...updates};
            return this.saveSavedSchedulesToLocalStorage();
        }
        return false;
    }
    
    deleteSavedSchedule(id) {
        const index = this.savedSchedules.findIndex(s => s.id === id);
        if (index !== -1) {
            this.savedSchedules.splice(index, 1);
            return this.saveSavedSchedulesToLocalStorage();
        }
        return false;
    }
    
    getSavedScheduleById(id) {
        return this.savedSchedules.find(s => s.id === id);
    }
    
    showErrorMessage(message) {
        // Implementation depends on the application's message system
        if (typeof showMessage === 'function') {
            showMessage('error', message);
        } else {
            alert(message);
        }
    }
    
    // Class collection management methods
    loadSavedClassCollectionsFromLocalStorage() {
        try {
            const storedCollections = localStorage.getItem('cooking-saved-class-collections');
            console.log('Raw stored class collections from localStorage:', storedCollections);
            
            if (storedCollections) {
                this.savedClassCollections = JSON.parse(storedCollections);
                console.log(`Loaded ${this.savedClassCollections.length} saved class collections from localStorage:`, this.savedClassCollections);
            } else {
                console.log('No saved class collections found in localStorage');
                this.savedClassCollections = [];
            }
        } catch (error) {
            console.error('Error loading saved class collections from localStorage:', error);
            this.savedClassCollections = []; // Initialize with empty array on error
            // Show error notification to user if we have a message system
            if (typeof showMessage === 'function') {
                showMessage('error', 'There was an error loading your saved class collections. Some data may be lost.');
            }
        }
    }
    
    saveSavedClassCollectionsToLocalStorage() {
        try {
            console.log('Saving class collections to localStorage:', this.savedClassCollections);
            localStorage.setItem('cooking-saved-class-collections', JSON.stringify(this.savedClassCollections));
            console.log('Successfully saved class collections to localStorage');
            return true;
        } catch (error) {
            console.error('Error saving class collections to localStorage:', error);
            // Check if it's a quota exceeded error
            if (error instanceof DOMException && error.name === 'QuotaExceededError') {
                this.showErrorMessage('Storage limit exceeded. Try deleting some saved class collections first.');
            } else {
                this.showErrorMessage('Failed to save class collection. An unexpected error occurred.');
            }
            return false;
        }
    }
    
    addSavedClassCollection(collection) {
        // Add lastModified field if not present
        if (!collection.lastModified) {
            collection.lastModified = collection.createdAt;
        }
        
        this.savedClassCollections.push(collection);
        return this.saveSavedClassCollectionsToLocalStorage();
    }
    
    updateSavedClassCollection(id, updates) {
        const index = this.savedClassCollections.findIndex(c => c.id === id);
        if (index !== -1) {
            // Update lastModified timestamp
            updates.lastModified = new Date().toISOString();
            
            // Apply updates to the collection
            this.savedClassCollections[index] = {...this.savedClassCollections[index], ...updates};
            return this.saveSavedClassCollectionsToLocalStorage();
        }
        return false;
    }
    
    deleteSavedClassCollection(id) {
        const index = this.savedClassCollections.findIndex(c => c.id === id);
        if (index !== -1) {
            this.savedClassCollections.splice(index, 1);
            return this.saveSavedClassCollectionsToLocalStorage();
        }
        return false;
    }
    
    getSavedClassCollectionById(id) {
        return this.savedClassCollections.find(c => c.id === id);
    }
}