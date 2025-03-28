// Scheduler logic

export class Scheduler { // Added export
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

        // Get current configuration values
        const config = this.dataManager.getConfig();

        // Check if placing here would create too many consecutive classes
        const consecutiveClasses = this.countConsecutiveClasses(dateStr, period);
        if (consecutiveClasses >= config.maxConsecutiveClasses) {
            return { 
                valid: false, 
                reason: `Conflict: ${className} would create ${config.maxConsecutiveClasses + 1} or more consecutive classes.` 
            };
        }

        // Check daily class limit
        const dailyClasses = this.countDailyClasses(dateStr);
        if (dailyClasses >= config.maxClassesPerDay) {
            return { 
                valid: false, 
                reason: `Conflict: ${className} would exceed the daily class limit of ${config.maxClassesPerDay}.` 
            };
        }
        
        // Check weekly class limit
        const weeklyClasses = this.countWeeklyClasses();
        if (weeklyClasses >= config.maxClassesPerWeek) {
            return { 
                valid: false, 
                reason: `Conflict: ${className} would exceed the weekly limit of ${config.maxClassesPerWeek} classes.` 
            };
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
        // Get only the current week's schedule rather than all weeks
        const currentWeek = this.dataManager.getCurrentWeekSchedule();
        let count = 0;
        
        Object.keys(currentWeek).forEach(dateStr => {
            Object.keys(currentWeek[dateStr]).forEach(period => {
                if (currentWeek[dateStr][period]) count++;
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
    
    hasAnyClassesScheduled() {
        const currentWeek = this.dataManager.getCurrentWeekSchedule();
        
        return Object.values(currentWeek).some(daySchedule => {
            return Object.values(daySchedule).some(className => !!className);
        });
    }
    
    findInvalidPlacementsWithNewConstraints(newConfig) {
        const invalid = [];
        const weekSchedule = this.dataManager.getCurrentWeekSchedule();
        
        // Check consecutive classes
        if (newConfig.maxConsecutiveClasses < this.dataManager.config.maxConsecutiveClasses) {
            Object.keys(weekSchedule).forEach(dateStr => {
                for (let p = 1; p <= 8; p++) {
                    const className = weekSchedule[dateStr][p];
                    if (!className) continue;
                    
                    // Check if this class has more consecutive classes than the new limit
                    const consecutive = this.countConsecutiveClasses(dateStr, p);
                    if (consecutive >= newConfig.maxConsecutiveClasses) {
                        invalid.push({
                            className,
                            dateStr,
                            period: p,
                            reason: `Would create ${consecutive + 1} consecutive classes (new limit: ${newConfig.maxConsecutiveClasses})`
                        });
                    }
                }
            });
        }
        
        // Check daily class limit
        if (newConfig.maxClassesPerDay < this.dataManager.config.maxClassesPerDay) {
            Object.keys(weekSchedule).forEach(dateStr => {
                const dailyClasses = this.countDailyClasses(dateStr);
                if (dailyClasses > newConfig.maxClassesPerDay) {
                    // Add the last (dailyClasses - newConfig.maxClassesPerDay) classes to invalid list
                    const toRemove = dailyClasses - newConfig.maxClassesPerDay;
                    let found = 0;
                    
                    // Start from last period and work backwards to find classes to mark invalid
                    for (let p = 8; p >= 1 && found < toRemove; p--) {
                        const className = weekSchedule[dateStr][p];
                        if (className) {
                            invalid.push({
                                className,
                                dateStr,
                                period: p,
                                reason: `Exceeds new daily limit of ${newConfig.maxClassesPerDay} classes`
                            });
                            found++;
                        }
                    }
                }
            });
        }
        
        // Check weekly class limit
        if (newConfig.maxClassesPerWeek < this.dataManager.config.maxClassesPerWeek) {
            const weeklyClasses = this.countWeeklyClasses();
            if (weeklyClasses > newConfig.maxClassesPerWeek) {
                // Add the last (weeklyClasses - newConfig.maxClassesPerWeek) classes to invalid list
                const toRemove = weeklyClasses - newConfig.maxClassesPerWeek;
                let found = 0;
                
                // Go through days in reverse order
                const dates = Object.keys(weekSchedule).sort().reverse();
                for (const dateStr of dates) {
                    if (found >= toRemove) break;
                    
                    // Start from last period and work backwards
                    for (let p = 8; p >= 1 && found < toRemove; p--) {
                        const className = weekSchedule[dateStr][p];
                        if (className) {
                            invalid.push({
                                className,
                                dateStr,
                                period: p,
                                reason: `Exceeds new weekly limit of ${newConfig.maxClassesPerWeek} classes`
                            });
                            found++;
                        }
                    }
                }
            }
        }
        
        return invalid;
    }
}