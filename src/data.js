// Data handling for the scheduler

class DataManager {
    constructor() {
        this.classes = [];
        
        // Default to next Monday - ensure the date is a proper Date object
        const nextMonday = this.getNextMonday();
        console.log("Initial next Monday:", nextMonday.toDateString());
        
        // Explicitly set scheduleStartDate to ensure it's a Date object
        this.scheduleStartDate = new Date(nextMonday.getTime());
        this.scheduleWeeks = {}; // Schedule data organized by weeks
        this.currentWeekOffset = 0; // Current week offset from start date
        
        // Initialize empty schedule for first week
        this.initializeEmptyWeek(0);
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
        return date.toISOString().split('T')[0]; // YYYY-MM-DD
    }
    
    getDayFromDate(date) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[date.getDay()];
    }
    
    getWeekDates(weekOffset = 0) {
        const weekDates = [];
        
        // Create a fresh copy of the start date (should always be a Monday)
        // Use ISO string to ensure consistent date handling
        const startDateStr = this.scheduleStartDate.toISOString();
        const weekStartDate = new Date(startDateStr);
        
        console.log("Before offset:", weekStartDate.toDateString());
        
        // Add weeks based on offset
        weekStartDate.setDate(weekStartDate.getDate() + (weekOffset * 7));
        
        console.log("After offset:", weekStartDate.toDateString(), "Offset:", weekOffset);
        
        // Generate dates for Monday through Friday (weekdays only)
        for (let i = 0; i < 5; i++) {
            const date = new Date(weekStartDate);
            date.setDate(date.getDate() + i);
            
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
        return weekSchedule;
    }
    
    getCurrentWeekSchedule() {
        // Initialize if this week doesn't exist yet
        if (!this.scheduleWeeks[this.currentWeekOffset]) {
            this.initializeEmptyWeek(this.currentWeekOffset);
        }
        
        return this.scheduleWeeks[this.currentWeekOffset];
    }

    async loadClassesFromCSV() {
        try {
            // For testing, let's hardcode the class data instead of loading from CSV
            // This avoids file loading issues in local development
            const classData = [
                { name: "PK207", conflicts: { "Monday": [2], "Tuesday": [2], "Wednesday": [4], "Thursday": [3], "Friday": [1, 3] } },
                { name: "PK214", conflicts: { "Monday": [2, 5], "Tuesday": [3, 5], "Wednesday": [1, 5], "Thursday": [5, 7], "Friday": [2, 3, 5] } },
                { name: "PK208", conflicts: { "Monday": [2, 5], "Tuesday": [7, 5], "Wednesday": [2, 5], "Thursday": [2, 5], "Friday": [3, 5, 7] } },
                { name: "PK213", conflicts: { "Monday": [2, 6], "Tuesday": [1, 6], "Wednesday": [6, 8], "Thursday": [2, 6], "Friday": [3, 4, 6] } },
                { name: "K-313", conflicts: { "Monday": [1], "Tuesday": [4], "Wednesday": [2, 4], "Thursday": [4], "Friday": [8] } },
                { name: "K-309", conflicts: { "Monday": [1], "Tuesday": [7], "Wednesday": [2, 7], "Thursday": [3], "Friday": [1] } },
                { name: "K-311", conflicts: { "Monday": [1], "Tuesday": [7], "Wednesday": [2, 7], "Thursday": [1], "Friday": [3] } },
                { name: "1-407", conflicts: { "Monday": [2], "Tuesday": [1], "Wednesday": [1], "Thursday": [2, 4], "Friday": [7] } },
                { name: "1-409", conflicts: { "Monday": [4], "Tuesday": [1], "Wednesday": [3], "Thursday": [2, 5], "Friday": [4] } },
                { name: "2-411", conflicts: { "Monday": [7], "Tuesday": [2, 8], "Wednesday": [1], "Thursday": [8], "Friday": [2] } },
                { name: "3-418", conflicts: { "Monday": [8], "Tuesday": [3], "Wednesday": [3, 8], "Thursday": [1], "Friday": [8] } },
                { name: "4-509", conflicts: { "Monday": [1], "Tuesday": [8], "Wednesday": [3], "Thursday": [3, 8], "Friday": [1] } }
            ];
            
            this.classes = classData;
            console.log("Loaded classes:", this.classes);
            return this.classes;
        } catch (error) {
            console.error('Error loading class data:', error);
            return [];
        }
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
        
        // Get day of week from date
        const date = new Date(dateStr);
        const day = this.getDayFromDate(date);
        
        // Can't schedule classes on weekends
        if (day === 'Saturday' || day === 'Sunday') {
            return true;
        }
        
        // Check conflicts based on day of week
        return classInfo.conflicts[day].includes(Number(period));
    }
}