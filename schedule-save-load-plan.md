# Schedule Save & Load Implementation Plan

## Overview

This document outlines the implementation plan for adding save and load functionality to the Cooking Class Scheduler application. This feature will allow users to:

1. Save complete schedule snapshots (including all scheduled classes, constraints, and teacher availability)
2. View a list of previously saved schedules
3. Load a saved schedule to continue working on it
4. Handle conflicts when class data has changed between saving and loading

The implementation will focus on providing a robust system that maintains data integrity while giving users flexibility in how they manage schedule versions.

## Approach

We'll implement a "Complete Snapshot" approach that:

- Saves the entire scheduling state including all metadata and constraints
- Handles class definition differences between the time of saving and loading
- Provides intelligent conflict resolution options when loading schedules
- Maintains schedule integrity across different scheduling sessions

## Data Structure Changes

### 1. Saved Schedules Array

Add a `savedSchedules` array to the `DataManager` class to store schedule snapshots:

```javascript
this.savedSchedules = [];
```

### 2. Schedule Object Structure

Each saved schedule will have the following structure:

```javascript
{
  id: "unique-id-1234",                           // Unique identifier
  name: "Spring Semester Schedule",               // User-provided name
  description: "Schedule for spring cooking",     // Optional description
  createdAt: "2025-03-20T14:30:00Z",             // Creation timestamp
  lastModified: "2025-03-20T15:45:00Z",          // Last modification timestamp
  scheduleData: { /* Copy of this.scheduleWeeks */ },         // All scheduled classes
  classData: [ /* Copy of this.classes */ ],                  // Class definitions at save time
  constraintData: { /* Copy of this.config */ },              // Constraint settings
  teacherData: { /* Copy of this.teacherUnavailability */ }   // Teacher unavailability data
}
```

### 3. Local Storage Persistence

Add a new localStorage key to persist saved schedules across sessions:

```
cooking-saved-schedules
```

## UI/UX Design

### 1. Main Interface Updates

Add two new buttons to the sidebar controls area:
- "Save Schedule" button
- "Load Schedule" button

### 2. Save Schedule Dialog

Create a custom modal dialog for saving schedules:
- Schedule name field (required)
- Description field (optional)
- Save and Cancel buttons

### 3. Load Schedule Modal

Create a modal for managing saved schedules:
- List of saved schedules with names, creation dates, and descriptions
- Visual indicator showing which schedule is currently loaded
- Load, Preview, and Delete buttons for each saved schedule
- Empty state message when no schedules are saved

### 4. Conflict Resolution Dialog

Create a dialog for handling class differences when loading a schedule:
- Clear explanation of detected differences (missing, modified, and new classes)
- Options for how to proceed:
  - "Full Restore" (use saved class definitions)
  - "Adapt to Current Classes" (keep current class definitions)
  - Cancel

### 5. Preview Capability

Add ability to preview a saved schedule without loading it:
- Modal showing class placement overview
- Summary of constraint settings and teacher availability
- Option to proceed with loading or cancel

## Implementation Steps

### Phase 1: Data Layer Changes

#### 1.1 Update `DataManager` class

Add saved schedules management to `DataManager` with robust error handling:

```javascript
// Constructor additions
constructor() {
    // Existing initialization code...
    
    // Add savedSchedules array
    this.savedSchedules = [];
    
    // Load saved schedules from localStorage
    this.loadSavedSchedulesFromLocalStorage();
}

// Saved schedules management methods
loadSavedSchedulesFromLocalStorage() {
    try {
        const storedSchedules = localStorage.getItem('cooking-saved-schedules');
        if (storedSchedules) {
            this.savedSchedules = JSON.parse(storedSchedules);
            console.log(`Loaded ${this.savedSchedules.length} saved schedules from localStorage`);
        }
    } catch (error) {
        console.error('Error loading saved schedules from localStorage:', error);
        this.savedSchedules = []; // Initialize with empty array on error
        // Show error notification to user
        this.showErrorMessage('There was an error loading your saved schedules. Some data may be lost.');
    }
}

saveSavedSchedulesToLocalStorage() {
    try {
        localStorage.setItem('cooking-saved-schedules', JSON.stringify(this.savedSchedules));
        return true;
    } catch (error) {
        console.error('Error saving schedules to localStorage:', error);
        // Check if it's a quota exceeded error
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
            this.showErrorMessage('Storage limit exceeded. Try deleting some saved schedules first.');
        } else {
            this.showErrorMessage('Failed to save schedule. An unexpected error occurred.');
        }
        return false;
    }
}

addSavedSchedule(schedule) {
    // Add lastModified field if not present
    if (!schedule.lastModified) {
        schedule.lastModified = schedule.createdAt;
    }
    
    this.savedSchedules.push(schedule);
    return this.saveSavedSchedulesToLocalStorage();
}

updateSavedSchedule(id, updates) {
    const index = this.savedSchedules.findIndex(s => s.id === id);
    if (index !== -1) {
        // Update lastModified timestamp
        updates.lastModified = new Date().toISOString();
        
        // Apply updates to the schedule
        this.savedSchedules[index] = {...this.savedSchedules[index], ...updates};
        return this.saveSavedSchedulesToLocalStorage();
    }
    return false;
}

deleteSavedSchedule(id) {
    const index = this.savedSchedules.findIndex(s => s.id === id);
    if (index !== -1) {
        this.savedSchedules.splice(index, 1);
        return this.saveSavedSchedulesToLocalStorage();
    }
    return false;
}

getSavedScheduleById(id) {
    return this.savedSchedules.find(s => s.id === id);
}

showErrorMessage(message) {
    // Implementation will depend on the application's message system
    if (typeof showMessage === 'function') {
        showMessage('error', message);
    } else {
        alert(message);
    }
}
```

### Phase 2: HTML/CSS for UI Elements

#### 2.1 Add HTML for New UI Elements

Add the following HTML to `index.html` (before the closing `</body>` tag):

```html
<!-- Add to controls section -->
<div class="btn-group schedule-management">
    <button id="save-schedule-btn" class="btn btn-secondary">Save Schedule</button>
    <button id="load-schedule-btn" class="btn btn-secondary">Load Schedule</button>
</div>

<!-- Save Schedule Modal -->
<div id="save-schedule-modal" class="modal">
    <div class="modal-content">
        <span class="close">&times;</span>
        <h2>Save Schedule</h2>
        <form id="save-schedule-form">
            <div class="form-group">
                <label for="schedule-name">Schedule Name*</label>
                <input type="text" id="schedule-name" required>
            </div>
            <div class="form-group">
                <label for="schedule-description">Description (optional)</label>
                <textarea id="schedule-description"></textarea>
            </div>
            <div class="dialog-actions">
                <button type="submit" class="btn">Save</button>
                <button type="button" class="btn btn-secondary cancel-btn">Cancel</button>
            </div>
        </form>
    </div>
</div>

<!-- Load Schedule Modal -->
<div id="load-schedule-modal" class="modal">
    <div class="modal-content">
        <span class="close">&times;</span>
        <h2>Saved Schedules</h2>
        <div id="saved-schedules-list" class="saved-schedules-container">
            <!-- Saved schedules will be added here dynamically -->
        </div>
    </div>
</div>

<!-- Preview Schedule Modal -->
<div id="preview-schedule-modal" class="modal">
    <div class="modal-content">
        <span class="close">&times;</span>
        <h2>Schedule Preview</h2>
        <div id="preview-content">
            <!-- Preview content will be added here dynamically -->
        </div>
        <div class="dialog-actions">
            <button id="load-preview-btn" class="btn">Load This Schedule</button>
            <button class="btn btn-secondary cancel-btn">Cancel</button>
        </div>
    </div>
</div>

<!-- Conflict Resolution Modal -->
<div id="conflict-resolution-modal" class="modal">
    <div class="modal-content">
        <span class="close">&times;</span>
        <h2>Class Conflicts Detected</h2>
        <div id="conflict-details">
            <!-- Conflict details will be added here dynamically -->
        </div>
        <div id="conflict-actions" class="dialog-actions">
            <!-- Action buttons will be added here dynamically -->
        </div>
    </div>
</div>
```

#### 2.2 Add CSS Styles

Add the following styles to `styles.css`:

```css
/* Schedule management buttons */
.schedule-management {
    margin-top: 1rem;
    margin-bottom: 1rem;
}

/* Saved schedules list */
.saved-schedules-container {
    max-height: 70vh;
    overflow-y: auto;
}

.saved-schedule-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px;
    margin-bottom: 10px;
    background-color: #f5f5f5;
    border-radius: 4px;
    border-left: 4px solid #2196f3;
}

.saved-schedule-item.current {
    background-color: #e3f2fd;
    border-left-color: #1565c0;
    box-shadow: 0 1px 3px rgba(0,0,0,0.12);
}

.current-tag {
    display: inline-block;
    background: #1565c0;
    color: white;
    font-size: 0.7rem;
    padding: 2px 6px;
    border-radius: 10px;
    margin-left: 8px;
    vertical-align: middle;
}

.schedule-info {
    flex: 1;
}

.schedule-info h3 {
    margin: 0 0 5px 0;
    color: #333;
    display: flex;
    align-items: center;
}

.schedule-date {
    font-size: 0.85rem;
    color: #666;
    margin: 0 0 5px 0;
}

.schedule-modified {
    font-size: 0.85rem;
    color: #666;
    margin: 0 0 8px 0;
    font-style: italic;
}

.schedule-description {
    font-size: 0.9rem;
    margin: 0 0 8px 0;
}

.schedule-stats {
    font-size: 0.85rem;
    color: #2196f3;
    font-weight: bold;
    margin: 0;
}

.schedule-actions {
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.empty-message {
    padding: 20px;
    text-align: center;
    color: #666;
    font-style: italic;
}

/* Save modal styles */
#save-schedule-modal .form-group {
    margin-bottom: 15px;
}

#save-schedule-modal label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
}

#save-schedule-modal input,
#save-schedule-modal textarea {
    width: 100%;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
}

#save-schedule-modal textarea {
    min-height: 80px;
    resize: vertical;
}

/* Preview modal styles */
.preview-section {
    margin-bottom: 15px;
    padding: 0 0 10px 0;
    border-bottom: 1px solid #eee;
}

.preview-section h3 {
    margin-top: 0;
    color: #333;
}

.preview-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 10px;
}

.stat-item {
    background: #f0f0f0;
    padding: 6px 10px;
    border-radius: 4px;
    font-size: 0.9rem;
}

.week-preview {
    margin-bottom: 10px;
}

.week-title {
    font-weight: bold;
    margin-bottom: 5px;
}

/* Conflict resolution styles */
.conflict-section {
    margin-bottom: 15px;
    padding: 10px;
    background-color: #f9f9f9;
    border-radius: 4px;
}

.conflict-section h4 {
    margin-top: 0;
    color: #d32f2f;
}

.conflict-section ul {
    margin-bottom: 0;
}

/* Dialog actions */
.dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 20px;
}

/* Icons for action buttons */
.preview-btn::before {
    content: "👁️";
    margin-right: 5px;
}

.load-btn::before {
    content: "📂";
    margin-right: 5px;
}

.delete-btn::before {
    content: "🗑️";
    margin-right: 5px;
}
```

### Phase 3: JavaScript Implementation

#### 3.1 Save Schedule Functionality

Add this function to `app.js`:

```javascript
function showSaveScheduleModal() {
    // Check if there's anything to save
    const hasScheduledClasses = scheduler.hasAnyClassesScheduled();
    if (!hasScheduledClasses) {
        showMessage('error', 'Nothing to save. Please schedule at least one class first.');
        return;
    }
    
    // Reset form
    const modal = document.getElementById('save-schedule-modal');
    const form = document.getElementById('save-schedule-form');
    form.reset();
    
    // Suggest a default name
    document.getElementById('schedule-name').value = "Schedule " + (dataManager.savedSchedules.length + 1);
    
    // Show modal
    modal.style.display = 'block';
    
    // Focus on name field
    document.getElementById('schedule-name').focus();
}

function handleSaveScheduleSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('schedule-name').value.trim();
    if (!name) {
        showMessage('error', 'Please enter a schedule name.');
        return;
    }
    
    const description = document.getElementById('schedule-description').value.trim();
    
    // Create a unique ID
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const timestamp = new Date().toISOString();
    
    // Create a deep copy of relevant data
    const savedSchedule = {
        id,
        name,
        description,
        createdAt: timestamp,
        lastModified: timestamp,
        scheduleData: JSON.parse(JSON.stringify(dataManager.scheduleWeeks)),
        classData: JSON.parse(JSON.stringify(dataManager.classes)),
        constraintData: JSON.parse(JSON.stringify(dataManager.config)),
        teacherData: JSON.parse(JSON.stringify(dataManager.teacherUnavailability))
    };
    
    // Add to saved schedules
    if (dataManager.addSavedSchedule(savedSchedule)) {
        // Hide modal
        document.getElementById('save-schedule-modal').style.display = 'none';
        
        showMessage('success', `Schedule "${name}" saved successfully.`);
    }
}
```

#### 3.2 Load Schedule Functionality

Add these functions to `app.js`:

```javascript
function showLoadScheduleModal() {
    const modal = document.getElementById('load-schedule-modal');
    const listContainer = document.getElementById('saved-schedules-list');
    
    // Clear existing list
    listContainer.innerHTML = '';
    
    if (dataManager.savedSchedules.length === 0) {
        listContainer.innerHTML = '<div class="empty-message">No saved schedules found.</div>';
    } else {
        // Calculate a "fingerprint" for the current schedule to identify if any saved schedules match
        const currentFingerprint = calculateScheduleFingerprint(
            dataManager.scheduleWeeks,
            dataManager.classes,
            dataManager.config,
            dataManager.teacherUnavailability
        );
        
        // Create list items for each saved schedule
        dataManager.savedSchedules.forEach(schedule => {
            const item = document.createElement('div');
            item.className = 'saved-schedule-item';
            
            // Check if this saved schedule matches the currently loaded one
            const savedFingerprint = calculateScheduleFingerprint(
                schedule.scheduleData,
                schedule.classData,
                schedule.constraintData,
                schedule.teacherData
            );
            
            const isCurrentSchedule = (currentFingerprint === savedFingerprint);
            if (isCurrentSchedule) {
                item.classList.add('current');
            }
            
            const dateOptions = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
            const formattedDate = new Date(schedule.createdAt).toLocaleDateString(undefined, dateOptions);
            const formattedModified = schedule.lastModified && schedule.lastModified !== schedule.createdAt ? 
                new Date(schedule.lastModified).toLocaleDateString(undefined, dateOptions) : null;
            
            // Calculate scheduled class count accurately
            let scheduledClassCount = 0;
            Object.values(schedule.scheduleData).forEach(week => {
                Object.values(week).forEach(day => {
                    Object.values(day).forEach(className => {
                        if (className && typeof className === 'string') scheduledClassCount++;
                    });
                });
            });
            
            const currentTag = isCurrentSchedule ? '<span class="current-tag">Current</span>' : '';
            
            item.innerHTML = `
                <div class="schedule-info">
                    <h3>${schedule.name} ${currentTag}</h3>
                    <p class="schedule-date">Created: ${formattedDate}</p>
                    ${formattedModified ? `<p class="schedule-modified">Modified: ${formattedModified}</p>` : ''}
                    <p class="schedule-description">${schedule.description || 'No description'}</p>
                    <p class="schedule-stats">
                        ${scheduledClassCount} classes scheduled
                    </p>
                </div>
                <div class="schedule-actions">
                    <button class="btn btn-small preview-btn" data-id="${schedule.id}">Preview</button>
                    <button class="btn btn-small load-btn" data-id="${schedule.id}">Load</button>
                    <button class="btn btn-small btn-danger delete-btn" data-id="${schedule.id}">Delete</button>
                </div>
            `;
            
            listContainer.appendChild(item);
        });
        
        // Add event listeners
        document.querySelectorAll('.preview-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const scheduleId = e.target.dataset.id;
                showPreviewModal(scheduleId);
            });
        });
        
        document.querySelectorAll('.load-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const scheduleId = e.target.dataset.id;
                modal.style.display = 'none';
                loadSavedSchedule(scheduleId);
            });
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const scheduleId = e.target.dataset.id;
                if (confirm('Are you sure you want to delete this saved schedule? This cannot be undone.')) {
                    deleteSavedSchedule(scheduleId);
                    // Re-render the list
                    showLoadScheduleModal();
                }
            });
        });
    }
    
    modal.style.display = 'block';
}

function calculateScheduleFingerprint(scheduleData, classData, configData, teacherData) {
    // Create a simplified fingerprint to identify if schedules are effectively the same
    // This is used to detect which saved schedule (if any) matches the current one
    try {
        const scheduleStr = JSON.stringify(scheduleData);
        const classStr = JSON.stringify(classData);
        const configStr = JSON.stringify(configData);
        const teacherStr = JSON.stringify(teacherData);
        
        // Simple hash function
        const combineStrings = scheduleStr + classStr + configStr + teacherStr;
        let hash = 0;
        for (let i = 0; i < combineStrings.length; i++) {
            const char = combineStrings.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString(36);
    } catch (e) {
        console.error('Error calculating schedule fingerprint:', e);
        return Math.random().toString(36); // Fallback to a random value
    }
}

function showPreviewModal(scheduleId) {
    const savedSchedule = dataManager.getSavedScheduleById(scheduleId);
    if (!savedSchedule) {
        showMessage('error', 'Could not find the saved schedule.');
        return;
    }
    
    const modal = document.getElementById('preview-schedule-modal');
    const contentEl = document.getElementById('preview-content');
    
    // Calculate schedule stats
    let scheduledClassCount = 0;
    let weekCount = 0;
    const weekSummaries = [];
    
    // Process each week
    Object.keys(savedSchedule.scheduleData).forEach(weekOffset => {
        weekCount++;
        let weekClassCount = 0;
        
        // Get a sample date from this week for display
        const sampleDate = Object.keys(savedSchedule.scheduleData[weekOffset])[0];
        const weekDate = sampleDate ? new Date(sampleDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : `Week ${weekOffset}`;
        
        // Count classes in this week
        Object.values(savedSchedule.scheduleData[weekOffset]).forEach(day => {
            Object.values(day).forEach(className => {
                if (className && typeof className === 'string') {
                    scheduledClassCount++;
                    weekClassCount++;
                }
            });
        });
        
        weekSummaries.push(`<div class="week-preview">
            <div class="week-title">Week ${parseInt(weekOffset) + 1} (${weekDate}):</div>
            <div class="stat-item">${weekClassCount} classes scheduled</div>
        </div>`);
    });
    
    // Build preview HTML
    contentEl.innerHTML = `
        <div class="preview-section">
            <h3>${savedSchedule.name}</h3>
            <p>${savedSchedule.description || 'No description'}</p>
            <p class="schedule-date">Created: ${new Date(savedSchedule.createdAt).toLocaleDateString(undefined, 
                {year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}</p>
        </div>
        
        <div class="preview-section">
            <h3>Schedule Summary</h3>
            <div class="preview-stats">
                <div class="stat-item">${scheduledClassCount} total classes scheduled</div>
                <div class="stat-item">${savedSchedule.classData.length} classes defined</div>
                <div class="stat-item">${weekCount} weeks</div>
            </div>
        </div>
        
        <div class="preview-section">
            <h3>Constraint Settings</h3>
            <div class="preview-stats">
                <div class="stat-item">Max consecutive: ${savedSchedule.constraintData.maxConsecutiveClasses}</div>
                <div class="stat-item">Max per day: ${savedSchedule.constraintData.maxClassesPerDay}</div>
                <div class="stat-item">Per week: ${savedSchedule.constraintData.minClassesPerWeek}-${savedSchedule.constraintData.maxClassesPerWeek}</div>
            </div>
        </div>
        
        <div class="preview-section">
            <h3>Weekly Breakdown</h3>
            ${weekSummaries.join('')}
        </div>
    `;
    
    // Set up load button
    const loadBtn = document.getElementById('load-preview-btn');
    loadBtn.dataset.id = scheduleId;
    loadBtn.onclick = function() {
        modal.style.display = 'none';
        loadSavedSchedule(this.dataset.id);
    };
    
    modal.style.display = 'block';
}

function loadSavedSchedule(id) {
    // Find the schedule by ID
    const savedSchedule = dataManager.getSavedScheduleById(id);
    if (!savedSchedule) {
        showMessage('error', 'Could not find the saved schedule.');
        return;
    }
    
    // Check if current schedule has any classes scheduled
    const hasCurrentClasses = scheduler.hasAnyClassesScheduled();
    if (hasCurrentClasses) {
        // Ask for confirmation before replacing current schedule
        const modal = document.getElementById('confirm-load-modal') || createConfirmLoadModal();
        
        document.getElementById('confirm-load-text').textContent = 
            'Loading a saved schedule will replace your current schedule. Continue?';
        
        document.getElementById('confirm-load-btn').onclick = function() {
            modal.style.display = 'none';
            proceedWithScheduleLoad(savedSchedule);
        };
        
        modal.style.display = 'block';
    } else {
        // No current schedule, proceed directly
        proceedWithScheduleLoad(savedSchedule);
    }
}

function createConfirmLoadModal() {
    // Create a reusable confirmation modal
    const modal = document.createElement('div');
    modal.id = 'confirm-load-modal';
    modal.className = 'modal';
    
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2>Confirm Schedule Load</h2>
            <p id="confirm-load-text"></p>
            <div class="dialog-actions">
                <button id="confirm-load-btn" class="btn">Continue</button>
                <button id="cancel-load-btn" class="btn btn-secondary">Cancel</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners
    document.querySelector('#confirm-load-modal .close').addEventListener('click', function() {
        modal.style.display = 'none';
    });
    
    document.getElementById('cancel-load-btn').addEventListener('click', function() {
        modal.style.display = 'none';
    });
    
    return modal;
}

function proceedWithScheduleLoad(savedSchedule) {
    // Check for class differences between saved and current
    const classDifferences = findClassDifferences(savedSchedule.classData, dataManager.classes);
    
    if (classDifferences.hasChanges) {
        // Show conflict resolution dialog
        showConflictResolutionDialog(savedSchedule, classDifferences);
    } else {
        // No conflicts, load directly
        applyLoadedSchedule(savedSchedule, 'full');
    }
}

function findClassDifferences(savedClasses, currentClasses) {
    const missing = []; // Classes in saved but not in current
    const modified = []; // Classes in both but with different conflicts
    const added = []; // Classes in current but not in saved
    
    // Find missing and modified classes
    savedClasses.forEach(savedClass => {
        const currentClass = currentClasses.find(c => c.name === savedClass.name);
        
        if (!currentClass) {
            missing.push(savedClass);
        } else {
            // Check if conflicts are different
            const savedConflictsJSON = JSON.stringify(savedClass.conflicts);
            const currentConflictsJSON = JSON.stringify(currentClass.conflicts);
            
            if (savedConflictsJSON !== currentConflictsJSON) {
                modified.push({
                    name: savedClass.name,
                    savedConflicts: savedClass.conflicts,
                    currentConflicts: currentClass.conflicts
                });
            }
        }
    });
    
    // Find added classes
    currentClasses.forEach(currentClass => {
        if (!savedClasses.some(c => c.name === currentClass.name)) {
            added.push(currentClass);
        }
    });
    
    return {
        hasChanges: missing.length > 0 || modified.length > 0 || added.length > 0,
        missing,
        modified,
        added
    };
}

function showConflictResolutionDialog(savedSchedule, differences) {
    const modal = document.getElementById('conflict-resolution-modal');
    const contentEl = document.getElementById('conflict-details');
    
    contentEl.innerHTML = `
        <h3>Class Changes Detected</h3>
        <p>There are differences between the classes in the saved schedule and your current classes:</p>
        
        ${differences.missing.length > 0 ? `
            <div class="conflict-section">
                <h4>${differences.missing.length} Missing Classes</h4>
                <p>These classes exist in the saved schedule but not in your current data:</p>
                <ul>
                    ${differences.missing.map(c => `<li>${c.name}</li>`).join('')}
                </ul>
            </div>
        ` : ''}
        
        ${differences.modified.length > 0 ? `
            <div class="conflict-section">
                <h4>${differences.modified.length} Modified Classes</h4>
                <p>These classes have different conflict periods:</p>
                <ul>
                    ${differences.modified.map(c => `<li>${c.name}</li>`).join('')}
                </ul>
            </div>
        ` : ''}
        
        ${differences.added.length > 0 ? `
            <div class="conflict-section">
                <h4>${differences.added.length} New Classes</h4>
                <p>These classes exist in your current data but not in the saved schedule:</p>
                <ul>
                    ${differences.added.map(c => `<li>${c.name}</li>`).join('')}
                </ul>
            </div>
        ` : ''}
        
        <h3>How would you like to proceed?</h3>
    `;
    
    // Set up action buttons
    const actionsEl = document.getElementById('conflict-actions');
    actionsEl.innerHTML = '';
    
    // Full restore button (uses saved class data)
    const fullRestoreBtn = document.createElement('button');
    fullRestoreBtn.className = 'btn';
    fullRestoreBtn.textContent = 'Full Restore (Use Saved Classes)';
    fullRestoreBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        applyLoadedSchedule(savedSchedule, 'full');
    });
    actionsEl.appendChild(fullRestoreBtn);
    
    // Adapt button (uses current class data)
    const adaptBtn = document.createElement('button');
    adaptBtn.className = 'btn';
    adaptBtn.textContent = 'Adapt to Current Classes';
    adaptBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        applyLoadedSchedule(savedSchedule, 'adapt');
    });
    actionsEl.appendChild(adaptBtn);
    
    // Cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    actionsEl.appendChild(cancelBtn);
    
    modal.style.display = 'block';
}

function applyLoadedSchedule(savedSchedule, mode) {
    try {
        if (mode === 'full') {
            // Full restore - use all saved data including classes
            dataManager.scheduleWeeks = JSON.parse(JSON.stringify(savedSchedule.scheduleData));
            dataManager.classes = JSON.parse(JSON.stringify(savedSchedule.classData));
            dataManager.config = JSON.parse(JSON.stringify(savedSchedule.constraintData));
            dataManager.teacherUnavailability = JSON.parse(JSON.stringify(savedSchedule.teacherData));
            
            // Save to localStorage
            localStorage.setItem('cooking-class-schedule', JSON.stringify(dataManager.scheduleWeeks));
            localStorage.setItem('cooking-classes', JSON.stringify(dataManager.classes));
            localStorage.setItem('cooking-class-config', JSON.stringify(dataManager.config));
            localStorage.setItem('teacher-unavailability', JSON.stringify(dataManager.teacherUnavailability));
            
        } else if (mode === 'adapt') {
            // Adapt mode - keep current classes but load scheduled placements where possible
            dataManager.scheduleWeeks = {};
            
            // Create empty weeks matching saved structure
            Object.keys(savedSchedule.scheduleData).forEach(weekOffset => {
                dataManager.scheduleWeeks[weekOffset] = {};
                
                Object.keys(savedSchedule.scheduleData[weekOffset]).forEach(dateStr => {
                    dataManager.scheduleWeeks[weekOffset][dateStr] = {};
                    
                    // Initialize all periods as empty
                    for (let period = 1; period <= 8; period++) {
                        dataManager.scheduleWeeks[weekOffset][dateStr][period] = null;
                    }
                });
            });
            
            // Apply scheduled classes that still exist
            Object.keys(savedSchedule.scheduleData).forEach(weekOffset => {
                Object.keys(savedSchedule.scheduleData[weekOffset]).forEach(dateStr => {
                    Object.keys(savedSchedule.scheduleData[weekOffset][dateStr]).forEach(period => {
                        const className = savedSchedule.scheduleData[weekOffset][dateStr][period];
                        if (className && typeof className === 'string') {
                            // Check if class still exists
                            const classExists = dataManager.classes.some(c => c.name === className);
                            if (classExists) {
                                dataManager.scheduleWeeks[weekOffset][dateStr][period] = className;
                            }
                        }
                    });
                });
            });
            
            // Load config and teacher unavailability
            dataManager.config = JSON.parse(JSON.stringify(savedSchedule.constraintData));
            dataManager.teacherUnavailability = JSON.parse(JSON.stringify(savedSchedule.teacherData));
            
            // Save to localStorage
            localStorage.setItem('cooking-class-schedule', JSON.stringify(dataManager.scheduleWeeks));
            localStorage.setItem('cooking-class-config', JSON.stringify(dataManager.config));
            localStorage.setItem('teacher-unavailability', JSON.stringify(dataManager.teacherUnavailability));
        }
        
        // Reset to the first week of the schedule
        dataManager.currentWeekOffset = 0;
        
        // Update UI
        renderScheduleGrid();
        renderUnscheduledClasses();
        updateProgress();
        updateConstraintStatus();
        
        showMessage('success', `Schedule "${savedSchedule.name}" loaded successfully.`);
    } catch (error) {
        console.error('Error applying loaded schedule:', error);
        showMessage('error', 'Failed to load schedule due to an error. Please try again.');
    }
}

function deleteSavedSchedule(id) {
    // Find the schedule to get its name
    const schedule = dataManager.getSavedScheduleById(id);
    if (!schedule) return;
    
    const name = schedule.name;
    
    // Delete the schedule
    if (dataManager.deleteSavedSchedule(id)) {
        showMessage('success', `Schedule "${name}" deleted.`);
    } else {
        showMessage('error', `Failed to delete schedule "${name}". Please try again.`);
    }
}
```

#### 3.3 Event Listener Setup

Add these event listeners to `app.js`:

```javascript
// Add to document.addEventListener('DOMContentLoaded', function() {...});
document.getElementById('save-schedule-btn').addEventListener('click', showSaveScheduleModal);
document.getElementById('save-schedule-form').addEventListener('submit', handleSaveScheduleSubmit);
document.getElementById('load-schedule-btn').addEventListener('click', showLoadScheduleModal);

// Add close handlers for modals
document.querySelectorAll('.modal .close, .modal .cancel-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        this.closest('.modal').style.display = 'none';
    });
});

// Close modals when clicking outside
window.addEventListener('click', function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
});
```

### Phase 4: Help Documentation Update

Update the help modal content in `index.html` with information about the new save/load functionality:

```html
<!-- Add this section to the help modal -->
<h3>Schedule Management</h3>
<ul>
    <li><strong>Saving Schedules:</strong> Click "Save Schedule" to create a named snapshot of your current schedule</li>
    <li><strong>Loading Schedules:</strong> Click "Load Schedule" to view and load previously saved schedules</li>
    <li><strong>Previewing Schedules:</strong> Click "Preview" to view schedule details before loading</li>
    <li><strong>Current Schedule Indicator:</strong> The currently loaded schedule is highlighted and labeled in the list</li>
    <li><strong>Handling Class Changes:</strong> When loading a schedule with class differences, you can:
        <ul>
            <li><em>Full Restore:</em> Use class definitions exactly as they were when saved</li>
            <li><em>Adapt to Current Classes:</em> Keep current class definitions but load compatible placements</li>
        </ul>
    </li>
    <li><strong>Managing Saved Schedules:</strong> Use the Load Schedule dialog to view, preview, and delete saved schedules</li>
</ul>
```

## Testing Plan

### 1. Unit Testing

Test each component individually:

- **DataManager Saved Schedules Methods**: Verify saving, loading, and deleting saved schedules
- **Class Difference Detection**: Test finding missing, modified, and added classes
- **Schedule Application Logic**: Test both 'full' and 'adapt' loading modes
- **Error Handling**: Test recovery from localStorage errors, including quotaExceeded errors

### 2. Integration Testing

Test the interactions between components:

- **UI ↔ DataManager**: Verify saving and loading through the UI updates the data layer correctly
- **localStorage Persistence**: Verify schedules remain after page refresh
- **Class Manager Integration**: Test how class changes affect saved schedules
- **Current Schedule Detection**: Verify the "current" indicator correctly highlights the active schedule

### 3. Scenario Testing

Test complete workflows:

#### Scenario 1: Basic Save and Load
1. Create a schedule with several classes
2. Save the schedule with a name
3. Reset the application
4. Load the saved schedule
5. Verify all classes and settings are correctly restored

#### Scenario 2: Class Modifications
1. Create and save a schedule
2. Modify class conflicts in the Class Manager
3. Load the saved schedule
4. Test both "Full Restore" and "Adapt" options
5. Verify each behaves as expected

#### Scenario 3: Multiple Schedules
1. Create and save multiple schedules with different configurations
2. Verify the Load Schedule dialog correctly shows all schedules
3. Test loading different schedules in sequence
4. Verify schedule state is correctly switched each time
5. Confirm the "current" indicator updates properly

#### Scenario 4: Edge Cases
1. Try to save an empty schedule (should show error)
2. Delete a class that exists in a saved schedule
3. Load that schedule and verify conflict handling
4. Try to modify a class that exists in both current and saved schedule
5. Load with both options and verify differences
6. Test preview functionality with different schedule sizes
7. Verify error handling when localStorage is full

### 4. User Experience Testing

Test the overall flow and usability:

- Dialog clarity and information presentation
- Error handling and validation
- Modal interaction and behavior
- Preview experience and information clarity
- Performance with many saved schedules

## Rollout Considerations

### 1. Migration

For existing users with stored data:

- Initialize the `savedSchedules` array on first load
- Consider adding a welcome message highlighting the new feature
- Add automatic backup of current schedule on first load

### 2. Backward Compatibility

Ensure new functionality doesn't break existing features:

- Test with existing localStorage data
- Verify class manager still works with loaded schedules
- Ensure scheduling constraints are properly applied when loading
- Check compatibility with all browser storage limits

### 3. User Education

- Add help documentation explaining the new feature
- Consider adding tooltips to the new buttons
- Add confirmation dialogs to help prevent accidental data loss
- Provide visual indicators for the currently loaded schedule

## Future Extensions

This implementation provides a foundation for future enhancements:

### 1. Advanced Schedule Management
- Add schedule duplication functionality
- Implement schedule comparison tools
- Add export/import functionality for sharing schedules

### 2. Improved Conflict Resolution
- Provide a more detailed, visual conflict resolution interface
- Allow selective class restoration
- Implement a merge mode that combines saved and current class data

### 3. Version Control
- Keep history of changes within a schedule
- Allow reverting to previous versions
- Implement branching for experimental schedule variations

### 4. Schedule Templates
- Allow saving schedules as templates
- Implement season-based templates
- Create a library of common schedule patterns