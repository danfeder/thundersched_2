// Assuming UIManager, DataManager are passed in
// Assuming ScheduleAnalytics object/module is available (e.g., via import)
import ScheduleAnalytics from './analytics.js'; // Assuming analytics.js exports the necessary object/class

class AnalyticsController {
    constructor(dataManager, uiManager) {
        this.dataManager = dataManager;
        this.uiManager = uiManager;
        console.log("AnalyticsController initialized");
    }

    // Method to show the analytics modal and initialize its view
    showAnalyticsModal() {
        const modal = document.getElementById('analytics-modal');
        if (!modal) {
             console.error("Analytics modal element not found!");
             return;
        }
        
        // Show the modal (UIManager might handle this later)
        modal.style.display = 'block'; 
        
        // Initialize the analytics view
        this.updateAnalyticsView();
        
        // Remove previous listeners before adding new ones to prevent duplicates
        const viewSelector = document.getElementById('analytics-view-selector');
        const suggestionsBtn = document.getElementById('generate-suggestions-btn');
        const whatIfBtn = document.getElementById('show-what-if-btn'); // Assuming WhatIfController handles this

        if (viewSelector) {
             // Clone and replace to remove old listeners
             const newSelector = viewSelector.cloneNode(true);
             viewSelector.parentNode.replaceChild(newSelector, viewSelector);
             newSelector.addEventListener('change', () => this.updateAnalyticsView());
        }
        
        if (suggestionsBtn) {
             // Clone and replace to remove old listeners
             const newSuggestionsBtn = suggestionsBtn.cloneNode(true);
             suggestionsBtn.parentNode.replaceChild(newSuggestionsBtn, suggestionsBtn);
             newSuggestionsBtn.addEventListener('click', () => this.generateAndDisplaySuggestions());
        }

        // What-If button listener should be handled by WhatIfController or EventHandlerService routing
        // if (whatIfBtn) {
        //     // Clone and replace? Or assume other controller handles it.
        // }
    }

    // Method to generate and display optimization suggestions
    generateAndDisplaySuggestions() {
        const container = document.getElementById('suggestions-container');
        if (!container) return;
        
        try {
            // Show a loading message
            container.innerHTML = '<p class="loading-indicator">Analyzing schedule...</p>';
            
            // Create copies of data to prevent accidental modification
            const scheduleCopy = JSON.parse(JSON.stringify(this.dataManager.scheduleWeeks));
            const constraintsCopy = JSON.parse(JSON.stringify(this.dataManager.getConfig()));
            
            // Get current metrics using ScheduleAnalytics
            const metrics = ScheduleAnalytics.calculateMetrics(scheduleCopy, constraintsCopy);
            
            // Generate suggestions using ScheduleAnalytics
            const suggestions = ScheduleAnalytics.generateSuggestions(metrics);
            
            // Clear container
            container.innerHTML = '';
            
            if (suggestions.length === 0) {
                container.innerHTML = `
                    <div class="info-message">
                        <p><strong>No optimization suggestions available.</strong></p>
                        <p>Your schedule appears to be well-optimized! If you'd like to see suggestions, try:</p>
                        <ul>
                            <li>Adding more classes to your schedule</li>
                            <li>Creating some underutilized days (days with fewer classes)</li>
                            <li>Using specific periods more heavily than others</li>
                        </ul>
                    </div>`;
                return;
            }
            
            // Add a header with suggestion count
            const header = document.createElement('div');
            header.className = 'suggestions-header';
            header.innerHTML = `<p>Found <strong>${suggestions.length} potential optimizations</strong> for your schedule:</p>`;
            container.appendChild(header);
            
            // Create suggestions list
            const list = document.createElement('div');
            list.className = 'suggestions-list';
            
            // Add icon mapping for suggestion types
            const typeIcons = {
                'balance': '⚖️',
                'compression': '📏',
                'utilization': '📊',
                'weekly': '📅',
                'quality': '🌟'
            };
            
            suggestions.forEach(suggestion => {
                const item = document.createElement('div');
                item.className = `suggestion-item suggestion-${suggestion.type}`;
                
                const icon = typeIcons[suggestion.type] || '';
                
                const title = document.createElement('h4');
                title.innerHTML = `${icon} ${suggestion.message}`;
                
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
            container.innerHTML = '<p>Unable to generate suggestions at this time.</p>';
        }
    }

    // Method to update the entire analytics view based on current data and selected visualization
    updateAnalyticsView() {
        try {
            // Create COPIES of data to prevent accidental modification
            const scheduleCopy = JSON.parse(JSON.stringify(this.dataManager.scheduleWeeks));
            const constraintsCopy = JSON.parse(JSON.stringify(this.dataManager.getConfig()));
            
            // Calculate metrics using ScheduleAnalytics
            const metrics = ScheduleAnalytics.calculateMetrics(scheduleCopy, constraintsCopy);
            
            // Update UI with metrics
            this.updateMetricsDisplay(metrics);
            
            // Update visualization based on currently selected view
            this.updateVisualization(metrics);
            
            // Update insights using ScheduleAnalytics
            this.updateInsights(metrics);
        } catch (error) {
            console.error('Error updating analytics (safely contained):', error);
            
            // Show fallback content if there's an error
            document.getElementById('metric-span').textContent = 'Unavailable';
            document.getElementById('metric-balance').textContent = 'Unavailable';
            document.getElementById('metric-quality').textContent = 'Unavailable';
            document.getElementById('analytics-insights-content').innerHTML = '<p>Unable to generate analytics at this time. Please try again.</p>';
            document.getElementById('analytics-visualization').innerHTML = '<div class="error-message">Visualization unavailable</div>';
        }
    }

    // Method to update the top-level metric displays
    updateMetricsDisplay(metrics) {
        const spanEl = document.getElementById('metric-span');
        const balanceEl = document.getElementById('metric-balance');
        const balanceGauge = document.getElementById('balance-gauge')?.querySelector('.gauge-fill');
        const qualityEl = document.getElementById('metric-quality');
        const qualityGauge = document.getElementById('quality-gauge')?.querySelector('.gauge-fill');

        if (spanEl) spanEl.textContent = metrics.scheduleSpan + ' days';
        
        // Calculate and display average balance score
        let totalScore = 0;
        let dayCount = 0;
        Object.values(metrics.dailyBalance || {}).forEach(dayData => {
            totalScore += dayData.score;
            dayCount++;
        });
        const avgBalance = dayCount > 0 ? Math.round(totalScore / dayCount) : 0;
        
        if(balanceEl) balanceEl.textContent = avgBalance + '%';
        if(balanceGauge) balanceGauge.style.width = avgBalance + '%';
        
        // Update overall quality
        if(qualityEl) qualityEl.textContent = metrics.overallQuality + '%';
        if(qualityGauge) qualityGauge.style.width = metrics.overallQuality + '%';
    }

    // Method to update the visualization area based on the selected view type
    updateVisualization(metrics) {
        const container = document.getElementById('analytics-visualization');
        const viewType = document.getElementById('analytics-view-selector')?.value;
        if (!container) return;

        // Clear container
        container.innerHTML = '';
        
        try {
            switch (viewType) {
                case 'heatmap':
                    this.renderHeatmapVisualization(container, metrics);
                    break;
                case 'periods':
                    this.renderPeriodUtilizationVisualization(container, metrics);
                    break;
                case 'constraints':
                    this.renderConstraintVisualization(container, metrics);
                    break;
                default:
                    console.warn(`Unknown visualization type: ${viewType}. Defaulting to heatmap.`);
                    this.renderHeatmapVisualization(container, metrics); // Default view
            }
        } catch (error) {
            console.error('Visualization error (safely contained):', error);
            container.innerHTML = '<div class="error-message">Visualization unavailable</div>';
        }
    }

    // --- Visualization Rendering Methods ---

    renderHeatmapVisualization(container, metrics) {
        // Get all dates that have balance data
        const dates = Object.keys(metrics.dailyBalance || {}).sort();
        
        if (dates.length === 0) {
            container.innerHTML = '<div class="info-message">No scheduled classes to visualize.</div>';
            return;
        }
        
        const heatmapContainer = document.createElement('div');
        heatmapContainer.className = 'heatmap-container';
        heatmapContainer.appendChild(this.uiManager.createElementWithClass('div', 'heatmap-header', '')); // Top-left empty
        
        // Date headers
        dates.forEach(dateStr => {
            const date = new Date(dateStr);
            const options = { weekday: 'short', month: 'short', day: 'numeric' };
            const formattedDate = date.toLocaleDateString(undefined, options);
            const header = this.uiManager.createElementWithClass('div', 'heatmap-header', formattedDate);
            heatmapContainer.appendChild(header);
        });
        
        // Period rows
        for (let period = 1; period <= 8; period++) {
            heatmapContainer.appendChild(this.uiManager.createElementWithClass('div', 'heatmap-period', `P${period}`)); // Period label
            
            dates.forEach(dateStr => {
                const weekOffset = this.findWeekOffsetForDate(dateStr); // Use utility method
                let className = '';
                let cellClass = 'heatmap-cell empty';
                
                if (weekOffset !== null && 
                    this.dataManager.scheduleWeeks[weekOffset]?.[dateStr]?.[period]) {
                    
                    className = this.dataManager.scheduleWeeks[weekOffset][dateStr][period];
                    const dayStatus = metrics.dailyBalance[dateStr]?.status || 'balanced';
                    cellClass = `heatmap-cell ${dayStatus}`;
                }
                
                const cell = this.uiManager.createElementWithClass('div', cellClass, className);
                heatmapContainer.appendChild(cell);
            });
        }
        
        container.appendChild(heatmapContainer);
    }

    renderPeriodUtilizationVisualization(container, metrics) {
        const periodData = metrics.periodUtilization || {};
        const chartContainer = document.createElement('div');
        chartContainer.className = 'period-chart-container';
        
        const title = document.createElement('h3');
        title.textContent = 'Period Utilization';
        chartContainer.appendChild(title);
        
        const chart = document.createElement('div');
        chart.className = 'period-chart';
        
        for (let period = 1; period <= 8; period++) {
            const data = periodData[period] || { percentage: 0, count: 0 }; // Default if period missing
            const barContainer = this.uiManager.createElementWithClass('div', 'period-bar-container');
            const label = this.uiManager.createElementWithClass('div', 'period-label', `Period ${period}`);
            const bar = this.uiManager.createElementWithClass('div', 'period-bar');
            const fill = this.uiManager.createElementWithClass('div', 'period-bar-fill');
            fill.style.width = `${data.percentage}%`;
            const value = this.uiManager.createElementWithClass('div', 'period-value', `${Math.round(data.percentage)}% (${data.count})`);
            
            bar.appendChild(fill);
            barContainer.appendChild(label);
            barContainer.appendChild(bar);
            barContainer.appendChild(value);
            chart.appendChild(barContainer);
        }
        
        chartContainer.appendChild(chart);
        container.appendChild(chartContainer);
    }

    renderConstraintVisualization(container, metrics) {
        const constraintData = metrics.constraintPressure || { daily: {}, weekly: {} };
        const constraintContainer = document.createElement('div');
        constraintContainer.className = 'constraint-chart-container';
        
        const title = document.createElement('h3');
        title.textContent = 'Constraint Pressure';
        constraintContainer.appendChild(title);
        
        // Daily section
        const dailySection = this.uiManager.createElementWithClass('div', 'constraint-section');
        const dailyTitle = document.createElement('h4');
        dailyTitle.textContent = 'Daily Class Load';
        dailySection.appendChild(dailyTitle);
        const dailyChart = this.uiManager.createElementWithClass('div', 'daily-constraint-chart');
        const dailyDates = Object.keys(constraintData.daily).sort();
        
        dailyDates.forEach(dateStr => {
            const data = constraintData.daily[dateStr];
            const date = new Date(dateStr);
            const dayName = date.toLocaleDateString(undefined, { weekday: 'short' });
            const barContainer = this.uiManager.createElementWithClass('div', 'constraint-bar-container');
            const label = this.uiManager.createElementWithClass('div', 'constraint-label', `${dayName} ${date.getDate()}`);
            const bar = this.uiManager.createElementWithClass('div', 'constraint-bar');
            const fill = this.uiManager.createElementWithClass('div', 'constraint-bar-fill');
            fill.style.width = `${data.pressure}%`;
            fill.style.backgroundColor = data.pressure < 70 ? '#81c784' : data.pressure < 90 ? '#ffd54f' : '#e57373';
            const value = this.uiManager.createElementWithClass('div', 'constraint-value', `${data.count}/${data.limit}`);
            
            bar.appendChild(fill);
            barContainer.appendChild(label);
            barContainer.appendChild(bar);
            barContainer.appendChild(value);
            dailyChart.appendChild(barContainer);
        });
        dailySection.appendChild(dailyChart);
        constraintContainer.appendChild(dailySection);
        
        // Weekly section
        const weeklySection = this.uiManager.createElementWithClass('div', 'constraint-section');
        const weeklyTitle = document.createElement('h4');
        weeklyTitle.textContent = 'Weekly Class Load';
        weeklySection.appendChild(weeklyTitle);
        const weeklyChart = this.uiManager.createElementWithClass('div', 'weekly-constraint-chart');
        const weeklyOffsets = Object.keys(constraintData.weekly).sort();
        
        weeklyOffsets.forEach(offset => {
            const data = constraintData.weekly[offset];
            const barContainer = this.uiManager.createElementWithClass('div', 'constraint-bar-container');
            const label = this.uiManager.createElementWithClass('div', 'constraint-label', `Week ${parseInt(offset) + 1}`);
            const bar = this.uiManager.createElementWithClass('div', 'constraint-bar');
            const fill = this.uiManager.createElementWithClass('div', 'constraint-bar-fill');
            fill.style.width = `${data.pressure}%`;
            fill.style.backgroundColor = data.count < data.minLimit ? '#64b5f6' : data.pressure < 70 ? '#81c784' : data.pressure < 90 ? '#ffd54f' : '#e57373';
            const value = this.uiManager.createElementWithClass('div', 'constraint-value', `${data.count} (${data.minLimit}-${data.maxLimit})`);
            
            bar.appendChild(fill);
            barContainer.appendChild(label);
            barContainer.appendChild(bar);
            barContainer.appendChild(value);
            weeklyChart.appendChild(barContainer);
        });
        weeklySection.appendChild(weeklyChart);
        constraintContainer.appendChild(weeklySection);
        
        container.appendChild(constraintContainer);
    }

    // Method to update the insights section
    updateInsights(metrics) {
        const container = document.getElementById('analytics-insights-content');
        if (!container) return;
        
        try {
            // Generate insights using ScheduleAnalytics
            const insights = ScheduleAnalytics.generateInsights(metrics);
            
            container.innerHTML = ''; // Clear container
            
            if (insights.length === 0) {
                container.innerHTML = '<p>No analytics insights available for this schedule.</p>';
                return;
            }
            
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

    // --- Utility Methods ---

    // Utility to find week offset for a date (used by heatmap)
    findWeekOffsetForDate(dateStr) {
        // Find which week offset contains this date
        for (const weekOffset in this.dataManager.scheduleWeeks) {
            if (this.dataManager.scheduleWeeks[weekOffset]?.[dateStr]) { // Safer access
                return weekOffset;
            }
        }
        return null;
    }
}

export default AnalyticsController;