# Configurable Constraints Implementation Plan

## Overview

This document outlines the implementation plan for making three key scheduling constraints user-configurable in the Cooking Class Scheduler application:

1. **Consecutive Class Limit** (currently fixed at 2)
2. **Daily Class Limit** (currently fixed at 4)
3. **Weekly Teaching Load** (mentioned but not fully implemented; target range 12-16)

The implementation will allow users to modify these constraints while maintaining the integrity of the multi-week scheduling workflow and providing appropriate feedback when constraint changes would invalidate existing schedules.

## Approach

We'll implement the "Allow Changes with Clear Validation and Warnings" approach, which:

- Permits constraint modifications during an active scheduling process
- Validates the impact of constraint changes on existing schedules
- Provides clear feedback and options when tightening constraints would invalidate placements
- Maintains consistent constraints across all schedule weeks

## Data Structure Changes

### 1. Configuration Object

Add a configuration object to the `DataManager` class to store user-defined constraints:

```javascript
this.config = {
    maxConsecutiveClasses: 2,     // Maximum consecutive classes allowed
    maxClassesPerDay: 4,          // Maximum classes per day
    minClassesPerWeek: 12,        // Minimum target classes per week
    maxClassesPerWeek: 16         // Maximum classes per week
};
```

### 2. Local Storage Persistence

Add a new localStorage key to persist user configurations across sessions:

```
cooking-class-config
```

## UI/UX Design

### 1. Configuration Modal

Create a new modal dialog for editing constraints with:
- Input fields for each configurable constraint
- Help text explaining each constraint's purpose
- Save and Reset buttons
- Warning text when editing with an existing schedule

### 2. Access Button

Add a "Configure Constraints" button to the sidebar controls area.

### 3. Constraint Status Indicators

Add visual indicators for current constraint status in the sidebar:
- Weekly class count with min/max bounds
- Color-coded indicators for under, optimal, and exceeded states

## Implementation Steps

### Phase 1: Data Layer Changes

#### 1.1 Update `DataManager` class

Add configuration management methods to `data.js`:

```javascript
// Constructor additions
constructor() {
    // Existing initialization code...
    
    // Add configuration settings with defaults
    this.config = {
        maxConsecutiveClasses: 2,
        maxClassesPerDay: 4,
        minClassesPerWeek: 12,
        maxClassesPerWeek: 16
    };
    
    // Load config from localStorage if available
    this.loadConfigFromLocalStorage();
    
    // Check if current schedule violates default constraints on initial load
    this.validateExistingScheduleAgainstConstraints();
}

// Config management methods
loadConfigFromLocalStorage() {
    try {
        const storedConfig = localStorage.getItem('cooking-class-config');
        if (storedConfig) {
            this.config = {...this.config, ...JSON.parse(storedConfig)};
        }
    } catch (error) {
        console.error('Error loading configuration:', error);
    }
}

saveConfigToLocalStorage() {
    localStorage.setItem('cooking-class-config', JSON.stringify(this.config));
}

getConfig() {
    return this.config;
}

updateConfig(newConfig) {
    this.config = {...this.config, ...newConfig};
    this.saveConfigToLocalStorage();
    return this.config;
}

// Initial validation to check existing schedules against default constraints
validateExistingScheduleAgainstConstraints() {
    // This will be called only on initial load to catch any violations
    // that might exist from previous usage without constraint enforcement
    if (Object.keys(this.scheduleWeeks).length > 0) {
        setTimeout(() => {
            // Timeout to ensure scheduler is initialized first
            if (window.scheduler) {
                const invalidPlacements = window.scheduler.findInvalidPlacementsWithNewConstraints(this.config);
                if (invalidPlacements.length > 0) {
                    console.warn(`Found ${invalidPlacements.length} placement(s) that violate current constraints`);
                    // We don't auto-remove them, but notify the user on next update
                }
            }
        }, 1000);
    }
}
```

#### 1.2 Update `Scheduler` class

Modify constraint validation in `scheduler.js` to use configurable values:

```javascript
isValidPlacement(className, dateStr, period) {
    const schedule = this.dataManager.getSchedule();
    
    // Check if the slot is already occupied
    if (schedule[dateStr] && schedule[dateStr][period]) {
        return { valid: false, reason: 'This time slot is already scheduled.' };
    }

    // Get class information to check specific conflicts
    const classInfo = this.dataManager.getClasses().find(c => c.name === className);
    if (classInfo) {
        // Get day of week from date
        const [year, month, day] = dateStr.split('-').map(num => parseInt(num, 10));
        const date = new Date(year, month - 1, day);
        const dayOfWeek = this.dataManager.getDayFromDate(date);
        
        // Check for class-specific conflicts (hard constraint)
        if (classInfo.conflicts[dayOfWeek] && 
            classInfo.conflicts[dayOfWeek].includes(Number(period))) {
            return { valid: false, reason: `Conflict: ${className} cannot be scheduled during this period.` };
        }
    }

    // Get current configuration
    const config = this.dataManager.getConfig();
    
    // Check consecutive classes limit
    const consecutiveClasses = this.countConsecutiveClasses(dateStr, period);
    if (consecutiveClasses >= config.maxConsecutiveClasses) {
        return { 
            valid: false, 
            reason: `Conflict: Would create ${config.maxConsecutiveClasses + 1} or more consecutive classes.` 
        };
    }

    // Check daily class limit
    const dailyClasses = this.countDailyClasses(dateStr);
    if (dailyClasses >= config.maxClassesPerDay) {
        return { 
            valid: false, 
            reason: `Conflict: Would exceed the daily limit of ${config.maxClassesPerDay} classes.` 
        };
    }

    // Check weekly class limit
    const weeklyClasses = this.countWeeklyClasses();
    if (weeklyClasses >= config.maxClassesPerWeek) {
        return { 
            valid: false, 
            reason: `Conflict: Would exceed the weekly limit of ${config.maxClassesPerWeek} classes.` 
        };
    }

    return { valid: true };
}
```

Update `countWeeklyClasses()` to count only the current week instead of all weeks:

```javascript
// Before: Counts classes across all weeks
// countWeeklyClasses() {
//     const schedule = this.dataManager.getSchedule();
//     let count = 0;
//     
//     Object.values(schedule).forEach(daySchedule => {
//         Object.values(daySchedule).forEach(className => {
//             if (className) count++;
//         });
//     });
//     
//     return count;
// }

// After: Only counts classes in the current week
countWeeklyClasses() {
    const currentWeek = this.dataManager.getCurrentWeekSchedule();
    let count = 0;
    
    Object.keys(currentWeek).forEach(dateStr => {
        Object.keys(currentWeek[dateStr]).forEach(period => {
            if (currentWeek[dateStr][period]) count++;
        });
    });
    
    return count;
}
```

Add a method to determine if any classes are scheduled:

```javascript
hasAnyClassesScheduled() {
    const currentWeek = this.dataManager.getCurrentWeekSchedule();
    
    return Object.values(currentWeek).some(daySchedule => {
        return Object.values(daySchedule).some(className => !!className);
    });
}
```

Add a method to find invalid placements when constraints change:

```javascript
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
```

### Phase 2: UI Implementation

#### 2.1 Add HTML for Config Modal

Add the following HTML to `index.html` (before the closing `</body>` tag):

```html
<!-- Configuration Modal -->
<div id="config-modal" class="modal">
    <div class="modal-content">
        <span class="close">&times;</span>
        <h2>Scheduling Constraints</h2>
        
        <form id="config-form">
            <div class="form-group">
                <label for="max-consecutive">Maximum Consecutive Classes:</label>
                <input type="number" id="max-consecutive" min="1" max="8" value="2">
                <div class="help-text">Maximum number of classes that can be scheduled in a row</div>
                <div class="tooltip">Recommended: 2-3. Higher values may lead to teacher fatigue.</div>
            </div>
            
            <div class="form-group">
                <label for="max-daily">Maximum Classes Per Day:</label>
                <input type="number" id="max-daily" min="1" max="8" value="4">
                <div class="help-text">Maximum number of classes per day</div>
                <div class="tooltip">Recommended: 3-4. Higher values may overload daily schedule.</div>
            </div>
            
            <div class="form-group">
                <label for="min-weekly">Minimum Classes Per Week:</label>
                <input type="number" id="min-weekly" min="0" max="40" value="12">
                <div class="help-text">Target minimum classes per week</div>
                <div class="tooltip">Recommended: 12-14. This is a target, not strictly enforced.</div>
            </div>
            
            <div class="form-group">
                <label for="max-weekly">Maximum Classes Per Week:</label>
                <input type="number" id="max-weekly" min="1" max="40" value="16">
                <div class="help-text">Maximum classes allowed per week</div>
                <div class="tooltip">Recommended: 14-16. Higher values may exceed teaching capacity.</div>
            </div>
            
            <div id="config-warning-container"></div>
            
            <div class="form-actions">
                <button type="submit" class="btn">Save Configuration</button>
                <button type="button" id="reset-config-btn" class="btn btn-secondary">Reset to Defaults</button>
            </div>
        </form>
    </div>
</div>

<!-- Confirmation Dialog Modal -->
<div id="confirm-dialog" class="modal">
    <div class="modal-content">
        <h2 id="confirm-title">Confirmation</h2>
        <p id="confirm-message"></p>
        <div id="confirm-details"></div>
        <div class="dialog-actions" id="confirm-buttons">
            <!-- Buttons will be added dynamically -->
        </div>
    </div>
</div>
```

#### 2.2 Add CSS Styles

Add the following styles to `styles.css`:

```css
/* Configuration form styles */
#config-form .form-group {
    margin-bottom: 1.5rem;
    position: relative;
}

#config-form input[type="number"] {
    width: 5rem;
    text-align: center;
    padding: 0.5rem;
}

.help-text {
    font-size: 0.85rem;
    color: #757575;
    margin-top: 0.25rem;
    font-style: italic;
}

.tooltip {
    font-size: 0.8rem;
    color: #2196f3;
    margin-top: 0.25rem;
    display: none;
    background: #e3f2fd;
    padding: 6px 10px;
    border-radius: 4px;
    border-left: 3px solid #2196f3;
}

.form-group:hover .tooltip {
    display: block;
}

/* Warning message */
.warning-message {
    background-color: #fff3e0;
    color: #e65100;
    padding: 12px 16px;
    border-radius: 4px;
    margin: 16px 0;
    border-left: 4px solid #ff9800;
    font-weight: bold;
}

/* Custom dialog styles */
.dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 20px;
}

#confirm-details {
    max-height: 200px;
    overflow-y: auto;
    margin: 10px 0;
    border: 1px solid #eee;
    padding: 10px;
    background-color: #f9f9f9;
    border-radius: 4px;
}

/* Constraint status indicator styles */
.constraint-status {
    margin-top: 16px;
    padding: 10px;
    background-color: #f5f5f5;
    border-radius: 4px;
}

.constraint-indicator {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 10px;
    border-radius: 4px;
    margin-bottom: 6px;
    font-size: 0.85rem;
}

.constraint-indicator.under {
    background-color: #e3f2fd;
    color: #0d47a1;
    border-left: 3px solid #2196f3;
}

.constraint-indicator.optimal {
    background-color: #e8f5e9;
    color: #1b5e20;
    border-left: 3px solid #4caf50;
}

.constraint-indicator.exceeded {
    background-color: #ffebee;
    color: #b71c1c;
    border-left: 3px solid #f44336;
}
```

#### 2.3 Add Configuration Button to UI

Add code to insert the configuration button in `app.js` (add to the initialization section):

```javascript
// Add config button to controls section
function addConfigButton() {
    const configBtn = document.createElement('button');
    configBtn.id = 'config-btn';
    configBtn.className = 'btn btn-secondary';
    configBtn.textContent = 'Configure Constraints';
    
    // Insert before the reset button
    const resetBtn = document.getElementById('reset-btn');
    resetBtn.parentNode.insertBefore(configBtn, resetBtn);
    
    // Add event listener
    configBtn.addEventListener('click', showConfigModal);
}

// Call this during initialization
addConfigButton();
```

#### 2.4 Add Constraint Status Indicators

Add this HTML inside the controls div in `index.html`:

```html
<div class="constraint-status">
    <div id="weekly-constraint-indicator" class="constraint-indicator">
        <span>Weekly: <span id="week-count">0</span>/<span id="week-limit">12-16</span></span>
    </div>
</div>
```

Add a function to update the status in `app.js`:

```javascript
function updateConstraintStatus() {
    const config = dataManager.getConfig();
    const weeklyClasses = scheduler.countWeeklyClasses();
    
    document.getElementById('week-count').textContent = weeklyClasses;
    document.getElementById('week-limit').textContent = `${config.minClassesPerWeek}-${config.maxClassesPerWeek}`;
    
    const indicator = document.getElementById('weekly-constraint-indicator');
    
    if (weeklyClasses > config.maxClassesPerWeek) {
        indicator.className = 'constraint-indicator exceeded';
    } else if (weeklyClasses >= config.minClassesPerWeek) {
        indicator.className = 'constraint-indicator optimal';
    } else {
        indicator.className = 'constraint-indicator under';
    }
}
```

Update the existing rendering functions to call this:

```javascript
// Add to renderScheduleGrid() and other functions that update the schedule
renderScheduleGrid() {
    // Existing code...
    
    // Update constraint indicators
    updateConstraintStatus();
}
```

### Phase 3: Configuration Modal Logic

#### 3.1 Modal Management Functions

Add these functions to `app.js`:

```javascript
function showConfigModal() {
    const modal = document.getElementById('config-modal');
    const config = dataManager.getConfig();
    const hasExistingSchedule = scheduler.hasAnyClassesScheduled();
    
    // Populate form with current values
    document.getElementById('max-consecutive').value = config.maxConsecutiveClasses;
    document.getElementById('max-daily').value = config.maxClassesPerDay;
    document.getElementById('min-weekly').value = config.minClassesPerWeek;
    document.getElementById('max-weekly').value = config.maxClassesPerWeek;
    
    // Add warning if schedule exists
    const warningContainer = document.getElementById('config-warning-container');
    warningContainer.innerHTML = '';
    
    if (hasExistingSchedule) {
        const warning = document.createElement('div');
        warning.className = 'warning-message';
        warning.textContent = 'Warning: Changing constraints may invalidate parts of your current schedule.';
        warningContainer.appendChild(warning);
    }
    
    // Show the modal
    modal.style.display = 'block';
}

// General purpose confirmation dialog
function showConfirmDialog(options) {
    const modal = document.getElementById('confirm-dialog');
    const titleEl = document.getElementById('confirm-title');
    const messageEl = document.getElementById('confirm-message');
    const detailsEl = document.getElementById('confirm-details');
    const buttonsEl = document.getElementById('confirm-buttons');
    
    // Set content
    titleEl.textContent = options.title || 'Confirmation';
    messageEl.textContent = options.message || 'Are you sure?';
    
    // Set details if provided
    if (options.details) {
        detailsEl.innerHTML = options.details;
        detailsEl.style.display = 'block';
    } else {
        detailsEl.style.display = 'none';
    }
    
    // Clear previous buttons
    buttonsEl.innerHTML = '';
    
    // Add buttons
    options.buttons.forEach(btn => {
        const button = document.createElement('button');
        button.textContent = btn.text;
        button.className = btn.class || 'btn';
        
        button.addEventListener('click', () => {
            modal.style.display = 'none';
            if (typeof btn.action === 'function') {
                btn.action();
            }
        });
        
        buttonsEl.appendChild(button);
    });
    
    // Show the modal
    modal.style.display = 'block';
}
```

#### 3.2 Configuration Form Submission Handler

Add this event listener to `app.js`:

```javascript
// Add event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Config form submission
    document.getElementById('config-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get values from form
        const newConfig = {
            maxConsecutiveClasses: parseInt(document.getElementById('max-consecutive').value),
            maxClassesPerDay: parseInt(document.getElementById('max-daily').value),
            minClassesPerWeek: parseInt(document.getElementById('min-weekly').value),
            maxClassesPerWeek: parseInt(document.getElementById('max-weekly').value)
        };
        
        // Validate ranges
        if (newConfig.maxClassesPerWeek < newConfig.minClassesPerWeek) {
            showMessage('error', 'Maximum weekly classes must be greater than minimum weekly classes.');
            return;
        }
        
        // Check if any constraints are being tightened
        const currentConfig = dataManager.getConfig();
        const isTightening = 
            newConfig.maxConsecutiveClasses < currentConfig.maxConsecutiveClasses ||
            newConfig.maxClassesPerDay < currentConfig.maxClassesPerDay ||
            newConfig.maxClassesPerWeek < currentConfig.maxClassesPerWeek;
        
        if (isTightening && scheduler.hasAnyClassesScheduled()) {
            // Find what would become invalid
            const invalidPlacements = scheduler.findInvalidPlacementsWithNewConstraints(newConfig);
            
            if (invalidPlacements.length > 0) {
                // Build details HTML
                let detailsHtml = `<p>The following ${invalidPlacements.length} placements would become invalid:</p>`;
                detailsHtml += '<ul>';
                
                invalidPlacements.slice(0, 10).forEach(p => {
                    detailsHtml += `<li>${p.className} on ${p.dateStr} period ${p.period}: ${p.reason}</li>`;
                });
                
                if (invalidPlacements.length > 10) {
                    detailsHtml += `<li>...and ${invalidPlacements.length - 10} more</li>`;
                }
                
                detailsHtml += '</ul>';
                
                // Show confirmation with details
                showConfirmDialog({
                    title: 'Constraint Change Impact',
                    message: 'Changing these constraints will invalidate existing placements. What would you like to do?',
                    details: detailsHtml,
                    buttons: [
                        {
                            text: 'Remove invalid placements',
                            class: 'btn btn-danger',
                            action: () => {
                                // Remove invalid placements
                                invalidPlacements.forEach(p => {
                                    dataManager.unscheduleClass(p.dateStr, p.period);
                                });
                                
                                // Update config
                                dataManager.updateConfig(newConfig);
                                document.getElementById('config-modal').style.display = 'none';
                                
                                // Refresh UI
                                renderScheduleGrid();
                                renderUnscheduledClasses();
                                updateProgress();
                                showMessage('warning', `Constraints updated. ${invalidPlacements.length} invalid placements were removed.`);
                            }
                        },
                        {
                            text: 'Keep current schedule',
                            class: 'btn',
                            action: () => {
                                // Don't change config
                                document.getElementById('config-modal').style.display = 'none';
                                showMessage('info', 'Constraint changes cancelled to preserve current schedule.');
                            }
                        }
                    ]
                });
                return;
            }
        }
        
        // No conflicts or user chose to proceed
        dataManager.updateConfig(newConfig);
        document.getElementById('config-modal').style.display = 'none';
        
        // Refresh UI
        renderScheduleGrid();
        updateConstraintStatus();
        
        // If a class is selected, refresh its available slots
        const selectedClass = document.querySelector('.class-item.suggested');
        if (selectedClass) {
            highlightAvailableSlots(selectedClass.dataset.className);
        }
        
        showMessage('success', 'Scheduling constraints updated successfully.');
    });
    
    // Reset config button
    document.getElementById('reset-config-btn').addEventListener('click', function() {
        if (confirm('Reset configuration to default values?')) {
            // Reset form values
            document.getElementById('max-consecutive').value = 2;
            document.getElementById('max-daily').value = 4;
            document.getElementById('min-weekly').value = 12;
            document.getElementById('max-weekly').value = 16;
            
            showMessage('info', 'Form reset to default values. Click Save to apply changes.');
        }
    });
    
    // Modal close buttons
    const configModal = document.getElementById('config-modal');
    configModal.querySelector('.close').addEventListener('click', function() {
        configModal.style.display = 'none';
    });
    
    // Close when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target === configModal) {
            configModal.style.display = 'none';
        }
        
        const confirmDialog = document.getElementById('confirm-dialog');
        if (e.target === confirmDialog) {
            confirmDialog.style.display = 'none';
        }
    });
});
```

### Phase 4: Update Documentation

Modify the help modal content in `index.html` to include the new configurable constraints information:

```html
<!-- Add this to the Scheduling Rules section in the help modal -->
<h3>Configurable Constraints</h3>
<ul>
    <li><strong>Consecutive Class Limit:</strong> You can set the maximum number of consecutive classes allowed</li>
    <li><strong>Daily Class Limit:</strong> You can specify how many classes can be scheduled per day</li>
    <li><strong>Weekly Class Range:</strong> You can set minimum and maximum classes per week targets</li>
    <li><strong>Constraint Configuration:</strong> Click the "Configure Constraints" button to modify these settings</li>
</ul>
```

## Testing Plan

### 1. Unit Testing

Test each component individually:

- **DataManager Config Methods**: Verify loading, saving, and updating configuration
- **Scheduler Validation Logic**: Test constraint checks with various configurations
- **Invalid Placement Detection**: Test finding invalid placements when constraints change

### 2. Integration Testing

Test the interactions between components:

- **UI ↔ DataManager**: Verify configuration changes are properly saved and loaded
- **Scheduler ↔ DataManager**: Test that scheduler properly uses configuration values
- **Weekly Navigation ↔ Constraints**: Verify constraints apply consistently across weeks (configuration changes should affect ALL weeks, not just the current one)
- **Multi-Week Consistency**: Ensure that constraint configuration applies uniformly to all schedule weeks

### 3. Scenario Testing

Test complete workflows:

#### Scenario 1: Starting with Defaults
1. Load application with default constraints
2. Schedule several classes
3. Verify constraints are enforced correctly

#### Scenario 2: Loosening Constraints
1. Schedule several classes with default constraints
2. Open configuration modal
3. Increase constraint limits
4. Verify more slots become available

#### Scenario 3: Tightening Constraints
1. Schedule multiple classes
2. Open configuration modal
3. Decrease constraint limits
4. Verify conflict detection identifies affected placements
5. Test both options: remove invalid placements and cancel

#### Scenario 4: Multi-Week Consistency
1. Schedule classes across multiple weeks
2. Change constraints
3. Verify changes apply consistently to all weeks

### 4. Edge Cases

Test boundary conditions:

- Minimum values (e.g., setting maxConsecutiveClasses to 1)
- Maximum values (e.g., setting all limits very high)
- Invalid input handling (e.g., min weekly > max weekly)
- Empty schedules with constraint changes

## Rollout Considerations


### 1. Backward Compatibility

Ensure the application handles data from previous versions:

- Check for missing configuration and apply defaults
- Verify scheduling rules apply correctly to previously saved schedules

### 2. User Education

- Add a brief tutorial or tooltip highlighting the new feature
- Update help documentation with details about configurable constraints
- Consider a "What's New" notification on first load

## Future Extensions

This implementation provides a foundation for future enhancements:

### 1. Temporary Constraint Relaxation
- Add UI for temporary overrides of specific constraints
- Implement visual indicators for placements made with relaxed constraints
- Create a mechanism to revert to standard constraints after specific placements

### 2. Advanced Configuration Profiles
- Allow saving and loading different constraint profiles
- Implement named configurations for different scheduling scenarios

### 3. Per-Week Configuration
- Allow different constraint settings for different weeks if needed
- Implement a "copy settings to all weeks" feature to quickly propagate changes
- Add visual indicators showing which weeks have custom configurations

### 4. Constraint Analytics
- Add a dashboard showing constraint utilization statistics
- Implement metrics for optimal scheduling efficiency
- Provide suggestions for constraint adjustments based on actual usage patterns
