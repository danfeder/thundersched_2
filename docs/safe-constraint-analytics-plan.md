# Safe Constraint Analytics Implementation Plan

## Overview

This document outlines a safe, isolated approach to implementing Constraint Analytics in the Cooking Class Scheduler application. The feature will provide users with insights on schedule quality, focusing on balanced compression (minimizing schedule span while maintaining even distribution).

The implementation follows a tiered strategy designed to minimize risk to existing functionality while gradually introducing more advanced capabilities. Each phase can be independently deployed and tested, with clear isolation boundaries to prevent interference with core scheduling features.

## Key Objectives

1. **Measure Schedule Quality**: Provide metrics on schedule span, balance, and constraint utilization
2. **Visualize Schedule Patterns**: Offer intuitive visualizations of class distribution and optimization opportunities
3. **Suggest Improvements**: Generate actionable suggestions to improve schedules while preserving balance
4. **Enable What-If Analysis**: Allow users to explore the impact of constraint modifications
5. **Maintain Application Integrity**: Ensure analytics features cannot break existing functionality

## Design Principles

1. **Complete Isolation**: Analytics module operates only on copies of data, never modifying original structures
2. **Progressive Enhancement**: Start with basic read-only features, adding complexity only after thorough testing
3. **Graceful Degradation**: All advanced features have fallbacks if problems occur
4. **User Control**: Analytics assist the scheduling process but never take control away from users
5. **Safe Integration**: External libraries are loaded only when needed and wrapped with safeguards

## Implementation Phases

### Phase 1: Read-Only Analytics Dashboard (2 weeks)

This phase focuses on adding a completely isolated analytics tab that provides insights without modifying any existing code paths.

#### 1.1 Create Isolated Analytics Module

```javascript
// analytics.js - Completely isolated from main application
const ScheduleAnalytics = (function() {
    // Private state - inaccessible from outside
    let _metricsCache = null;
    let _lastCalculationTime = 0;
    
    // Private methods
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
    
    // More calculation functions...
    
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
            
            // Calculate all metrics
            const metrics = {
                scheduleSpan: calculateScheduleSpan(scheduleData),
                dailyBalance: calculateDailyBalance(scheduleData, constraints.maxClassesPerDay),
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
        },
        
        /**
         * Check if there are potential compression opportunities
         * @param {Object} metrics - Previously calculated metrics
         * @return {Object} Compression potential details
         */
        identifyCompressionOpportunities: function(metrics) {
            // Analyze metrics to find potential compression opportunities
            // WITHOUT making specific suggestions yet
            return {
                potentialDaysReduction: estimatePotentialCompression(metrics),
                dateRanges: findSparseRanges(metrics)
            };
        }
    };
})();
```

#### 1.2 Create Analytics UI Components

```html
<!-- Add this to index.html -->
<div class="tab-content" id="analytics-tab" style="display: none;">
    <div class="analytics-dashboard">
        <div class="analytics-header">
            <h2>Schedule Analytics</h2>
            <div class="view-controls">
                <select id="analytics-view-selector">
                    <option value="overview">Overview</option>
                    <option value="heatmap">Class Distribution</option>
                    <option value="constraints">Constraint Utilization</option>
                </select>
            </div>
        </div>
        
        <div class="metrics-overview">
            <div class="metric-card">
                <h3>Schedule Span</h3>
                <div class="metric-value" id="metric-span">0 days</div>
                <div class="metric-detail" id="metric-span-detail"></div>
            </div>
            
            <div class="metric-card">
                <h3>Balance Score</h3>
                <div class="metric-value" id="metric-balance">0%</div>
                <div class="metric-gauge" id="balance-gauge">
                    <div class="gauge-fill" style="width: 0%"></div>
                </div>
            </div>
            
            <div class="metric-card">
                <h3>Overall Quality</h3>
                <div class="metric-value" id="metric-quality">0%</div>
                <div class="metric-gauge" id="quality-gauge">
                    <div class="gauge-fill" style="width: 0%"></div>
                </div>
            </div>
        </div>
        
        <div class="visualization-container" id="analytics-visualization">
            <!-- Visualization will be rendered here -->
        </div>
        
        <div class="analytics-insights">
            <h3>Schedule Insights</h3>
            <div id="analytics-insights-content" class="insights-content">
                <!-- Insights will be displayed here -->
            </div>
        </div>
    </div>
</div>
```

#### 1.3 Add Tab Navigation

```javascript
// Add to app.js
function initializeAnalytics() {
    // Set up tab switching
    document.getElementById('tab-analytics').addEventListener('click', function() {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.style.display = 'none';
        });
        
        // Show analytics tab
        document.getElementById('analytics-tab').style.display = 'block';
        
        // Update analytics with current data
        updateAnalytics();
    });
}

function updateAnalytics() {
    try {
        // Create COPIES of data to prevent accidental modification
        const scheduleCopy = JSON.parse(JSON.stringify(dataManager.scheduleWeeks));
        const constraintsCopy = JSON.parse(JSON.stringify(dataManager.getConfig()));
        
        // Calculate metrics
        const metrics = ScheduleAnalytics.calculateMetrics(scheduleCopy, constraintsCopy);
        
        // Update UI with metrics
        document.getElementById('metric-span').textContent = metrics.scheduleSpan + ' days';
        
        // Calculate and display average balance score
        let totalScore = 0;
        let dayCount = 0;
        Object.values(metrics.dailyBalance).forEach(dayData => {
            totalScore += dayData.score;
            dayCount++;
        });
        const avgBalance = dayCount > 0 ? Math.round(totalScore / dayCount) : 0;
        
        document.getElementById('metric-balance').textContent = avgBalance + '%';
        document.getElementById('balance-gauge').querySelector('.gauge-fill').style.width = avgBalance + '%';
        
        document.getElementById('metric-quality').textContent = metrics.overallQuality + '%';
        document.getElementById('quality-gauge').querySelector('.gauge-fill').style.width = metrics.overallQuality + '%';
        
        // Update visualization based on currently selected view
        updateVisualization(metrics);
        
        // Update insights
        updateInsights(metrics);
    } catch (error) {
        console.error('Error updating analytics (safely contained):', error);
        
        // Show fallback content if there's an error
        document.getElementById('metric-span').textContent = 'Unavailable';
        document.getElementById('metric-balance').textContent = 'Unavailable';
        document.getElementById('metric-quality').textContent = 'Unavailable';
    }
}
```

#### 1.4 Implement Basic Visualizations

```javascript
function updateVisualization(metrics) {
    const container = document.getElementById('analytics-visualization');
    const viewType = document.getElementById('analytics-view-selector').value;
    
    // Clear container
    container.innerHTML = '';
    
    try {
        switch (viewType) {
            case 'overview':
                renderOverviewVisualization(container, metrics);
                break;
            case 'heatmap':
                renderHeatmapVisualization(container, metrics);
                break;
            case 'constraints':
                renderConstraintVisualization(container, metrics);
                break;
            default:
                renderOverviewVisualization(container, metrics);
        }
    } catch (error) {
        console.error('Visualization error (safely contained):', error);
        container.innerHTML = '<div class="error-message">Visualization unavailable</div>';
    }
}

function renderHeatmapVisualization(container, metrics) {
    // Implementation of heat map visualization using Canvas or SVG
    // This creates a visual representation of class density across the schedule
    // without relying on external libraries
}
```

#### 1.5 Add CSS Styles

```css
/* analytics.css */
.analytics-dashboard {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.metrics-overview {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
}

.metric-card {
    background-color: white;
    border-radius: 4px;
    padding: 1rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    flex: 1;
    min-width: 200px;
}

.metric-value {
    font-size: 1.8rem;
    font-weight: bold;
    margin: 0.5rem 0;
}

.metric-gauge {
    height: 8px;
    background-color: #e0e0e0;
    border-radius: 4px;
    overflow: hidden;
}

.gauge-fill {
    height: 100%;
    background-color: #4caf50;
    transition: width 0.3s ease;
}

.visualization-container {
    background-color: white;
    border-radius: 4px;
    padding: 1rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    height: 400px;
}

.analytics-insights {
    background-color: white;
    border-radius: 4px;
    padding: 1rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.insights-content {
    padding: 1rem;
    background-color: #f9f9f9;
    border-left: 4px solid #2196f3;
}
```

### Phase 2: Basic Insights and Suggestions (1 week)

Building on the read-only foundation, this phase adds non-invasive insights and general suggestions without modifying existing code.

#### 2.1 Implement Insights Generation

```javascript
// Add to analytics.js
function generateInsights(metrics) {
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
    
    // Compression opportunities
    const compressionOps = identifyCompressionOpportunities(metrics);
    if (compressionOps.potentialDaysReduction > 0) {
        insights.push({
            type: 'compression',
            message: `There may be an opportunity to reduce the schedule span by approximately ${compressionOps.potentialDaysReduction} days while maintaining balance.`
        });
    }
    
    return insights;
}

// Add to public API
return {
    // Existing methods...
    
    generateInsights: function(metrics) {
        return generateInsights(metrics);
    }
};
```

#### 2.2 Add Insights Display

```javascript
function updateInsights(metrics) {
    const container = document.getElementById('analytics-insights-content');
    
    try {
        // Generate insights
        const insights = ScheduleAnalytics.generateInsights(metrics);
        
        // Clear container
        container.innerHTML = '';
        
        if (insights.length === 0) {
            container.innerHTML = '<p>No additional insights available for this schedule.</p>';
            return;
        }
        
        // Create insights list
        const list = document.createElement('ul');
        list.className = 'insights-list';
        
        insights.forEach(insight => {
            const item = document.createElement('li');
            item.className = `insight-item insight-${insight.type}`;
            item.textContent = insight.message;
            list.appendChild(item);
        });
        
        container.appendChild(list);
    } catch (error) {
        console.error('Error generating insights (safely contained):', error);
        container.innerHTML = '<p>Insights unavailable</p>';
    }
}
```

#### 2.3 Add General Suggestions

```javascript
// Add to analytics.js
function generateSuggestions(metrics) {
    const suggestions = [];
    
    // Check for underutilized days
    const underutilizedDays = Object.entries(metrics.dailyBalance)
        .filter(([_, dayData]) => dayData.status === 'underutilized')
        .map(([date, _]) => date);
    
    if (underutilizedDays.length > 0) {
        suggestions.push({
            type: 'balance',
            message: 'Consider adding more classes to underutilized days to improve balance.',
            details: `Underutilized days: ${underutilizedDays.map(formatDate).join(', ')}`
        });
    }
    
    // Check for compression opportunities
    const compressionOps = identifyCompressionOpportunities(metrics);
    if (compressionOps.potentialDaysReduction > 0 && compressionOps.dateRanges.length > 0) {
        const ranges = compressionOps.dateRanges.map(range => 
            `${formatDate(range.start)} to ${formatDate(range.end)}`
        ).join(', ');
        
        suggestions.push({
            type: 'compression',
            message: 'Consider consolidating classes to reduce schedule span.',
            details: `Sparse date ranges: ${ranges}`
        });
    }
    
    return suggestions;
}

// Add to public API
return {
    // Existing methods...
    
    generateSuggestions: function(metrics) {
        return generateSuggestions(metrics);
    }
};
```

#### 2.4 Add Suggestions UI

```html
<!-- Add this to analytics-tab in index.html -->
<div class="analytics-suggestions">
    <h3>Optimization Suggestions</h3>
    <button id="generate-suggestions-btn" class="btn">Generate Suggestions</button>
    <div id="suggestions-container" class="suggestions-container">
        <!-- Suggestions will be shown here -->
    </div>
</div>
```

```javascript
// Add to app.js
document.getElementById('generate-suggestions-btn').addEventListener('click', function() {
    generateAndDisplaySuggestions();
});

function generateAndDisplaySuggestions() {
    const container = document.getElementById('suggestions-container');
    
    try {
        // Create copies of data
        const scheduleCopy = JSON.parse(JSON.stringify(dataManager.scheduleWeeks));
        const constraintsCopy = JSON.parse(JSON.stringify(dataManager.getConfig()));
        
        // Get current metrics
        const metrics = ScheduleAnalytics.calculateMetrics(scheduleCopy, constraintsCopy);
        
        // Generate suggestions
        const suggestions = ScheduleAnalytics.generateSuggestions(metrics);
        
        // Clear container
        container.innerHTML = '';
        
        if (suggestions.length === 0) {
            container.innerHTML = '<p>No optimization suggestions available. Your schedule appears to be well-optimized!</p>';
            return;
        }
        
        // Create suggestions list
        const list = document.createElement('div');
        list.className = 'suggestions-list';
        
        suggestions.forEach(suggestion => {
            const item = document.createElement('div');
            item.className = `suggestion-item suggestion-${suggestion.type}`;
            
            const title = document.createElement('h4');
            title.textContent = suggestion.message;
            
            const details = document.createElement('p');
            details.textContent = suggestion.details;
            details.className = 'suggestion-details';
            
            item.appendChild(title);
            item.appendChild(details);
            list.appendChild(item);
        });
        
        container.appendChild(list);
    } catch (error) {
        console.error('Error generating suggestions (safely contained):', error);
        container.innerHTML = '<p>Suggestions unavailable</p>';
    }
}
```

### Phase 3: What-If Analysis with Lazy-Loaded Library (2 weeks)

This phase introduces a lightweight constraint library for what-if analysis, using lazy loading to prevent impact on initial load time.

#### 3.1 Add Library Loader Utility

```javascript
// Create a utility for lazy-loading
const LibraryLoader = {
    // Track loaded libraries
    loaded: {},
    
    /**
     * Load a JavaScript library only when needed
     * @param {string} name - Library identifier
     * @param {string} url - Library URL
     * @param {Function} checkFn - Function to check if already loaded
     * @return {Promise} Resolves when library is loaded
     */
    loadLibrary: function(name, url, checkFn) {
        // Return immediately if already loaded
        if (this.loaded[name]) {
            return Promise.resolve();
        }
        
        // Check if it's already available in window
        if (checkFn && checkFn()) {
            this.loaded[name] = true;
            return Promise.resolve();
        }
        
        // Load the script
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.async = true;
            
            script.onload = () => {
                this.loaded[name] = true;
                resolve();
            };
            
            script.onerror = () => {
                reject(new Error(`Failed to load ${name} library`));
            };
            
            document.head.appendChild(script);
        });
    }
};
```

#### 3.2 Create Safe Solver Wrapper

```javascript
// solver-wrapper.js
const ConstraintSolverWrapper = (function() {
    // Private state
    let _solver = null;
    let _isInitialized = false;
    let _initializationError = null;
    let _initializationPromise = null;
    
    // Private methods
    // Helper function to find valid periods by removing known conflicts
    function findValidPeriods(scheduleData, teacherUnavailability, classConflicts) {
        const validPeriods = {};
        
        Object.keys(scheduleData).forEach((weekOffset, weekIndex) => {
            Object.keys(scheduleData[weekOffset]).forEach((dateStr, dayIndex) => {
                for (let period = 1; period <= 8; period++) {
                    const key = `${weekIndex}_${dayIndex}_${period}`;
                    
                    // Check teacher availability
                    const teacherIsAvailable = !(teacherUnavailability[weekOffset]?.[dateStr]?.[period]);
                    
                    // Check class conflicts
                    const noClassConflict = !classConflicts[weekOffset]?.[dateStr]?.[period];
                    
                    validPeriods[key] = teacherIsAvailable && noClassConflict;
                }
            });
        });
        
        return validPeriods;
    }
    
    // Helper function to calculate quality score for a period
    function calculatePeriodQualityScore(scheduleData, weekOffset, dateStr, period) {
        // Base score for valid placement
        let score = 1.0;
        
        // Prefer periods that maintain better daily balance
        const dayClasses = Object.values(scheduleData[weekOffset][dateStr])
            .filter(className => !!className).length;
        const idealLoad = 4; // Assuming ideal is 4 classes per day
        const balanceScore = 1 - (Math.abs(dayClasses - idealLoad) / 8);
        
        // Prefer periods that don't create long gaps
        const hasAdjacentClass = (
            scheduleData[weekOffset][dateStr][period - 1] ||
            scheduleData[weekOffset][dateStr][period + 1]
        );
        const adjacencyScore = hasAdjacentClass ? 0.2 : 0;
        
        return score * (1 + balanceScore + adjacencyScore);
    }
    
    async function loadSolver() {
        try {
            // Try WebAssembly version first
            await LibraryLoader.loadLibrary(
                'glpk-wasm',
                'libs/glpk-wasm.js',
                () => window.GLPK !== undefined && window.GLPK.version.includes('wasm')
            );
            _solver = window.GLPK;
            _isInitialized = true;
            console.log('Using GLPK WebAssembly version for optimal performance');
        } catch (error) {
            console.warn('WebAssembly version failed to load, falling back to JavaScript:', error);
            
            // Fall back to JavaScript version
            try {
                await LibraryLoader.loadLibrary(
                    'glpk-js',
                    'libs/glpk.min.js',
                    () => window.GLPK !== undefined
                );
                _solver = window.GLPK;
                _isInitialized = true;
                console.log('Using GLPK JavaScript version');
            } catch (fallbackError) {
                _initializationError = fallbackError;
                _isInitialized = false;
                console.error('Failed to initialize constraint solver:', fallbackError);
                throw fallbackError;
            }
        }
    }
    
    // Map GLPK status codes to meaningful messages
    const GLPK_STATUS_MESSAGES = {
        [GLPK.SUCCESS]: 'Solution is optimal',
        [GLPK.UNBOUNDED]: 'Problem has unbounded solution',
        [GLPK.INFEASIBLE]: 'Problem has no feasible solution',
        [GLPK.NOFEASIBLE]: 'No feasible solution exists',
        [GLPK.NODFS]: 'No dual feasible solution exists',
        [GLPK.ITERATION_LIMIT]: 'Iteration limit exceeded',
        [GLPK.TIME_LIMIT]: 'Time limit exceeded'
    };
    
    function buildSolverModel(scheduleData, constraints, teacherUnavailability = {}, classConflicts = {}) {
        // Pre-solve: identify and remove known conflicts to reduce problem size
        const validPeriods = findValidPeriods(scheduleData, teacherUnavailability, classConflicts);
        
        // Create optimized GLPK problem object
        const problem = {
            name: 'ScheduleOptimization',
            objective: {
                direction: GLPK.MAX,
                name: 'obj',
                vars: {}
            },
            subjectTo: {},
            binaries: {}
        };
        
        // Track existing assignments for warm start
        const warmStart = {};
        
        // Convert schedule data into GLPK variables and constraints
        Object.keys(scheduleData).forEach((weekOffset, weekIndex) => {
            Object.keys(scheduleData[weekOffset]).forEach((dateStr, dayIndex) => {
                // Only create variables for valid periods
                for (let period = 1; period <= 8; period++) {
                    if (validPeriods[`${weekIndex}_${dayIndex}_${period}`]) {
                        const varName = `x_${weekIndex}_${dayIndex}_${period}`;
                        
                        // Add binary variable to objective with quality score coefficient
                        const qualityScore = calculatePeriodQualityScore(scheduleData, weekOffset, dateStr, period);
                        problem.objective.vars[varName] = qualityScore;
                        
                        // Mark variable as binary (0 or 1)
                        problem.binaries[varName] = true;
                        
                        // Track existing assignments for warm start
                        if (scheduleData[weekOffset][dateStr][period]) {
                            warmStart[varName] = 1;
                        }
                    }
                }
                
                // Add daily capacity constraint
                const dayConstraintName = `day_capacity_${weekIndex}_${dayIndex}`;
                problem.subjectTo[dayConstraintName] = {
                    name: dayConstraintName,
                    vars: Array.from({ length: 8 }, (_, period) => ({
                        name: `x_${weekIndex}_${dayIndex}_${period + 1}`,
                        coef: 1
                    })).filter(v => validPeriods[v.name.split('x_')[1]]), // Only include valid periods
                    bnds: { type: GLPK.UP, ub: constraints.maxClassesPerDay }
                };
                
                // Add consecutive class constraints
                for (let p = 1; p <= 8 - constraints.maxConsecutiveClasses; p++) {
                    const consecutiveConstraintName = `consecutive_${weekIndex}_${dayIndex}_${p}`;
                    const consecutiveVars = Array.from(
                        { length: constraints.maxConsecutiveClasses + 1 },
                        (_, i) => ({
                            name: `x_${weekIndex}_${dayIndex}_${p + i}`,
                            coef: 1
                        })
                    ).filter(v => validPeriods[v.name.split('x_')[1]]); // Only include valid periods
                    
                    if (consecutiveVars.length > 0) {
                        problem.subjectTo[consecutiveConstraintName] = {
                            name: consecutiveConstraintName,
                            vars: consecutiveVars,
                            bnds: { type: GLPK.UP, ub: constraints.maxConsecutiveClasses }
                        };
                    }
                }
            });
            
            // Add weekly constraints (aggregated by teacher/class)
            const weekConstraintName = `week_bounds_${weekIndex}`;
            const weekVars = [];
            Object.keys(scheduleData[weekOffset]).forEach((dateStr, dayIndex) => {
                for (let period = 1; period <= 8; period++) {
                    if (validPeriods[`${weekIndex}_${dayIndex}_${period}`]) {
                        weekVars.push({
                            name: `x_${weekIndex}_${dayIndex}_${period}`,
                            coef: 1
                        });
                    }
                }
            });
            
            if (weekVars.length > 0) {
                problem.subjectTo[weekConstraintName] = {
                    name: weekConstraintName,
                    vars: weekVars,
                    bnds: {
                        type: GLPK.DB,
                        lb: constraints.minClassesPerWeek,
                        ub: constraints.maxClassesPerWeek
                    }
                };
            }
        });
        
        // Add teacher unavailability constraints
        Object.keys(teacherUnavailability).forEach((weekOffset, weekIndex) => {
            Object.keys(teacherUnavailability[weekOffset]).forEach((dateStr, dayIndex) => {
                Object.entries(teacherUnavailability[weekOffset][dateStr]).forEach(([period, isUnavailable]) => {
                    if (isUnavailable) {
                        const unavailConstraintName = `teacher_unavail_${weekIndex}_${dayIndex}_${period}`;
                        problem.subjectTo[unavailConstraintName] = {
                            name: unavailConstraintName,
                            vars: [{ name: `x_${weekIndex}_${dayIndex}_${period}`, coef: 1 }],
                            bnds: { type: GLPK.FX, ub: 0, lb: 0 }
                        };
                    }
                });
            });
        });
        
        return {
            problem,
            warmStart,
            validPeriods
        };
    }
    
    // Helper functions for analyzing solver results
    function calculateConstraintSatisfaction(result, modelData) {
        const satisfaction = {
            total: 0,
            satisfied: 0,
            violations: []
        };
        
        // Check each constraint
        Object.entries(modelData.problem.subjectTo).forEach(([name, constraint]) => {
            const sum = constraint.vars.reduce((acc, v) => acc + (result.result.vars[v.name] || 0) * v.coef, 0);
            const bounds = constraint.bnds;
            let satisfied = true;
            
            switch (bounds.type) {
                case GLPK.FX:
                    satisfied = Math.abs(sum - bounds.ub) < 1e-6;
                    break;
                case GLPK.UP:
                    satisfied = sum <= bounds.ub + 1e-6;
                    break;
                case GLPK.LO:
                    satisfied = sum >= bounds.lb - 1e-6;
                    break;
                case GLPK.DB:
                    satisfied = sum >= bounds.lb - 1e-6 && sum <= bounds.ub + 1e-6;
                    break;
            }
            
            satisfaction.total++;
            if (satisfied) {
                satisfaction.satisfied++;
            } else {
                satisfaction.violations.push({ name, sum, bounds });
            }
        });
        
        return satisfaction;
    }
    
    function calculateBalanceScore(result, modelData) {
        let totalDays = 0;
        let balancedDays = 0;
        const dayTotals = new Map();
        
        // Calculate class totals per day
        Object.keys(result.result.vars).forEach(varName => {
            const [_, weekIndex, dayIndex] = varName.split('_').map(Number);
            const dayKey = `${weekIndex}_${dayIndex}`;
            const value = result.result.vars[varName];
            
            if (value > 0.5) { // Binary variable is effectively 1
                dayTotals.set(dayKey, (dayTotals.get(dayKey) || 0) + 1);
            }
        });
        
        // Calculate balance score
        dayTotals.forEach((count) => {
            totalDays++;
            // A day is considered balanced if it's between 50-90% of maxClassesPerDay
            if (count >= modelData.targetMin && count <= modelData.targetMax) {
                balancedDays++;
            }
        });
        
        return {
            score: totalDays ? (balancedDays / totalDays) * 100 : 100,
            dayTotals: Object.fromEntries(dayTotals)
        };
    }
    
    function analyzeInfeasibility(result, modelData) {
        // Check which constraints are causing infeasibility
        const violations = [];
        
        // Check each constraint type
        if (result.result.dual) {
            Object.entries(modelData.problem.subjectTo).forEach(([name, constraint]) => {
                const dualValue = result.result.dual[name];
                if (Math.abs(dualValue) > 1e-6) { // Significant dual value indicates constraint involvement
                    violations.push({
                        constraint: name,
                        type: constraint.bnds.type,
                        dualValue,
                        message: `Constraint ${name} appears to be causing infeasibility`
                    });
                }
            });
        }
        
        return violations.length > 0
            ? `Infeasibility analysis:\n${violations.map(v => v.message).join('\n')}`
            : 'Unable to determine specific cause of infeasibility';
    }
    
    function runSolverWithTimeout(modelData, timeoutMs = 3000) {
        return new Promise((resolve, reject) => {
            // Set timeout to prevent hanging
            const timeoutId = setTimeout(() => {
                reject(new Error('Solver timeout exceeded'));
            }, timeoutMs);
            
            try {
                // Apply warm start if available
                const result = _solver.solve({
                    name: modelData.problem.name,
                    objective: modelData.problem.objective,
                    subjectTo: modelData.problem.subjectTo,
                    binaries: modelData.problem.binaries,
                    initialSolution: modelData.warmStart || undefined
                });

                clearTimeout(timeoutId);

                // Handle GLPK status codes with detailed messages
                if (result.result.status !== GLPK.SUCCESS) {
                    const statusMessage = GLPK_STATUS_MESSAGES[result.result.status] || 'Unknown solver error';
                    if (result.result.status === GLPK.INFEASIBLE || result.result.status === GLPK.NOFEASIBLE) {
                        // For infeasibility, try to identify which constraints are causing issues
                        const infeasibilityAnalysis = analyzeInfeasibility(result, modelData);
                        reject(new Error(`GLPK solver failed: ${statusMessage}\n${infeasibilityAnalysis}`));
                    } else {
                        reject(new Error(`GLPK solver failed: ${statusMessage}`));
                    }
                    return;
                }

                // Add solution quality metrics
                const enhancedResult = {
                    ...result,
                    quality: {
                        objectiveValue: result.result.z,
                        constraintSatisfaction: calculateConstraintSatisfaction(result, modelData),
                        balanceScore: calculateBalanceScore(result, modelData)
                    },
                    validPeriods: modelData.validPeriods
                };

                resolve(enhancedResult);
            } catch (error) {
                clearTimeout(timeoutId);
                reject(error);
            }
        });
    }
    
    // Public API
    return {
        /**
         * Initialize the solver (lazy-loaded)
         * @return {Promise} Resolves when solver is ready
         */
        initialize: async function() {
            if (_isInitialized) return Promise.resolve();
            if (_initializationError) return Promise.reject(_initializationError);
            
            // Prevent multiple simultaneous initialization attempts
            if (_initializationPromise) return _initializationPromise;
            
            _initializationPromise = loadSolver();
            
            try {
                await _initializationPromise;
                return Promise.resolve();
            } catch (error) {
                return Promise.reject(error);
            } finally {
                _initializationPromise = null;
            }
        },
        
        /**
         * Check if solver is available
         * @return {boolean} True if solver is initialized
         */
        isAvailable: function() {
            return _isInitialized;
        },
        
        /**
         * Simulate constraint changes safely
         * @param {Object} scheduleData - Copy of schedule data
         * @param {Object} currentConstraints - Current constraints
         * @param {Object} newConstraints - Modified constraints
         * @return {Promise<Object>} Simulation results
         */
        simulateConstraintChanges: async function(scheduleData, currentConstraints, newConstraints) {
            if (!_isInitialized) {
                try {
                    await this.initialize();
                } catch (error) {
                    // Return basic simulation if solver fails
                    return simpleConstraintSimulation(scheduleData, currentConstraints, newConstraints);
                }
            }
            
            try {
                // Time-limited solver run to prevent hanging
                const modelData = buildSolverModel(scheduleData, newConstraints);
                const solverResult = await runSolverWithTimeout(modelData);
                
                return {
                    source: 'solver',
                    feasible: solverResult.result.status === GLPK.SUCCESS,
                    metrics: {
                        objectiveValue: solverResult.result.z,
                        numVariables: Object.keys(solverResult.result.vars).length,
                        numConstraints: solverResult.result.dual.length,
                        solution: solverResult.result.vars
                    },
                    invalidPlacements: identifyInvalidPlacementsGLPK(solverResult, scheduleData)
                };
            } catch (error) {
                console.error('Solver simulation failed, falling back to simple simulation:', error);
                
                // Fallback to basic simulation if solver errors
                return simpleConstraintSimulation(scheduleData, currentConstraints, newConstraints);
            }
        }
    };
})();

// Fallback implementation when solver isn't available
function simpleConstraintSimulation(scheduleData, currentConstraints, newConstraints) {
    // Basic simulation without the solver
    // This identifies obvious violations without advanced algorithms
    
    // Example: Find classes that violate consecutive limit
    const invalidPlacements = [];
    
    // Check all days for consecutive violations
    Object.keys(scheduleData).forEach(weekOffset => {
        Object.keys(scheduleData[weekOffset]).forEach(dateStr => {
            // Count consecutive classes
            let consecutive = 0;
            let lastClass = null;
            
            for (let period = 1; period <= 8; period++) {
                const className = scheduleData[weekOffset][dateStr][period];
                
                if (className) {
                    consecutive++;
                    
                    // Check if this violates new consecutive limit
                    if (consecutive > newConstraints.maxConsecutiveClasses && 
                        consecutive <= currentConstraints.maxConsecutiveClasses) {
                        invalidPlacements.push({
                            weekOffset,
                            dateStr,
                            period,
                            className,
                            reason: 'Exceeds new consecutive class limit'
                        });
                    }
                } else {
                    consecutive = 0;
                }
            }
        });
    });
    
    // Helper function to identify invalid placements using GLPK solution
    function identifyInvalidPlacementsGLPK(solverResult, scheduleData) {
        const invalidPlacements = [];
        const solution = solverResult.result.vars;
        
        // Check each variable in the solution
        Object.keys(solution).forEach(varName => {
            // Parse variable name to get indices (format: x_weekIndex_dayIndex_period)
            const [_, weekIndex, dayIndex, period] = varName.split('_').map(Number);
            
            // Get the actual week and date from scheduleData
            const weekOffset = Object.keys(scheduleData)[weekIndex];
            const dateStr = Object.keys(scheduleData[weekOffset])[dayIndex];
            const className = scheduleData[weekOffset][dateStr][period];
            
            // If there's a class but the solver says it shouldn't be there (value = 0)
            if (className && solution[varName] < 0.5) {
                invalidPlacements.push({
                    weekOffset,
                    dateStr,
                    period,
                    className,
                    reason: 'Class placement violates constraints'
                });
            }
        });
        
        return invalidPlacements;
    }
    
    // Similar checks for other constraint types...
    
    return {
        source: 'fallback',
        feasible: invalidPlacements.length === 0,
        invalidPlacements,
        metrics: {
            // Basic metrics without solver optimization
            invalidPlacements: invalidPlacements.length,
            affectedDays: [...new Set(invalidPlacements.map(p => p.dateStr))].length
        }
    };
}
```

#### 3.3 Create What-If Analysis UI

```html
<!-- Add to index.html -->
<div id="what-if-modal" class="modal">
    <div class="modal-content">
        <span class="close">&times;</span>
        <h2>What-If Analysis</h2>
        <p class="description">
            Adjust constraints to see how they might affect your schedule quality.
        </p>
        
        <div class="constraint-adjustments">
            <div class="constraint-group">
                <label for="what-if-consecutive">Max Consecutive Classes:</label>
                <div class="constraint-input-group">
                    <span id="what-if-consecutive-value">2</span>
                    <input type="range" id="what-if-consecutive" min="1" max="4" value="2">
                </div>
            </div>
            
            <div class="constraint-group">
                <label for="what-if-daily">Max Classes Per Day:</label>
                <div class="constraint-input-group">
                    <span id="what-if-daily-value">4</span>
                    <input type="range" id="what-if-daily" min="1" max="8" value="4">
                </div>
            </div>
            
            <div class="constraint-group">
                <label>Weekly Class Target:</label>
                <div class="constraint-input-group">
                    <span id="what-if-weekly-min-value">12</span>-<span id="what-if-weekly-max-value">16</span>
                    <div class="range-slider-container">
                        <input type="range" id="what-if-weekly-min" min="4" max="30" value="12">
                        <input type="range" id="what-if-weekly-max" min="4" max="30" value="16">
                    </div>
                </div>
            </div>
        </div>
        
        <div class="simulation-results">
            <h3>Simulation Results</h3>
            <div id="what-if-status" class="what-if-status">
                <div class="loading-indicator">Initializing...</div>
            </div>
            
            <div id="what-if-results" class="what-if-results" style="display: none;">
                <!-- Results will be shown here -->
            </div>
        </div>
        
        <div class="what-if-actions">
            <button id="what-if-simulate-btn" class="btn">Simulate Changes</button>
            <div class="what-if-advanced-actions" style="display: none;">
                <button id="what-if-apply-btn" class="btn">Apply Changes</button>
                <button id="what-if-cancel-btn" class="btn btn-secondary">Cancel</button>
            </div>
        </div>
    </div>
</div>
```

#### 3.4 Implement What-If Analysis Logic

```javascript
// Add to app.js
document.getElementById('show-what-if-btn').addEventListener('click', showWhatIfAnalysis);
document.getElementById('what-if-simulate-btn').addEventListener('click', runWhatIfSimulation);

// Track what-if state
const whatIfState = {
    isLibraryLoaded: false,
    hasRun: false,
    lastSimulation: null,
    isLoading: false
};

function showWhatIfAnalysis() {
    // Reset the form to current constraint values
    const currentConstraints = dataManager.getConfig();
    
    document.getElementById('what-if-consecutive').value = currentConstraints.maxConsecutiveClasses;
    document.getElementById('what-if-consecutive-value').textContent = currentConstraints.maxConsecutiveClasses;
    
    document.getElementById('what-if-daily').value = currentConstraints.maxClassesPerDay;
    document.getElementById('what-if-daily-value').textContent = currentConstraints.maxClassesPerDay;
    
    document.getElementById('what-if-weekly-min').value = currentConstraints.minClassesPerWeek;
    document.getElementById('what-if-weekly-min-value').textContent = currentConstraints.minClassesPerWeek;
    
    document.getElementById('what-if-weekly-max').value = currentConstraints.maxClassesPerWeek;
    document.getElementById('what-if-weekly-max-value').textContent = currentConstraints.maxClassesPerWeek;
    
    // Reset results
    document.getElementById('what-if-results').style.display = 'none';
    document.getElementById('what-if-status').innerHTML = '<div class="status-message">Adjust constraints and click "Simulate" to see potential impact</div>';
    
    // Show the modal
    document.getElementById('what-if-modal').style.display = 'block';
    
    // Start preloading the solver library in the background
    if (!whatIfState.isLibraryLoaded) {
        whatIfState.isLibraryLoaded = true;
        ConstraintSolverWrapper.initialize().catch(error => {
            console.log('Solver preload failed, will use fallback simulation:', error);
        });
    }
}

async function runWhatIfSimulation() {
    const resultContainer = document.getElementById('what-if-results');
    const statusContainer = document.getElementById('what-if-status');
    const actionContainer = document.querySelector('.what-if-advanced-actions');
    
    // Show loading state
    whatIfState.isLoading = true;
    statusContainer.innerHTML = '<div class="loading-indicator">Running simulation...</div>';
    resultContainer.style.display = 'none';
    actionContainer.style.display = 'none';
    
    try {
        // Get current and new constraints
        const currentConstraints = dataManager.getConfig();
        const newConstraints = {
            maxConsecutiveClasses: parseInt(document.getElementById('what-if-consecutive').value),
            maxClassesPerDay: parseInt(document.getElementById('what-if-daily').value),
            minClassesPerWeek: parseInt(document.getElementById('what-if-weekly-min').value),
            maxClassesPerWeek: parseInt(document.getElementById('what-if-weekly-max').value)
        };
        
        // Create a deep copy of schedule data
        const scheduleCopy = JSON.parse(JSON.stringify(dataManager.scheduleWeeks));
        
        // Run simulation with timeout protection
        const simulationPromise = ConstraintSolverWrapper.simulateConstraintChanges(
            scheduleCopy, 
            currentConstraints, 
            newConstraints
        );
        
        // Add timeout protection
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Simulation timed out')), 5000);
        });
        
        // Race the simulation against the timeout
        const simulation = await Promise.race([simulationPromise, timeoutPromise]);
        whatIfState.lastSimulation = simulation;
        whatIfState.hasRun = true;
        
        // Display results
        displayWhatIfResults(simulation, currentConstraints, newConstraints);
        
        // Show advanced actions
        actionContainer.style.display = 'flex';
    } catch (error) {
        console.error('What-if simulation error (safely contained):', error);
        statusContainer.innerHTML = `
            <div class="error-message">
                Simulation failed: ${error.message || 'Unknown error'}
                <button id="retry-simulation-btn" class="btn btn-small">Retry</button>
            </div>
        `;
        
        // Add retry handler
        document.getElementById('retry-simulation-btn').addEventListener('click', runWhatIfSimulation);
    } finally {
        whatIfState.isLoading = false;
    }
}

function displayWhatIfResults(simulation, currentConstraints, newConstraints) {
    const resultContainer = document.getElementById('what-if-results');
    const statusContainer = document.getElementById('what-if-status');
    
    // Show appropriate status message
    if (simulation.feasible) {
        statusContainer.innerHTML = `
            <div class="status-success">
                ✓ Schedule appears to be feasible with the new constraints
            </div>
        `;
    } else {
        statusContainer.innerHTML = `
            <div class="status-warning">
                ⚠ These constraints would cause ${simulation.invalidPlacements.length} placement conflicts
            </div>
        `;
    }
    
    // Build results content
    let resultsHtml = `
        <h4>Impact Analysis</h4>
        <table class="impact-table">
            <tr>
                <th>Metric</th>
                <th>Current</th>
                <th>Simulated</th>
            </tr>
    `;
    
    // Add comparison rows
    // This is simplified; real implementation would have more metrics
    resultsHtml += `
        <tr>
            <td>Class Placements</td>
            <td>${simulation.currentClassCount || 'N/A'}</td>
            <td>${simulation.simulatedClassCount || 'N/A'}</td>
        </tr>
        <tr>
            <td>Invalid Placements</td>
            <td>0</td>
            <td>${simulation.invalidPlacements.length}</td>
        </tr>
    `;
    
    resultsHtml += `</table>`;
    
    // Show affected placements if any
    if (simulation.invalidPlacements.length > 0) {
        resultsHtml += `
            <h4>Affected Placements</h4>
            <div class="affected-placements">
                <ul>
        `;
        
        // Show up to 5 invalid placements
        simulation.invalidPlacements.slice(0, 5).forEach(placement => {
            resultsHtml += `
                <li>
                    ${placement.className} on ${formatDate(placement.dateStr)} period ${placement.period}: 
                    ${placement.reason}
                </li>
            `;
        });
        
        // Show count if there are more
        if (simulation.invalidPlacements.length > 5) {
            resultsHtml += `<li>...and ${simulation.invalidPlacements.length - 5} more</li>`;
        }
        
        resultsHtml += `
                </ul>
            </div>
        `;
    }
    
    resultContainer.innerHTML = resultsHtml;
    resultContainer.style.display = 'block';
    
    // Set up apply button handler
    document.getElementById('what-if-apply-btn').onclick = function() {
        if (simulation.invalidPlacements.length > 0) {
            // Ask for confirmation if there are invalid placements
            if (confirm(`Applying these constraints will cause ${simulation.invalidPlacements.length} invalid placements. Do you want to continue?`)) {
                applyConstraintChanges(newConstraints, simulation.invalidPlacements);
            }
        } else {
            // Apply directly if feasible
            applyConstraintChanges(newConstraints, []);
        }
    };
    
    // Set up cancel button
    document.getElementById('what-if-cancel-btn').onclick = function() {
        document.getElementById('what-if-modal').style.display = 'none';
    };
}

function applyConstraintChanges(newConstraints, invalidPlacements) {
    // If there are invalid placements, remove them
    if (invalidPlacements.length > 0) {
        invalidPlacements.forEach(placement => {
            dataManager.unscheduleClass(placement.dateStr, placement.period);
        });
    }
    
    // Update constraints
    dataManager.updateConfig(newConstraints);
    
    // Close the modal
    document.getElementById('what-if-modal').style.display = 'none';
    
    // Update the schedule display
    renderScheduleGrid();
    updateProgress();
    
    // Show message
    if (invalidPlacements.length > 0) {
        showMessage('warning', `Constraints updated. ${invalidPlacements.length} affected classes have been unscheduled.`);
    } else {
        showMessage('success', 'Constraints updated successfully.');
    }
}
```

### Phase 4: Enhanced Visualizations and Optimization (2 weeks)

This phase adds more sophisticated visualizations and optional optimization suggestions, while maintaining the same safety principles.

#### 4.1 Implement Advanced Canvas-Based Visualizations

```javascript
// visualization.js
const ScheduleVisualizer = (function() {
    // Private state
    let _canvas = null;
    let _ctx = null;
    let _width = 0;
    let _height = 0;
    let _data = null;
    
    // Private methods
    function initializeCanvas(container) {
        // Create canvas if it doesn't exist
        if (!_canvas) {
            _canvas = document.createElement('canvas');
            container.appendChild(_canvas);
            _ctx = _canvas.getContext('2d');
        }
        
        // Set canvas size to match container
        _width = container.clientWidth;
        _height = container.clientHeight;
        _canvas.width = _width;
        _canvas.height = _height;
    }
    
    function renderHeatMapVisualization(metrics) {
        if (!_ctx || !metrics) return;
        
        // Clear canvas
        _ctx.clearRect(0, 0, _width, _height);
        
        // Get all dates from metrics
        const dates = Object.keys(metrics.dailyBalance).sort();
        
        // Calculate grid dimensions
        const cellWidth = _width / dates.length;
        const cellHeight = (_height - 30) / 8; // 8 periods, 30px for headers
        
        // Draw headers
        _ctx.fillStyle = '#333';
        _ctx.font = '12px Arial';
        
        dates.forEach((dateStr, index) => {
            const x = index * cellWidth + cellWidth / 2;
            _ctx.fillText(formatShortDate(dateStr), x, 20);
        });
        
        // Draw heat map cells
        dates.forEach((dateStr, dateIndex) => {
            const dayData = metrics.dailyBalance[dateStr];
            
            for (let period = 1; period <= 8; period++) {
                const x = dateIndex * cellWidth;
                const y = period * cellHeight + 30; // 30px offset for headers
                
                // Get class for this date/period
                const className = getScheduledClass(dateStr, period);
                
                // Determine cell color based on balance score and class
                let fillColor = '#f5f5f5'; // Default empty
                
                if (className) {
                    // Color based on day balance score (red -> yellow -> green)
                    const score = dayData.score;
                    
                    if (score < 50) {
                        // Red to yellow gradient
                        const r = 255;
                        const g = Math.floor((score / 50) * 255);
                        fillColor = `rgb(${r}, ${g}, 100)`;
                    } else {
                        // Yellow to green gradient
                        const r = Math.floor(255 - ((score - 50) / 50) * 255);
                        const g = 255;
                        fillColor = `rgb(${r}, ${g}, 100)`;
                    }
                }
                
                // Draw cell
                _ctx.fillStyle = fillColor;
                _ctx.fillRect(x + 1, y + 1, cellWidth - 2, cellHeight - 2);
                
                // Add text if there's a class
                if (className) {
                    _ctx.fillStyle = '#333';
                    _ctx.font = '10px Arial';
                    _ctx.fillText(className, x + 5, y + 15);
                }
            }
        });
    }
    
    function renderCompressionVisualization(metrics) {
        // Similar to heat map but highlights compression opportunities
        // This visualizes which days could potentially be eliminated
    }
    
    // Public API
    return {
        initialize: function(container) {
            initializeCanvas(container);
            
            // Handle window resize
            window.addEventListener('resize', () => {
                if (container.clientWidth !== _width || container.clientHeight !== _height) {
                    _width = container.clientWidth;
                    _height = container.clientHeight;
                    _canvas.width = _width;
                    _canvas.height = _height;
                    
                    // Re-render with current data
                    if (_data) {
                        this.render(_data);
                    }
                }
            });
            
            return this;
        },
        
        render: function(metrics, type = 'heatmap') {
            // Store data for potential re-renders
            _data = metrics;
            
            // Render based on type
            switch (type) {
                case 'heatmap':
                    renderHeatMapVisualization(metrics);
                    break;
                case 'compression':
                    renderCompressionVisualization(metrics);
                    break;
                default:
                    renderHeatMapVisualization(metrics);
            }
            
            return this;
        }
    };
})();
```

#### 4.2 Implement Specific Optimization Suggestions

```javascript
// Add to analytics.js private methods
function generateSpecificSuggestions(metrics) {
    const suggestions = [];
    
    // Check for underutilized days
    const lowUtilizationDays = Object.entries(metrics.dailyBalance)
        .filter(([_, data]) => data.status === 'underutilized')
        .sort((a, b) => a[1].classCount - b[1].classCount); // Sort by class count
    
    // Check for near-capacity days
    const highUtilizationDays = Object.entries(metrics.dailyBalance)
        .filter(([_, data]) => data.status === 'nearCapacity')
        .sort((a, b) => b[1].classCount - a[1].classCount); // Sort by class count
    
    // If there are both underutilized and high-utilization days, suggest balancing
    if (lowUtilizationDays.length > 0 && highUtilizationDays.length > 0) {
        suggestions.push({
            type: 'balance',
            priority: 'high',
            message: 'Consider moving classes from high-utilization days to underutilized days to improve balance.',
            details: `
                High utilization days: ${highUtilizationDays.slice(0, 3).map(([date, _]) => formatDate(date)).join(', ')}${highUtilizationDays.length > 3 ? '...' : ''}
                Underutilized days: ${lowUtilizationDays.slice(0, 3).map(([date, _]) => formatDate(date)).join(', ')}${lowUtilizationDays.length > 3 ? '...' : ''}
            `,
            action: 'balance'
        });
    }
    
    // Add suggestions for compression
    const compressionOpportunities = identifyCompressionOpportunities(metrics);
    if (compressionOpportunities.potentialDaysReduction > 0) {
        // Find specific compression suggestions
        const compressionSuggestions = findSpecificCompressionMoves(metrics);
        
        if (compressionSuggestions.length > 0) {
            suggestions.push({
                type: 'compression',
                priority: 'medium',
                message: `Potential to reduce schedule span by ${compressionOpportunities.potentialDaysReduction} days.`,
                details: `
                    Recommendation: Focus on consolidating classes in date ranges ${compressionOpportunities.dateRanges.map(r => formatDateRange(r)).join(', ')}
                `,
                specificMoves: compressionSuggestions.slice(0, 3),
                action: 'compress'
            });
        }
    }
    
    // Add more suggestion types as needed...
    
    return suggestions;
}

// Add to public API
return {
    // Existing methods...
    
    generateSpecificSuggestions: function(metrics) {
        return generateSpecificSuggestions(metrics);
    }
};
```

#### 4.3 Add Enhanced Optimization UI

```html
<!-- Add to analytics-tab in index.html -->
<div class="optimization-panel" id="optimization-panel" style="display: none;">
    <div class="optimization-header">
        <h3>Schedule Optimization</h3>
        <button id="close-optimization-btn" class="btn-close">&times;</button>
    </div>
    
    <div class="optimization-content">
        <div class="optimization-explanation">
            <p>Below are specific suggestions that may improve your schedule quality.</p>
            <p><strong>Note:</strong> These are suggestions only. You should review each one before applying.</p>
        </div>
        
        <div class="optimization-suggestions" id="specific-suggestions-container">
            <!-- Specific suggestions will be shown here -->
        </div>
    </div>
</div>
```

```javascript
// Add to app.js
function showOptimizationPanel() {
    try {
        // First check if the solver is available
        if (ConstraintSolverWrapper.isAvailable()) {
            // Use the solver for better suggestions
            generateAdvancedSuggestions();
        } else {
            // Try to initialize solver first
            const statusEl = document.getElementById('specific-suggestions-container');
            statusEl.innerHTML = '<div class="loading-indicator">Initializing optimization engine...</div>';
            
            // Show panel with loading state
            document.getElementById('optimization-panel').style.display = 'block';
            
            // Try to initialize solver with timeout
            Promise.race([
                ConstraintSolverWrapper.initialize(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Initialization timed out')), 5000))
            ]).then(() => {
                generateAdvancedSuggestions();
            }).catch(error => {
                console.log('Using basic suggestions due to error:', error);
                generateBasicSuggestions();
            });
        }
    } catch (error) {
        // Fallback to basic suggestions on any error
        console.error('Error initializing optimization panel:', error);
        generateBasicSuggestions();
    }
}

function generateBasicSuggestions() {
    try {
        // Create copies of data
        const scheduleCopy = JSON.parse(JSON.stringify(dataManager.scheduleWeeks));
        const constraintsCopy = JSON.parse(JSON.stringify(dataManager.getConfig()));
        
        // Get current metrics
        const metrics = ScheduleAnalytics.calculateMetrics(scheduleCopy, constraintsCopy);
        
        // Generate suggestions
        const suggestions = ScheduleAnalytics.generateSpecificSuggestions(metrics);
        
        // Display suggestions
        displaySuggestions(suggestions, 'basic');
    } catch (error) {
        console.error('Error generating basic suggestions:', error);
        
        // Show error in the container
        const container = document.getElementById('specific-suggestions-container');
        container.innerHTML = `
            <div class="error-message">
                Unable to generate suggestions due to an error. Try refreshing the page.
            </div>
        `;
    }
}

function generateAdvancedSuggestions() {
    // Similar to basic suggestions but leverages the solver for more sophisticated recommendations
    // This would be implemented in Phase 4
}

function displaySuggestions(suggestions, source) {
    const container = document.getElementById('specific-suggestions-container');
    
    // Clear container
    container.innerHTML = '';
    
    if (suggestions.length === 0) {
        container.innerHTML = `
            <div class="info-message">
                No specific optimization suggestions available. Your schedule appears to be well-optimized!
            </div>
        `;
        return;
    }
    
    // Create suggestions list
    suggestions.forEach((suggestion, index) => {
        const card = document.createElement('div');
        card.className = `suggestion-card suggestion-${suggestion.type} priority-${suggestion.priority}`;
        
        const header = document.createElement('div');
        header.className = 'suggestion-header';
        header.innerHTML = `
            <h4>${suggestion.message}</h4>
            <span class="suggestion-type-badge">${suggestion.type}</span>
        `;
        
        const body = document.createElement('div');
        body.className = 'suggestion-body';
        body.innerHTML = `<p>${suggestion.details}</p>`;
        
        // Add specific moves if available
        if (suggestion.specificMoves && suggestion.specificMoves.length > 0) {
            const movesList = document.createElement('ul');
            movesList.className = 'specific-moves-list';
            
            suggestion.specificMoves.forEach(move => {
                const moveItem = document.createElement('li');
                moveItem.textContent = move.description;
                movesList.appendChild(moveItem);
            });
            
            body.appendChild(movesList);
        }
        
        // Only create real action buttons in Phase 4
        if (source === 'advanced') {
            // Add action buttons for advanced suggestions
            const actions = document.createElement('div');
            actions.className = 'suggestion-actions';
            
            const applyBtn = document.createElement('button');
            applyBtn.className = 'btn btn-small';
            applyBtn.textContent = 'Apply Suggestion';
            applyBtn.setAttribute('data-suggestion-index', index);
            applyBtn.addEventListener('click', handleApplySuggestion);
            
            actions.appendChild(applyBtn);
            body.appendChild(actions);
        }
        
        card.appendChild(header);
        card.appendChild(body);
        container.appendChild(card);
    });
    
    // Show the panel
    document.getElementById('optimization-panel').style.display = 'block';
}

// In Phase 4, you would add this function:
function handleApplySuggestion(e) {
    const index = parseInt(e.target.getAttribute('data-suggestion-index'));
    // Logic to apply the specific suggestion
}
```

## Testing Plan

### 1. Isolated Module Testing

Test each analytics module in isolation:

- **ScheduleAnalytics**: Verify metrics calculations with predictable test data
- **ScheduleVisualizer**: Test visualization rendering with mock data
- **ConstraintSolverWrapper**: Verify solver integration with simple test cases

### 2. Feature-Level Testing

Test each major feature independently:

#### 2.1 Analytics Dashboard
- Verify metrics are calculated correctly
- Test visualization rendering with different schedule types
- Ensure UI updates properly after schedule changes

#### 2.2 Insights Generation
- Verify insights identify appropriate patterns
- Test with edge cases (empty schedule, fully packed schedule)
- Ensure insights update after schedule changes

#### 2.3 What-If Analysis
- Test constraint adjustments simulation
- Verify invalid placement detection is accurate
- Test error handling when solver fails or times out

### 3. Performance Testing

- Test with large schedules (33+ classes across multiple weeks)
- Measure page load impact of analytics features
- Test solver initialization and execution times
- Ensure analytics calculations don't block UI responsiveness

### 4. Safety Testing

- Verify analytics features don't modify original schedule data
- Test error containment (errors in analytics don't affect core app)
- Verify lazy loading prevents unnecessary resource usage
- Test fallback mechanisms when advanced features fail

## User Experience Considerations

### 1. Progressive Exposure

- Start with basic analytics visible to all users
- Provide clear opt-in for advanced features
- Use tooltips to explain metrics and visualizations
- Add contextual help for interpreting analytics results

### 2. Performance Awareness

- Show loading indicators for computationally intensive operations
- Add timeout protection for all operations
- Provide feedback about resource usage for advanced features
- Allow cancellation of long-running operations

### 3. User Control

- Make all advanced features explicitly opt-in
- Provide previews before applying any suggestions
- Add undo capability for any applied changes
- Maintain manual scheduling as the primary interaction mode

## Implementation Timeline

1. **Weeks 1-2**: Phase 1 - Read-Only Analytics Dashboard
   - Basic metrics calculation
   - Simple visualizations
   - Analytics tab integration

2. **Weeks 3**: Phase 2 - Basic Insights and Suggestions
   - Insight generation
   - General suggestions
   - Enhanced visualizations

3. **Weeks 4-5**: Phase 3 - What-If Analysis
   - Library integration
   - Constraint simulation
   - What-if UI implementation

4. **Weeks 6-7**: Phase 4 - Enhanced Visualizations and Optimization
   - Advanced visualizations
   - Specific optimization suggestions
   - Optional suggestion application

## Conclusion

This implementation plan provides a safe, phased approach to adding constraint analytics to the Cooking Class Scheduler. By starting with isolated, read-only features and gradually introducing more advanced capabilities, we can add valuable analytics without risking the core scheduling functionality.

The tiered approach ensures that:

1. Each phase provides value on its own
2. Advanced features degrade gracefully when unavailable
3. Users maintain full control over their schedules
4. Performance and resource usage are carefully managed

This balanced approach provides users with powerful insights to optimize their schedules while maintaining the reliability and simplicity of the current scheduling system.
