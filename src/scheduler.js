// Scheduler logic

class Scheduler {
    constructor(dataManager) {
        this.dataManager = dataManager;
    }

    isValidPlacement(className, dateStr, period) {
        const schedule = this.dataManager.getSchedule();
        
        // Check if the slot is already occupied
        if (schedule[dateStr] && schedule[dateStr][period]) {
            return { valid: false, reason: 'This time slot is already scheduled.' };
        }

        // Get class information to check specific conflicts
        const classInfo = this.dataManager.getClasses().find(c => c.name === className);
        if (classInfo) {
            // Get day of week from date - consistent with how data.js does it
            const [year, month, day] = dateStr.split('-').map(num => parseInt(num, 10));
            const date = new Date(year, month - 1, day); // month is 0-indexed in JS
            const dayOfWeek = this.dataManager.getDayFromDate(date);
            
            // Always check for class-specific conflicts first (these take absolute priority)
            if (classInfo.conflicts[dayOfWeek] && 
                classInfo.conflicts[dayOfWeek].includes(Number(period))) {
                return { valid: false, reason: `Conflict: ${className} cannot be scheduled during this period.` };
            }
        }

        // We don't check for teacher unavailability here because those slots
        // are still considered valid (though with confirmation required)
        // This allows teacher unavailable periods to show as green (available)

        // Check if placing here would create 3+ consecutive classes
        const consecutiveClasses = this.countConsecutiveClasses(dateStr, period);
        if (consecutiveClasses >= 2) {
            return { valid: false, reason: `Conflict: ${className} would create 3 or more consecutive classes.` };
        }

        // Check daily class limit (3-4 per day)
        const dailyClasses = this.countDailyClasses(dateStr);
        if (dailyClasses >= 4) {
            return { valid: false, reason: `Conflict: ${className} would exceed the daily class limit of 4.` };
        }

        return { valid: true };
    }

    countConsecutiveClasses(dateStr, newPeriod) {
        const schedule = this.dataManager.getSchedule();
        const newPeriodNum = Number(newPeriod);
        let consecutive = 0;
        
        if (!schedule[dateStr]) {
            return 0;
        }
        
        // Check periods before the new placement
        for (let p = newPeriodNum - 1; p >= 1; p--) {
            if (schedule[dateStr][p]) {
                consecutive++;
            } else {
                break;
            }
        }
        
        // Check periods after the new placement
        for (let p = newPeriodNum + 1; p <= 8; p++) {
            if (schedule[dateStr][p]) {
                consecutive++;
            } else {
                break;
            }
        }
        
        return consecutive;
    }

    countDailyClasses(dateStr) {
        const schedule = this.dataManager.getSchedule();
        let count = 0;
        
        if (!schedule[dateStr]) {
            return 0;
        }
        
        for (let period = 1; period <= 8; period++) {
            if (schedule[dateStr][period]) {
                count++;
            }
        }
        
        return count;
    }

    countWeeklyClasses() {
        const schedule = this.dataManager.getSchedule();
        let count = 0;
        
        Object.values(schedule).forEach(daySchedule => {
            Object.values(daySchedule).forEach(className => {
                if (className) count++;
            });
        });
        
        return count;
    }

    suggestAvailableSlots(className) {
        const availableSlots = [];
        const weekDates = this.dataManager.getCurrentWeekDates();
        
        weekDates.forEach(date => {
            const dateStr = this.dataManager.getFormattedDate(date);
            
            for (let period = 1; period <= 8; period++) {
                const validation = this.isValidPlacement(className, dateStr, period);
                if (validation.valid) {
                    availableSlots.push({ date: dateStr, period });
                }
            }
        });
        
        return availableSlots;
    }

    suggestNextClass() {
        const unscheduledClasses = this.dataManager.getUnscheduledClasses();
        if (unscheduledClasses.length === 0) return null;
        
        // Find the class with the most constraints
        let mostConstrainedClass = null;
        let maxConstraints = -1;
        
        unscheduledClasses.forEach(classInfo => {
            let constraintCount = 0;
            Object.values(classInfo.conflicts).forEach(periods => {
                constraintCount += periods.length;
            });
            
            if (constraintCount > maxConstraints) {
                maxConstraints = constraintCount;
                mostConstrainedClass = classInfo;
            }
        });
        
        return mostConstrainedClass;
    }
}