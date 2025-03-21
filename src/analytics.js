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
                
                dailyScores[dateStr] = {
                    classCount,
                    idealLoad,
                    score: Math.max(0, Math.min(100, score)), // Clamp between 0-100
                    status: classCount < idealLoad * 0.5 ? 'underutilized' :
                           classCount > maxClassesPerDay * 0.9 ? 'nearCapacity' : 'balanced'
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
            
            // Quality score insight
            insights.push({
                type: 'quality',
                message: `Overall schedule quality score: ${metrics.overallQuality}/100`
            });
            
            return insights;
        }
    };
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScheduleAnalytics;
}