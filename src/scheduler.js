// Scheduler logic
import { getDayFromDate } from './date-utils.js'; // Import date utility

export class Scheduler { // Added export
    /**
     * @param {import('./repositories/schedule-repository.js').ScheduleRepository} scheduleRepository
     * @param {import('./data.js').DataManager} dataManager - Temporarily needed for getConfig until ConfigManager exists
     */
    constructor(scheduleRepository, dataManager) {
        if (!scheduleRepository) throw new Error("ScheduleRepository is required for Scheduler");
        if (!dataManager) throw new Error("DataManager is temporarily required for Scheduler (for getConfig)"); // Added check
        this.scheduleRepository = scheduleRepository;
        this.dataManager = dataManager; // Keep for getConfig
    }

    isValidPlacement(className, dateStr, period) {
        const schedule = this.scheduleRepository.getSchedule(); // Use scheduleRepository
        
        // Check if the slot is already occupied
        if (schedule[dateStr] && schedule[dateStr][period]) {
            return { valid: false, reason: 'This time slot is already scheduled.' };
        }

        // Get class information to check specific conflicts
        // Access classRepository via scheduleRepository as it's injected there
        const classInfo = this.scheduleRepository.classRepository.getClasses().find(c => c.name === className);
        if (classInfo) {
            // Get day of week from date - consistent with how data.js does it
            const [year, month, day] = dateStr.split('-').map(num => parseInt(num, 10));
            const date = new Date(year, month - 1, day); // month is 0-indexed in JS
            const dayOfWeek = getDayFromDate(date); // Use imported function
            
            // Always check for class-specific conflicts first (these take absolute priority)
            if (classInfo.conflicts[dayOfWeek] && 
                classInfo.conflicts[dayOfWeek].includes(Number(period))) {
                return { valid: false, reason: `Conflict: ${className} cannot be scheduled during this period.` };
            }
        }

        // We don't check for teacher unavailability here because those slots
        // are still considered valid (though with confirmation required)
        // This allows teacher unavailable periods to show as green (available)

        // Get current configuration values - Use dataManager for this until ConfigManager exists
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
        const schedule = this.scheduleRepository.getSchedule(); // Use scheduleRepository
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
        const schedule = this.scheduleRepository.getSchedule(); // Use scheduleRepository
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
        const currentWeek = this.scheduleRepository.getCurrentWeekSchedule(); // Use scheduleRepository
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
        const weekDates = this.scheduleRepository.getCurrentWeekDates(); // Use scheduleRepository
        
        weekDates.forEach(date => {
            // Use DateUtils directly from the repository instance for consistency
            const dateStr = this.scheduleRepository.dateUtils.getFormattedDate(date);
            
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
    const unscheduledClasses = this.scheduleRepository.getUnscheduledClasses(); // Use scheduleRepository
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
        const currentWeek = this.scheduleRepository.getCurrentWeekSchedule(); // Use scheduleRepository
        
        return Object.values(currentWeek).some(daySchedule => {
            return Object.values(daySchedule).some(className => !!className);
        });
    }
    
    findInvalidPlacementsWithNewConstraints(newConfig) {
        const invalid = [];
        const weekSchedule = this.scheduleRepository.getCurrentWeekSchedule(); // Use scheduleRepository
        
        // Check consecutive classes against the provided config
        // Removed flawed comparison: if (newConfig.maxConsecutiveClasses < this.dataManager.config.maxConsecutiveClasses)
        Object.keys(weekSchedule).forEach(dateStr => {
            let consecutiveCount = 0;
            for (let p = 1; p <= 8; p++) {
                if (weekSchedule[dateStr][p]) {
                    consecutiveCount++;
                } else {
                    consecutiveCount = 0; // Reset counter on empty slot
                }
                
                // Check if the *end* of a consecutive block violates the limit
                if (consecutiveCount > newConfig.maxConsecutiveClasses) {
                     // If the *current* slot makes it too long, mark it invalid
                     // (This logic might need refinement depending on exact requirement)
                     if(weekSchedule[dateStr][p]) {
                          invalid.push({
                              className: weekSchedule[dateStr][p],
                              dateStr,
                              period: p,
                              reason: `Exceeds max consecutive classes (${newConfig.maxConsecutiveClasses})`
                          });
                     }
                }
            }
        });
        
        // Check daily class limit against the provided config
        // Removed flawed comparison: if (newConfig.maxClassesPerDay < this.dataManager.config.maxClassesPerDay)
        Object.keys(weekSchedule).forEach(dateStr => {
            const dailyClasses = this.countDailyClasses(dateStr);
            if (dailyClasses > newConfig.maxClassesPerDay) {
                // Find the classes exceeding the limit and mark them invalid
                let count = 0;
                const classesInDay = [];
                for (let p = 1; p <= 8; p++) {
                    if (weekSchedule[dateStr][p]) {
                        classesInDay.push({ className: weekSchedule[dateStr][p], period: p });
                    }
                }
                // Mark the last ones that exceed the limit
                for (let i = classesInDay.length - 1; i >= 0 && count < (dailyClasses - newConfig.maxClassesPerDay); i--, count++) {
                     invalid.push({
                         className: classesInDay[i].className,
                         dateStr,
                         period: classesInDay[i].period,
                         reason: `Exceeds max daily classes (${newConfig.maxClassesPerDay})`
                     });
                }
            } // End of if (dailyClasses > newConfig.maxClassesPerDay)
        }); // End of Object.keys(weekSchedule).forEach for daily check
        
        // Check weekly class limit against the provided config
        // Removed flawed comparison: if (newConfig.maxClassesPerWeek < this.dataManager.config.maxClassesPerWeek)
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
            } // End of if (weeklyClasses > newConfig.maxClassesPerWeek)
        // Removed extra closing brace from the deleted 'if' condition
        
        return invalid;
    }
}