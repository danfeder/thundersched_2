/**
 * ScheduleAnalytics - Isolated module for analyzing schedule data
 * This module provides metrics and insights without modifying any existing data
 */
const ScheduleAnalytics = (function() {
    // Private state - inaccessible from outside
    let _metricsCache = null;
    let _lastCalculationTime = 0;
    
    /**
     * Calculate the span of days covered by the schedule
     * @param {Object} scheduleData - Copy of schedule data
     * @return {Number} Number of days from first to last class
     */
    function calculateScheduleSpan(scheduleData) {
        // Find min and max dates with classes scheduled
        let firstDate = null;
        let lastDate = null;
        
        // Iterate through schedule to find first and last dates
        Object.keys(scheduleData).forEach(weekOffset => {
            Object.keys(scheduleData[weekOffset]).forEach(dateStr => {
                // Check if any class is scheduled on this date
                const hasClass = Object.values(scheduleData[weekOffset][dateStr]).some(className => !!className);
                
                if (hasClass) {
                    const date = new Date(dateStr);
                    if (!firstDate || date < firstDate) firstDate = date;
                    if (!lastDate || date > lastDate) lastDate = date;
                }
            });
        });
        
        // Calculate span in days
        if (!firstDate || !lastDate) return 0;
        const diffTime = Math.abs(lastDate - firstDate);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Include both first and last day
    }
    
    /**
     * Calculate balance scores for each day in the schedule
     * @param {Object} scheduleData - Copy of schedule data
     * @param {Number} maxClassesPerDay - Maximum classes allowed per day
     * @return {Object} Daily balance scores and status
     */
    function calculateDailyBalance(scheduleData, maxClassesPerDay) {
        const dailyScores = {};
        const idealLoad = maxClassesPerDay * 0.75; // Target 75% of max for optimal balance
        
        // Calculate scores for each day
        Object.keys(scheduleData).forEach(weekOffset => {
            Object.keys(scheduleData[weekOffset]).forEach(dateStr => {
                // Count classes on this day
                const classCount = Object.values(scheduleData[weekOffset][dateStr])
                    .filter(className => !!className).length;
                
                // Calculate proximity to ideal (100% = ideal, 0% = empty or at max)
                const distanceFromIdeal = Math.abs(classCount - idealLoad);
                const maxDistance = Math.max(idealLoad, maxClassesPerDay - idealLoad);
                const score = 100 * (1 - (distanceFromIdeal / maxDistance));
                
                // More descriptive status classifications with expanded thresholds
                let status;
                if (classCount < idealLoad * 0.7) { // Was 0.5
                    status = 'underutilized';
                } else if (classCount > maxClassesPerDay * 0.85) { // Was 0.9
                    status = 'nearCapacity';
                } else if (Math.abs(classCount - idealLoad) < (idealLoad * 0.1)) {
                    status = 'optimal';
                } else {
                    status = 'balanced';
                }
                
                dailyScores[dateStr] = {
                    classCount,
                    idealLoad,
                    score: Math.max(0, Math.min(100, score)), // Clamp between 0-100
                    status: status
                };
            });
        });
        
        return dailyScores;
    }
    
    /**
     * Calculate period utilization across the schedule
     * @param {Object} scheduleData - Copy of schedule data
     * @return {Object} Period utilization data
     */
    function calculatePeriodUtilization(scheduleData) {
        const periodCounts = {
            1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0
        };
        let totalDays = 0;
        
        // Count class placements by period
        Object.keys(scheduleData).forEach(weekOffset => {
            Object.keys(scheduleData[weekOffset]).forEach(dateStr => {
                totalDays++;
                
                // Count scheduled classes in each period
                for (let period = 1; period <= 8; period++) {
                    if (scheduleData[weekOffset][dateStr][period]) {
                        periodCounts[period]++;
                    }
                }
            });
        });
        
        // Calculate utilization percentage for each period
        const utilization = {};
        for (let period = 1; period <= 8; period++) {
            utilization[period] = {
                count: periodCounts[period],
                percentage: totalDays > 0 ? (periodCounts[period] / totalDays) * 100 : 0
            };
        }
        
        return utilization;
    }
    
    /**
     * Calculate constraint pressure (how close the schedule is to constraint limits)
     * @param {Object} scheduleData - Copy of schedule data
     * @param {Object} constraints - Current constraints config
     * @return {Object} Constraint pressure metrics
     */
    function calculateConstraintPressure(scheduleData, constraints) {
        const pressure = {
            consecutive: {},
            daily: {},
            weekly: {}
        };
        
        // Calculate consecutive class pressure
        Object.keys(scheduleData).forEach(weekOffset => {
            Object.keys(scheduleData[weekOffset]).forEach(dateStr => {
                let maxConsecutive = 0;
                let currentConsecutive = 0;
                
                // Count consecutive classes
                for (let period = 1; period <= 8; period++) {
                    if (scheduleData[weekOffset][dateStr][period]) {
                        currentConsecutive++;
                        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
                    } else {
                        currentConsecutive = 0;
                    }
                }
                
                // Store pressure data for this day
                pressure.consecutive[dateStr] = {
                    max: maxConsecutive,
                    limit: constraints.maxConsecutiveClasses,
                    pressure: constraints.maxConsecutiveClasses > 0 ? 
                        (maxConsecutive / constraints.maxConsecutiveClasses) * 100 : 0
                };
            });
        });
        
        // Calculate daily class count pressure
        Object.keys(scheduleData).forEach(weekOffset => {
            Object.keys(scheduleData[weekOffset]).forEach(dateStr => {
                const classCount = Object.values(scheduleData[weekOffset][dateStr])
                    .filter(className => !!className).length;
                
                // Store pressure data for this day
                pressure.daily[dateStr] = {
                    count: classCount,
                    limit: constraints.maxClassesPerDay,
                    pressure: constraints.maxClassesPerDay > 0 ?
                        (classCount / constraints.maxClassesPerDay) * 100 : 0
                };
            });
        });
        
        // Calculate weekly pressure
        Object.keys(scheduleData).forEach(weekOffset => {
            let weeklyClassCount = 0;
            
            // Count classes in this week
            Object.keys(scheduleData[weekOffset]).forEach(dateStr => {
                weeklyClassCount += Object.values(scheduleData[weekOffset][dateStr])
                    .filter(className => !!className).length;
            });
            
            // Store pressure data for this week
            pressure.weekly[weekOffset] = {
                count: weeklyClassCount,
                minLimit: constraints.minClassesPerWeek,
                maxLimit: constraints.maxClassesPerWeek,
                pressure: constraints.maxClassesPerWeek > constraints.minClassesPerWeek ?
                    ((weeklyClassCount - constraints.minClassesPerWeek) / 
                    (constraints.maxClassesPerWeek - constraints.minClassesPerWeek)) * 100 : 0
            };
        });
        
        return pressure;
    }
    
    /**
     * Calculate overall quality score from individual metrics
     * @param {Object} metrics - All calculated metrics
     * @return {Number} Overall quality score (0-100)
     */
    /**
     * Identify opportunities to compress the schedule
     * @param {Object} metrics - The calculated metrics
     * @return {Object} Compression opportunities
     */
    function identifyCompressionOpportunities(metrics) {
        // Find date ranges with low utilization that could be compressed
        // Use a less strict threshold for compression analysis
        const lowUtilizationDays = Object.entries(metrics.dailyBalance)
            .filter(([_, data]) => data.classCount < data.idealLoad * 0.7) // Was 0.5 (from status === 'underutilized')
            .map(([date, _]) => date)
            .sort(); // Sort by date
            
        // Allow detection with even just one day of low utilization
        if (lowUtilizationDays.length < 1) {
            return { potentialDaysReduction: 0, dateRanges: [] };
        }
        
        // Convert to Date objects for easier manipulation
        const dates = lowUtilizationDays.map(dateStr => new Date(dateStr));
        
        // Find consecutive spans of lower utilization days
        let rangeStart = dates[0];
        let rangeEnd = dates[0];
        const ranges = [];
        
        for (let i = 1; i < dates.length; i++) {
            const currentDate = dates[i];
            const prevDate = dates[i-1];
            
            // Check if dates are consecutive or close (within 1-3 days instead of 1-2)
            const daysDiff = (currentDate - prevDate) / (1000 * 60 * 60 * 24);
            
            if (daysDiff <= 3) { // More lenient gap tolerance
                // Part of the current range
                rangeEnd = currentDate;
            } else {
                // End of a range, start a new one
                // Even consider short ranges (≥1 day)
                if ((rangeEnd - rangeStart) / (1000 * 60 * 60 * 24) >= 1) {
                    ranges.push({
                        start: formatDate(rangeStart),
                        end: formatDate(rangeEnd),
                        days: Math.round((rangeEnd - rangeStart) / (1000 * 60 * 60 * 24)) + 1
                    });
                }
                rangeStart = currentDate;
                rangeEnd = currentDate;
            }
        }
        
        // Add the last range if it exists
        // No minimum range size requirement
        if (rangeStart && rangeEnd) {
            ranges.push({
                start: formatDate(rangeStart),
                end: formatDate(rangeEnd),
                days: Math.round((rangeEnd - rangeStart) / (1000 * 60 * 60 * 24)) + 1
            });
        }
        
        // Even if we don't have ranges, suggest compression if there are any low utilization days
        // Slightly more aggressive potential reduction estimation
        const potentialReduction = Math.max(1, Math.floor(lowUtilizationDays.length * 0.7)); // Was 0.5
        
        return {
            potentialDaysReduction: potentialReduction,
            dateRanges: ranges
        };
    }
    
    /**
     * Format a date as YYYY-MM-DD
     * @param {Date} date - The date to format
     * @return {string} Formatted date
     */
    function formatDate(date) {
        if (typeof date === 'string') return date; // Already formatted
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    function calculateOverallQuality(metrics) {
        // Calculate average balance score
        let totalBalanceScore = 0;
        let dayCount = 0;
        
        Object.values(metrics.dailyBalance).forEach(dayData => {
            totalBalanceScore += dayData.score;
            dayCount++;
        });
        
        const avgBalanceScore = dayCount > 0 ? totalBalanceScore / dayCount : 0;
        
        // Calculate average constraint pressure
        let totalPressure = 0;
        let pressureCount = 0;
        
        // Daily pressure
        Object.values(metrics.constraintPressure.daily).forEach(dayData => {
            // We want pressure in the 70-90% range, so penalize values outside that
            const optimalPressure = Math.min(90, Math.max(70, dayData.pressure));
            const pressureScore = 100 - Math.abs(optimalPressure - dayData.pressure);
            totalPressure += pressureScore;
            pressureCount++;
        });
        
        const avgPressureScore = pressureCount > 0 ? totalPressure / pressureCount : 0;
        
        // Calculate period distribution score
        let periodVariance = 0;
        let periodCount = 0;
        const avgPeriodUtilization = Object.values(metrics.periodUtilization)
            .reduce((sum, data) => sum + data.percentage, 0) / 8;
        
        Object.values(metrics.periodUtilization).forEach(periodData => {
            periodVariance += Math.pow(periodData.percentage - avgPeriodUtilization, 2);
            periodCount++;
        });
        
        // Lower variance is better (more even distribution)
        const periodVarianceScore = 100 - Math.min(100, Math.sqrt(periodVariance / 8));
        
        // Weighted average for overall score
        return Math.round(
            (avgBalanceScore * 0.5) +
            (avgPressureScore * 0.3) +
            (periodVarianceScore * 0.2)
        );
    }
    
    /**
     * Generate optimization suggestions based on metrics
     * @param {Object} metrics - Calculated metrics
     * @return {Array} List of suggestions
     */
    function generateSuggestions(metrics) {
        const suggestions = [];
        
        // Check for days with lower utilization (less strict threshold)
        // Use a lower utilization threshold to catch more days
        const lowUtilizationDays = Object.entries(metrics.dailyBalance)
            .filter(([_, dayData]) => dayData.classCount < dayData.idealLoad * 0.7)
            .map(([date, _]) => date);
        
        if (lowUtilizationDays.length > 0) {
            // Format dates for display
            const formattedDates = lowUtilizationDays.slice(0, 3).map(dateStr => {
                const date = new Date(dateStr);
                return date.toLocaleDateString(undefined, {weekday: 'short', month: 'short', day: 'numeric'});
            });
            
            const dateText = formattedDates.join(', ') + 
                (lowUtilizationDays.length > 3 ? ` and ${lowUtilizationDays.length - 3} more` : '');
            
            suggestions.push({
                type: 'balance',
                message: 'Consider adding more classes to less utilized days to improve balance.',
                details: `Lower utilization days: ${dateText}`
            });
        }
        
        // Check for compression opportunities with lower threshold
        const compressionOps = identifyCompressionOpportunities(metrics);
        // Remove the length check to make it easier to find compression opportunities
        if (compressionOps.potentialDaysReduction > 0) {
            const ranges = compressionOps.dateRanges.map(range => {
                const start = new Date(range.start);
                const end = new Date(range.end);
                return `${start.toLocaleDateString(undefined, {month: 'short', day: 'numeric'})} to ${end.toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}`;
            }).join(', ');
            
            // If no specific ranges but we still have potential reduction
            const message = ranges.length > 0 
                ? `Sparse date ranges: ${ranges}`
                : `Potential to reduce schedule span by ${compressionOps.potentialDaysReduction} days`;
            
            suggestions.push({
                type: 'compression',
                message: 'Consider consolidating classes to reduce schedule span.',
                details: message
            });
        }
        
        // Check for period utilization imbalance with more lenient thresholds
        const periodUtilization = metrics.periodUtilization;
        const lowPeriods = [];
        const highPeriods = [];
        
        Object.entries(periodUtilization).forEach(([period, data]) => {
            // More lenient thresholds: 40% instead of 30%, 70% instead of 80%
            if (data.percentage < 40) {
                lowPeriods.push(period);
            } else if (data.percentage > 70) {
                highPeriods.push(period);
            }
        });
        
        // Make this suggestion more likely by only requiring one condition
        if (lowPeriods.length > 0 || highPeriods.length > 0) {
            let details = '';
            if (highPeriods.length > 0) {
                details += `High-use periods: ${highPeriods.join(', ')}. `;
            }
            if (lowPeriods.length > 0) {
                details += `Low-use periods: ${lowPeriods.join(', ')}.`;
            }
            
            suggestions.push({
                type: 'utilization',
                message: 'Consider redistributing classes across periods for better balance.',
                details: details
            });
        }
        
        // Weekly balance suggestions with more lenient threshold
        const weeklyPressure = metrics.constraintPressure.weekly;
        const unbalancedWeeks = [];
        
        Object.entries(weeklyPressure).forEach(([offset, data]) => {
            // Give suggestion even if close to the minimum (within 90%)
            if (data.count < data.minLimit * 0.9) {
                const weekNum = parseInt(offset) + 1;
                unbalancedWeeks.push(`Week ${weekNum} (${data.count}/${data.minLimit})`);
            }
        });
        
        if (unbalancedWeeks.length > 0) {
            suggestions.push({
                type: 'weekly',
                message: 'Some weeks are below the recommended class minimum.',
                details: `Weeks below minimum: ${unbalancedWeeks.join(', ')}`
            });
        }
        
        // Add an overall quality suggestion if score is less than 90
        if (metrics.overallQuality < 90) {
            suggestions.push({
                type: 'quality',
                message: 'Your schedule has room for improvement in overall quality.',
                details: `Current quality score: ${metrics.overallQuality}/100. Aim for a more balanced distribution across days and periods.`
            });
        }
        
        return suggestions;
    }
    
    // Public API - only way main app interacts with this module
    return {
        /**
         * Calculate metrics for the provided schedule data
         * @param {Object} scheduleData - Copy of schedule data
         * @param {Object} constraints - Current constraints
         * @return {Object} Calculated metrics
         */
        calculateMetrics: function(scheduleData, constraints) {
            // Use cached results if data hasn't changed (within 5 seconds)
            const dataFingerprint = JSON.stringify(scheduleData) + JSON.stringify(constraints);
            const now = Date.now();
            
            if (_metricsCache && 
                _metricsCache.fingerprint === dataFingerprint && 
                now - _lastCalculationTime < 5000) {
                return _metricsCache.metrics;
            }
            
            try {
                // Calculate all metrics
                const metrics = {
                    scheduleSpan: calculateScheduleSpan(scheduleData),
                    dailyBalance: calculateDailyBalance(scheduleData, constraints.maxClassesPerDay || 4),
                    periodUtilization: calculatePeriodUtilization(scheduleData),
                    constraintPressure: calculateConstraintPressure(scheduleData, constraints),
                    overallQuality: 0 // Will be calculated
                };
                
                // Calculate overall quality score (weighted average)
                metrics.overallQuality = calculateOverallQuality(metrics);
                
                // Cache results
                _metricsCache = {
                    fingerprint: dataFingerprint,
                    metrics: metrics
                };
                _lastCalculationTime = now;
                
                return metrics;
            } catch (error) {
                console.error('Error calculating metrics:', error);
                // Return basic empty metrics structure on error
                return {
                    scheduleSpan: 0,
                    dailyBalance: {},
                    periodUtilization: {},
                    constraintPressure: {},
                    overallQuality: 0,
                    error: true
                };
            }
        },
        
        /**
         * Generate insights based on calculated metrics
         * @param {Object} metrics - Previously calculated metrics
         * @return {Array} List of insights with messages and types
         */
        generateInsights: function(metrics) {
            if (metrics.error) return [];
            
            const insights = [];
            
            // Schedule span insights
            if (metrics.scheduleSpan > 0) {
                insights.push({
                    type: 'span',
                    message: `Your schedule spans ${metrics.scheduleSpan} days from first to last class.`
                });
            }
            
            // Daily balance insights
            const balanceCategories = {
                underutilized: 0,
                balanced: 0,
                nearCapacity: 0
            };
            
            Object.values(metrics.dailyBalance).forEach(day => {
                balanceCategories[day.status]++;
            });
            
            if (balanceCategories.underutilized > 0) {
                insights.push({
                    type: 'balance',
                    message: `${balanceCategories.underutilized} days are underutilized (less than 50% of ideal class load).`
                });
            }
            
            if (balanceCategories.nearCapacity > 0) {
                insights.push({
                    type: 'balance',
                    message: `${balanceCategories.nearCapacity} days are near capacity (90% or more of maximum).`
                });
            }
            
            // Period utilization insights
            const lowUtilizationPeriods = Object.entries(metrics.periodUtilization)
                .filter(([_, data]) => data.percentage < 30)
                .map(([period, _]) => period);
                
            if (lowUtilizationPeriods.length > 0) {
                insights.push({
                    type: 'utilization',
                    message: `Periods ${lowUtilizationPeriods.join(', ')} are underutilized (<30% of days).`
                });
            }
            
            // Compression insights
            const compressionOps = identifyCompressionOpportunities(metrics);
            if (compressionOps.potentialDaysReduction > 0) {
                insights.push({
                    type: 'compression',
                    message: `There may be an opportunity to reduce the schedule span by approximately ${compressionOps.potentialDaysReduction} days while maintaining balance.`
                });
            }
            
            // Quality score insight
            insights.push({
                type: 'quality',
                message: `Overall schedule quality score: ${metrics.overallQuality}/100`
            });
            
            return insights;
        },
        
        /**
         * Generate optimization suggestions based on metrics
         * @param {Object} metrics - Previously calculated metrics
         * @return {Array} Actionable suggestions for improving the schedule
         */
        generateSuggestions: function(metrics) {
            if (metrics.error) return [];
            
            return generateSuggestions(metrics);
        }
    };
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScheduleAnalytics;
}