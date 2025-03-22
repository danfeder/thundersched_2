/**
 * ScheduleVisualizer - Canvas-based visualization module for schedule analytics
 * Provides enhanced visualizations for schedule data
 */
const ScheduleVisualizer = (function() {
    // Private state
    let _canvas = null;
    let _ctx = null;
    let _width = 0;
    let _height = 0;
    let _data = null;
    let _scheduleData = null;
    
    // Helper functions
    function formatShortDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString(undefined, {
            month: 'short', 
            day: 'numeric'
        });
    }
    
    function getColorForScore(score) {
        if (score < 50) {
            // Red to yellow gradient
            const r = 255;
            const g = Math.floor((score / 50) * 255);
            return `rgb(${r}, ${g}, 100)`;
        } else {
            // Yellow to green gradient
            const r = Math.floor(255 - ((score - 50) / 50) * 255);
            const g = 255;
            return `rgb(${r}, ${g}, 100)`;
        }
    }
    
    function getStatusColor(status) {
        switch(status) {
            case 'underutilized': return '#ffebee'; // Light red
            case 'balanced': return '#e8f5e9';      // Light green
            case 'optimal': return '#a5d6a7';       // Medium green
            case 'nearCapacity': return '#fff8e1';  // Light yellow
            default: return '#f5f5f5';              // Light gray
        }
    }
    
    function getScheduledClass(dateStr, period) {
        if (!_scheduleData) return null;
        
        console.log(`Looking for class on ${dateStr}, period ${period}`);
        
        // Find the class scheduled on this date and period
        for (const weekOffset in _scheduleData) {
            // First check if this week contains the date we're looking for
            if (_scheduleData[weekOffset]) {
                // Check if this exact date exists in the schedule
                if (_scheduleData[weekOffset][dateStr] && 
                    _scheduleData[weekOffset][dateStr][period]) {
                    console.log(`Found class at exact date: ${_scheduleData[weekOffset][dateStr][period]}`);
                    return _scheduleData[weekOffset][dateStr][period];
                }
            }
        }
        return null;
    }
    
    // Private methods
    function initializeCanvas(container) {
        console.log('Initializing canvas in container:', container);
        
        // Always create a new canvas to avoid issues with reuse
        if (_canvas && _canvas.parentNode) {
            _canvas.parentNode.removeChild(_canvas);
        }
        
        _canvas = document.createElement('canvas');
        _canvas.style.width = '100%';
        _canvas.style.height = '100%';
        container.appendChild(_canvas);
        _ctx = _canvas.getContext('2d');
        
        console.log('Canvas created:', _canvas);
        console.log('Container dimensions:', container.clientWidth, 'x', container.clientHeight);
        
        // Set canvas size to match container
        _width = container.clientWidth || 800; // Fallback width if container has no width
        _height = container.clientHeight || 400; // Fallback height
        _canvas.width = _width;
        _canvas.height = _height;
        
        console.log('Canvas dimensions set to:', _width, 'x', _height);
        
        // Draw a test pattern to verify canvas is working
        _ctx.fillStyle = '#f0f0f0';
        _ctx.fillRect(0, 0, _width, _height);
        _ctx.fillStyle = '#333';
        _ctx.font = '14px Arial';
        _ctx.textAlign = 'center';
        _ctx.fillText('Canvas initialized', _width/2, _height/2);
    }
    
    function renderHeatMapVisualization(metrics) {
        if (!_ctx || !metrics) return;
        
        // Clear canvas
        _ctx.clearRect(0, 0, _width, _height);
        
        console.log('Rendering heat map visualization with metrics:', metrics);
        
        // Get all dates from metrics
        const dates = Object.keys(metrics.dailyBalance).sort();
        if (dates.length === 0) {
            renderNoDataMessage("No schedule data available for visualization");
            return;
        }
        
        console.log('Dates to display:', dates);
        
        // Calculate grid dimensions
        const cellWidth = Math.min(100, _width / (dates.length + 1));
        const cellHeight = Math.min(40, (_height - 40) / 9); // 8 periods + header
        const headerHeight = 40;
        
        // Draw title
        _ctx.fillStyle = '#333';
        _ctx.font = 'bold 14px Arial';
        _ctx.textAlign = 'center';
        _ctx.fillText('Class Distribution Heatmap', _width / 2, 20);
        
        // Draw headers
        _ctx.fillStyle = '#555';
        _ctx.font = '12px Arial';
        _ctx.textAlign = 'center';
        
        // Draw period labels (vertical)
        _ctx.textAlign = 'right';
        _ctx.fillStyle = '#666';
        _ctx.fillText('Period', cellWidth / 2, headerHeight + cellHeight / 2);
        
        for (let period = 1; period <= 8; period++) {
            _ctx.fillText(
                `P${period}`, 
                cellWidth / 2, 
                headerHeight + period * cellHeight + cellHeight / 2
            );
        }
        
        // Draw date headers with weekday names to help identify issues
        _ctx.textAlign = 'center';
        dates.forEach((dateStr, index) => {
            const date = new Date(dateStr);
            const dateFormat = date.toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short', 
                day: 'numeric'
            });
            
            const x = cellWidth * (index + 1) + cellWidth / 2;
            _ctx.fillText(dateFormat, x, headerHeight - 10);
        });
        
        console.log('Drawing cells for dates:', dates);
        
        // Draw grid and fill cells
        dates.forEach((dateStr, dateIndex) => {
            const dayData = metrics.dailyBalance[dateStr];
            
            for (let period = 1; period <= 8; period++) {
                const x = cellWidth * (dateIndex + 1);
                const y = headerHeight + period * cellHeight;
                
                // Get class for this date/period using exact date match
                const className = getScheduledClass(dateStr, period);
                console.log(`Cell (${dateStr}, ${period}): className=${className}`);
                
                // Draw cell outline
                _ctx.strokeStyle = '#ddd';
                _ctx.lineWidth = 1;
                _ctx.strokeRect(x, y, cellWidth, cellHeight);
                
                // Fill color based on whether there's a class and the day's balance score
                if (className) {
                    _ctx.fillStyle = getStatusColor(dayData.status);
                    _ctx.fillRect(x, y, cellWidth, cellHeight);
                    
                    // Add class text
                    _ctx.fillStyle = '#333';
                    _ctx.font = '10px Arial';
                    _ctx.textAlign = 'center';
                    _ctx.fillText(
                        className, 
                        x + cellWidth / 2, 
                        y + cellHeight / 2 + 4
                    );
                } else {
                    // Empty cell
                    _ctx.fillStyle = '#f8f8f8';
                    _ctx.fillRect(x, y, cellWidth, cellHeight);
                }
            }
            
            // Draw day total
            _ctx.fillStyle = '#333';
            _ctx.font = 'bold 11px Arial';
            _ctx.textAlign = 'center';
            _ctx.fillText(
                `${dayData.classCount}/${dayData.idealLoad.toFixed(1)}`, 
                cellWidth * (dateIndex + 1) + cellWidth / 2, 
                headerHeight + 9 * cellHeight + 15
            );
        });
        
        // Draw color legend
        drawHeatmapLegend(_width - 180, 10, 170, 25);
    }
    
    function drawHeatmapLegend(x, y, width, height) {
        const statuses = ['underutilized', 'balanced', 'optimal', 'nearCapacity'];
        const labels = ['Underutilized', 'Balanced', 'Optimal', 'Near Capacity'];
        const boxWidth = width / statuses.length;
        
        // Draw legend title
        _ctx.fillStyle = '#666';
        _ctx.font = '10px Arial';
        _ctx.textAlign = 'left';
        _ctx.fillText('Legend:', x, y);
        
        // Draw color boxes with labels
        statuses.forEach((status, i) => {
            const boxX = x + i * boxWidth;
            
            // Color box
            _ctx.fillStyle = getStatusColor(status);
            _ctx.fillRect(boxX, y + 5, boxWidth - 5, height - 10);
            _ctx.strokeStyle = '#ccc';
            _ctx.strokeRect(boxX, y + 5, boxWidth - 5, height - 10);
            
            // Label
            _ctx.fillStyle = '#333';
            _ctx.font = '8px Arial';
            _ctx.textAlign = 'center';
            _ctx.fillText(labels[i], boxX + boxWidth/2 - 2, y + height + 5);
        });
    }
    
    function renderPeriodUtilizationVisualization(metrics) {
        if (!_ctx || !metrics) return;
        
        // Clear canvas
        _ctx.clearRect(0, 0, _width, _height);
        
        // Check for data
        if (!metrics.periodUtilization || Object.keys(metrics.periodUtilization).length === 0) {
            renderNoDataMessage("No period utilization data available");
            return;
        }
        
        // Draw title
        _ctx.fillStyle = '#333';
        _ctx.font = 'bold 14px Arial';
        _ctx.textAlign = 'center';
        _ctx.fillText('Period Utilization Analysis', _width / 2, 20);
        
        const periodData = metrics.periodUtilization;
        const barHeight = 30;
        const barWidth = _width * 0.6;
        const startX = _width * 0.2;
        const startY = 50;
        const gap = 10;
        
        // Find max percentage for scaling
        let maxPercentage = 0;
        Object.values(periodData).forEach(data => {
            maxPercentage = Math.max(maxPercentage, data.percentage);
        });
        
        // Ensure a minimum scale for better visualization
        maxPercentage = Math.max(maxPercentage, 50);
        
        // Draw each period bar
        let y = startY;
        for (let period = 1; period <= 8; period++) {
            const data = periodData[period];
            const percentage = data ? data.percentage : 0;
            const count = data ? data.count : 0;
            
            // Period label
            _ctx.fillStyle = '#333';
            _ctx.font = 'bold 12px Arial';
            _ctx.textAlign = 'right';
            _ctx.fillText(`Period ${period}:`, startX - 10, y + barHeight/2 + 4);
            
            // Bar background
            _ctx.fillStyle = '#eee';
            _ctx.fillRect(startX, y, barWidth, barHeight);
            
            // Bar fill based on utilization
            const fillWidth = (percentage / maxPercentage) * barWidth;
            _ctx.fillStyle = `hsl(${Math.min(120, percentage * 1.2)}, 70%, 60%)`;
            _ctx.fillRect(startX, y, fillWidth, barHeight);
            
            // Percentage and count text
            _ctx.fillStyle = '#333';
            _ctx.font = '12px Arial';
            _ctx.textAlign = 'left';
            _ctx.fillText(`${percentage.toFixed(1)}% (${count} classes)`, startX + fillWidth + 10, y + barHeight/2 + 4);
            
            y += barHeight + gap;
        }
        
        // Draw interpretation
        const interpretationY = y + 20;
        _ctx.fillStyle = '#333';
        _ctx.font = 'bold 12px Arial';
        _ctx.textAlign = 'left';
        _ctx.fillText('Interpretation:', startX, interpretationY);
        
        _ctx.font = '12px Arial';
        _ctx.fillText('• Even distribution across periods indicates balanced scheduling', startX, interpretationY + 20);
        _ctx.fillText('• Low utilization in specific periods suggests potential scheduling opportunities', startX, interpretationY + 40);
        _ctx.fillText('• High variation between periods may indicate time preferences or constraints', startX, interpretationY + 60);
    }
    
    function renderConstraintPressureVisualization(metrics) {
        if (!_ctx || !metrics) return;
        
        // Clear canvas
        _ctx.clearRect(0, 0, _width, _height);
        
        // Check for data
        if (!metrics.constraintPressure) {
            renderNoDataMessage("No constraint pressure data available");
            return;
        }
        
        // Draw title
        _ctx.fillStyle = '#333';
        _ctx.font = 'bold 14px Arial';
        _ctx.textAlign = 'center';
        _ctx.fillText('Constraint Pressure Analysis', _width / 2, 20);
        
        // Get constraint data
        const { consecutive, daily, weekly } = metrics.constraintPressure;
        
        // Set visualization layout
        const startY = 50;
        let y = startY;
        
        // Draw consecutives constraint section
        y = drawConstraintSection(
            "Consecutive Classes", 
            consecutive, 
            y, 
            (data) => `${data.max}/${data.limit} consecutive`
        );
        
        // Draw daily constraint section
        y = drawConstraintSection(
            "Daily Class Limits", 
            daily, 
            y + 30, 
            (data) => `${data.count}/${data.limit} classes`
        );
        
        // Draw weekly constraint section
        if (Object.keys(weekly).length > 0) {
            _ctx.fillStyle = '#333';
            _ctx.font = 'bold 13px Arial';
            _ctx.textAlign = 'left';
            _ctx.fillText("Weekly Class Targets", 50, y + 20);
            
            const barWidth = _width - 100;
            y += 30;
            
            Object.entries(weekly).forEach(([weekOffset, data], index) => {
                const weekNum = parseInt(weekOffset) + 1;
                
                // Week label
                _ctx.fillStyle = '#333';
                _ctx.font = '12px Arial';
                _ctx.textAlign = 'right';
                _ctx.fillText(`Week ${weekNum}:`, 120, y + 15);
                
                // Draw range bar background
                _ctx.fillStyle = '#eee';
                _ctx.fillRect(130, y, barWidth, 30);
                
                // Draw min-max range indicator
                const minPos = (data.minLimit / data.maxLimit) * barWidth;
                _ctx.fillStyle = '#e0e0e0';
                _ctx.fillRect(130, y, minPos, 30);
                
                // Draw current position
                const currentPos = (data.count / data.maxLimit) * barWidth;
                _ctx.fillStyle = data.count < data.minLimit ? '#ff9800' : 
                                 data.count > data.maxLimit ? '#f44336' : '#4caf50';
                _ctx.fillRect(130, y, currentPos, 30);
                
                // Draw min line
                _ctx.strokeStyle = '#2196f3';
                _ctx.lineWidth = 2;
                _ctx.beginPath();
                _ctx.moveTo(130 + minPos, y);
                _ctx.lineTo(130 + minPos, y + 30);
                _ctx.stroke();
                
                // Add text labels
                _ctx.fillStyle = '#333';
                _ctx.textAlign = 'left';
                _ctx.fillText(`${data.count} classes (${data.minLimit}-${data.maxLimit} target)`, 140 + currentPos, y + 20);
                
                y += 40;
            });
        }
        
        // Draw interpretation
        const interpretationY = Math.min(y + 30, _height - 100);
        _ctx.fillStyle = '#333';
        _ctx.font = 'bold 12px Arial';
        _ctx.textAlign = 'left';
        _ctx.fillText('Interpretation:', 50, interpretationY);
        
        _ctx.font = '12px Arial';
        _ctx.fillText('• Green bars indicate constraints are being utilized optimally', 50, interpretationY + 20);
        _ctx.fillText('• Yellow/orange indicates approaching limits', 50, interpretationY + 40);
        _ctx.fillText('• Red indicates constraints at or exceeding limits', 50, interpretationY + 60);
    }
    
    function drawConstraintSection(title, constraintData, startY, labelFormatter) {
        if (!constraintData || Object.keys(constraintData).length === 0) {
            return startY;
        }
        
        // Section title
        _ctx.fillStyle = '#333';
        _ctx.font = 'bold 13px Arial';
        _ctx.textAlign = 'left';
        _ctx.fillText(title, 50, startY);
        
        const dates = Object.keys(constraintData).sort();
        const barWidth = Math.min(50, (_width - 100) / dates.length);
        const barMaxHeight = 100;
        const barGap = 5;
        
        // Draw bars
        dates.forEach((dateStr, index) => {
            const data = constraintData[dateStr];
            const x = 50 + index * (barWidth + barGap);
            
            // Skip if invalid data
            if (!data || data.limit === 0) return;
            
            // Calculate height based on pressure
            const pressure = data.pressure;
            const barHeight = (pressure / 100) * barMaxHeight;
            
            // Bar color based on pressure level
            let barColor;
            if (pressure < 50) barColor = '#4caf50'; // Green
            else if (pressure < 80) barColor = '#ffeb3b'; // Yellow
            else if (pressure < 100) barColor = '#ff9800'; // Orange
            else barColor = '#f44336'; // Red
            
            // Draw bar background
            _ctx.fillStyle = '#eee';
            _ctx.fillRect(x, startY + 20, barWidth, barMaxHeight);
            
            // Draw bar
            _ctx.fillStyle = barColor;
            _ctx.fillRect(x, startY + 20 + (barMaxHeight - barHeight), barWidth, barHeight);
            
            // Date label
            _ctx.fillStyle = '#666';
            _ctx.font = '9px Arial';
            _ctx.textAlign = 'center';
            _ctx.fillText(formatShortDate(dateStr), x + barWidth/2, startY + 20 + barMaxHeight + 12);
            
            // Pressure label on hover (simulated with value display)
            _ctx.fillStyle = '#333';
            _ctx.font = '8px Arial';
            _ctx.textAlign = 'center';
            const label = labelFormatter(data);
            _ctx.fillText(label, x + barWidth/2, startY + 15 + (barMaxHeight - barHeight) - 5);
        });
        
        return startY + barMaxHeight + 40;
    }
    
    function renderNoDataMessage(message) {
        _ctx.fillStyle = '#666';
        _ctx.font = '14px Arial';
        _ctx.textAlign = 'center';
        _ctx.fillText(message, _width / 2, _height / 2);
        
        _ctx.fillStyle = '#999';
        _ctx.font = '12px Arial';
        _ctx.fillText('Add classes to the schedule to see visualizations', _width / 2, _height / 2 + 30);
    }
    
    function renderCompressionVisualization(metrics) {
        if (!_ctx || !metrics) return;
        
        // Clear canvas
        _ctx.clearRect(0, 0, _width, _height);
        
        // Title
        _ctx.fillStyle = '#333';
        _ctx.font = 'bold 14px Arial';
        _ctx.textAlign = 'center';
        _ctx.fillText('Schedule Compression Opportunities', _width / 2, 30);
        
        // Check if we have compression opportunities
        let compressionOps;
        
        if (metrics.compressionOpportunities) {
            compressionOps = metrics.compressionOpportunities;
        } else if (typeof ScheduleAnalytics !== 'undefined' && 
                  typeof ScheduleAnalytics.identifyCompressionOpportunities === 'function') {
            compressionOps = ScheduleAnalytics.identifyCompressionOpportunities(metrics);
        } else {
            // Fallback with empty data
            compressionOps = { potentialDaysReduction: 0, dateRanges: [] };
        }
        
        if (!compressionOps || compressionOps.potentialDaysReduction === 0) {
            _ctx.fillStyle = '#666';
            _ctx.font = '12px Arial';
            _ctx.textAlign = 'center';
            _ctx.fillText('No significant compression opportunities identified', _width / 2, _height / 2);
            return;
        }
        
        // Overview text
        _ctx.fillStyle = '#333';
        _ctx.font = '12px Arial';
        _ctx.textAlign = 'center';
        _ctx.fillText(
            `Potential to reduce schedule span by approximately ${compressionOps.potentialDaysReduction} days`,
            _width / 2, 60
        );
        
        // Draw date range diagram
        const startY = 90;
        const allDates = Object.keys(metrics.dailyBalance).sort();
        if (allDates.length === 0) return;
        
        // Calculate date range
        const firstDate = new Date(allDates[0]);
        const lastDate = new Date(allDates[allDates.length - 1]);
        const totalDays = Math.round((lastDate - firstDate) / (1000 * 60 * 60 * 24)) + 1;
        
        // Timeline dimensions
        const timelineY = startY + 50;
        const timelineHeight = 40;
        const leftMargin = 50;
        const rightMargin = 50;
        const timelineWidth = _width - leftMargin - rightMargin;
        
        // Draw overall timeline
        _ctx.fillStyle = '#eee';
        _ctx.fillRect(leftMargin, timelineY, timelineWidth, timelineHeight);
        
        // Draw date labels
        _ctx.fillStyle = '#333';
        _ctx.font = '10px Arial';
        _ctx.textAlign = 'center';
        _ctx.fillText(formatShortDate(allDates[0]), leftMargin, timelineY - 10);
        _ctx.fillText(formatShortDate(allDates[allDates.length - 1]), leftMargin + timelineWidth, timelineY - 10);
        
        // Map dates to timeline positions
        const datePositions = {};
        allDates.forEach(dateStr => {
            const date = new Date(dateStr);
            const dayOffset = Math.round((date - firstDate) / (1000 * 60 * 60 * 24));
            const position = leftMargin + (dayOffset / totalDays) * timelineWidth;
            datePositions[dateStr] = position;
        });
        
        // Draw day markers
        allDates.forEach(dateStr => {
            const x = datePositions[dateStr];
            const dayData = metrics.dailyBalance[dateStr];
            
            let fillColor;
            if (dayData.status === 'underutilized') {
                fillColor = '#ffcdd2'; // Light red
            } else if (dayData.status === 'balanced') {
                fillColor = '#c8e6c9'; // Light green
            } else if (dayData.status === 'optimal') {
                fillColor = '#81c784'; // Medium green
            } else if (dayData.status === 'nearCapacity') {
                fillColor = '#fff59d'; // Light yellow
            } else {
                fillColor = '#e0e0e0'; // Light gray
            }
            
            // Draw day marker
            _ctx.fillStyle = fillColor;
            _ctx.fillRect(x - 5, timelineY, 10, timelineHeight);
            
            // Add class count
            _ctx.fillStyle = '#333';
            _ctx.font = '9px Arial';
            _ctx.textAlign = 'center';
            _ctx.fillText(dayData.classCount.toString(), x, timelineY + timelineHeight + 15);
        });
        
        // Draw opportunity ranges
        if (compressionOps.dateRanges && compressionOps.dateRanges.length > 0) {
            let rangeY = timelineY + timelineHeight + 30;
            
            _ctx.fillStyle = '#333';
            _ctx.font = 'bold 12px Arial';
            _ctx.textAlign = 'left';
            _ctx.fillText('Identified Underutilized Ranges:', leftMargin, rangeY);
            rangeY += 20;
            
            compressionOps.dateRanges.forEach((range, i) => {
                const startPos = datePositions[range.start] || leftMargin;
                const endPos = datePositions[range.end] || (leftMargin + timelineWidth);
                const rangeWidth = endPos - startPos;
                
                // Draw range bar
                _ctx.fillStyle = 'rgba(244, 67, 54, 0.2)'; // Transparent red
                _ctx.fillRect(startPos, timelineY - 5, rangeWidth, timelineHeight + 10);
                
                // Draw range borders
                _ctx.strokeStyle = '#f44336'; // Red
                _ctx.lineWidth = 2;
                _ctx.strokeRect(startPos, timelineY - 5, rangeWidth, timelineHeight + 10);
                
                // Draw range label
                _ctx.fillStyle = '#d32f2f'; // Dark red
                _ctx.font = '11px Arial';
                _ctx.textAlign = 'left';
                _ctx.fillText(
                    `Range ${i+1}: ${formatShortDate(range.start)} to ${formatShortDate(range.end)} (${range.days} days)`,
                    leftMargin, rangeY
                );
                
                rangeY += 20;
            });
            
            // Draw suggested action
            rangeY += 10;
            _ctx.fillStyle = '#333';
            _ctx.font = 'bold 12px Arial';
            _ctx.textAlign = 'left';
            _ctx.fillText('Suggested Action:', leftMargin, rangeY);
            rangeY += 20;
            
            _ctx.font = '12px Arial';
            _ctx.fillText('• Consider moving classes from underutilized days to more compressed schedule', leftMargin, rangeY);
            rangeY += 20;
            _ctx.fillText('• Focus on filling days to 70-90% of capacity for optimal balance', leftMargin, rangeY);
            rangeY += 20;
            _ctx.fillText('• Use the What-If Analysis tool to simulate the impact of schedule changes', leftMargin, rangeY);
        }
    }
    
    // Public API
    return {
        /**
         * Initialize the visualizer with a container element
         * @param {HTMLElement} container - The container element
         * @return {Object} Visualizer instance for chaining
         */
        initialize: function(container) {
            if (!container) {
                console.error('Cannot initialize ScheduleVisualizer: No container provided');
                return this;
            }
            
            try {
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
            } catch (error) {
                console.error('Error initializing ScheduleVisualizer:', error);
                return this;
            }
        },
        
        /**
         * Render visualization based on metrics data
         * @param {Object} metrics - Schedule metrics data
         * @param {Object} scheduleData - Optional schedule data for more detailed rendering
         * @param {string} type - Visualization type ('heatmap', 'periods', 'constraints', 'compression')
         * @return {Object} Visualizer instance for chaining
         */
        render: function(metrics, scheduleData, type = 'heatmap') {
            console.log('ScheduleVisualizer.render called with type:', type);
            console.log('Canvas:', _canvas, 'Context:', _ctx);
            
            if (!_canvas || !_ctx) {
                console.error('Cannot render: ScheduleVisualizer not properly initialized');
                return this;
            }
            
            try {
                // Store data for potential re-renders
                _data = metrics;
                _scheduleData = scheduleData;
                
                // Clear any previous content
                _ctx.clearRect(0, 0, _width, _height);
                
                // Draw a test message to verify the canvas is working
                _ctx.fillStyle = '#333';
                _ctx.font = 'bold 16px Arial';
                _ctx.textAlign = 'center';
                _ctx.fillText(`Rendering visualization type: ${type}`, _width / 2, 30);
                
                console.log('About to render type:', type);
                
                // Render based on type
                switch (type) {
                    case 'heatmap':
                        console.log('Calling renderHeatMapVisualization');
                        renderHeatMapVisualization(metrics);
                        break;
                    case 'periods':
                        console.log('Calling renderPeriodUtilizationVisualization');
                        renderPeriodUtilizationVisualization(metrics);
                        break;
                    case 'constraints':
                        console.log('Calling renderConstraintPressureVisualization');
                        renderConstraintPressureVisualization(metrics);
                        break;
                    case 'compression':
                        console.log('Calling renderCompressionVisualization');
                        renderCompressionVisualization(metrics);
                        break;
                    default:
                        console.log('Using default rendering (heatmap)');
                        renderHeatMapVisualization(metrics);
                }
                
                return this;
            } catch (error) {
                console.error('Error rendering visualization:', error);
                
                // Fallback message if rendering fails
                _ctx.clearRect(0, 0, _width, _height);
                _ctx.fillStyle = '#d32f2f';
                _ctx.font = '14px Arial';
                _ctx.textAlign = 'center';
                _ctx.fillText('Error rendering visualization', _width / 2, _height / 2);
                
                return this;
            }
        }
    };
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScheduleVisualizer;
}