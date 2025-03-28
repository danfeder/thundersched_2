// Assuming UIManager, DataManager, Scheduler, ConfigController (for dialog) are passed in

class SaveLoadController {
    constructor(dataManager, scheduler, uiManager, configController) {
        this.dataManager = dataManager;
        this.scheduler = scheduler;
        this.uiManager = uiManager;
        this.configController = configController; // Needed for showConfirmDialog utility
        this.isSavingSchedule = false; // Flag to prevent duplicate saves
        console.log("SaveLoadController initialized");
    }

    // --- Save Schedule Methods ---

    showSaveScheduleModal() {
        // Check if there's anything to save
        const hasScheduledClasses = this.scheduler.hasAnyClassesScheduled();
        if (!hasScheduledClasses) {
            this.uiManager.showMessage('error', 'Nothing to save. Please schedule at least one class first.');
            return;
        }
        
        // Reset form
        const modal = document.getElementById('save-schedule-modal');
        if (!modal) return;
        const form = document.getElementById('save-schedule-form');
        if (form) form.reset();
        
        // Suggest a default name
        const nameInput = document.getElementById('schedule-name');
        if (nameInput) {
             nameInput.value = "Schedule " + (this.dataManager.savedSchedules.length + 1);
        }
        
        // Show modal (UIManager might handle this later)
        modal.style.display = 'block'; 
        
        // Focus on name field
        if (nameInput) nameInput.focus();
    }

    handleSaveScheduleSubmit(event) {
        event.preventDefault(); // Prevent default form submission
        console.log('Save schedule form submitted');
        
        // Prevent duplicate submissions
        if (this.isSavingSchedule) {
            console.log('Already processing a save request');
            return;
        }
        
        this.isSavingSchedule = true;
        
        const nameInput = document.getElementById('schedule-name');
        const descriptionInput = document.getElementById('schedule-description');
        
        const name = nameInput ? nameInput.value.trim() : '';
        if (!name) {
            this.uiManager.showMessage('error', 'Please enter a schedule name.');
            this.isSavingSchedule = false;
            return;
        }
        
        // Check for duplicate names
        const isDuplicateName = this.dataManager.savedSchedules.some(schedule => 
            schedule.name.toLowerCase() === name.toLowerCase()
        );

        if (isDuplicateName) {
            this.uiManager.showMessage('error', `A schedule named "${name}" already exists. Please use a different name.`);
            this.isSavingSchedule = false;
            return;
        }
        
        const description = descriptionInput ? descriptionInput.value.trim() : '';
        console.log('Saving schedule with name:', name, 'description:', description);
        
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
            startDate: this.dataManager.getFormattedDate(this.dataManager.scheduleStartDate), // Save the schedule start date
            scheduleData: JSON.parse(JSON.stringify(this.dataManager.scheduleWeeks)),
            classData: JSON.parse(JSON.stringify(this.dataManager.classes)),
            constraintData: JSON.parse(JSON.stringify(this.dataManager.config)),
            teacherData: JSON.parse(JSON.stringify(this.dataManager.teacherUnavailability))
        };
        
        // Add to saved schedules
        if (this.dataManager.addSavedSchedule(savedSchedule)) {
            // Hide modal (UIManager might handle this later)
            const modal = document.getElementById('save-schedule-modal');
            if (modal) modal.style.display = 'none';

            this.uiManager.showMessage('success', `Schedule "${name}" saved successfully.`);
        }

        // Reset the saving flag
        this.isSavingSchedule = false;
    }

    // --- Load Schedule Methods ---

    showLoadScheduleModal() {
        const modal = document.getElementById('load-schedule-modal');
        const listContainer = document.getElementById('saved-schedules-list');
        if (!modal || !listContainer) {
             console.error("Load schedule modal elements not found!");
             return;
        }
        
        // Debug log saved schedules
        console.log('Showing load schedule modal. Saved schedules:', this.dataManager.savedSchedules);
        
        // Clear existing list
        listContainer.innerHTML = '';
        
        if (!this.dataManager.savedSchedules || this.dataManager.savedSchedules.length === 0) {
            console.log('No saved schedules found');
            listContainer.innerHTML = '<div class="empty-message">No saved schedules found.</div>';
        } else {
            // Calculate a "fingerprint" for the current schedule to identify if any saved schedules match
            const currentFingerprint = this.calculateScheduleFingerprint(
                this.dataManager.scheduleWeeks,
                this.dataManager.classes,
                this.dataManager.config,
                this.dataManager.teacherUnavailability
            );
            
            // Create list items for each saved schedule
            this.dataManager.savedSchedules.forEach(schedule => {
                const item = document.createElement('div');
                item.className = 'saved-schedule-item';
                
                // Check if this saved schedule matches the currently loaded one
                const savedFingerprint = this.calculateScheduleFingerprint(
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
                Object.values(schedule.scheduleData || {}).forEach(week => {
                    Object.values(week || {}).forEach(day => {
                        Object.values(day || {}).forEach(className => {
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
            
            // Add event listeners using event delegation on the container
            listContainer.addEventListener('click', (e) => {
                const target = e.target;
                const scheduleId = target.dataset.id;
                if (!scheduleId) return;

                if (target.classList.contains('preview-btn')) {
                    this.showPreviewModal(scheduleId);
                } else if (target.classList.contains('load-btn')) {
                    if (modal) modal.style.display = 'none'; // Hide modal before loading
                    this.loadSavedSchedule(scheduleId);
                } else if (target.classList.contains('delete-btn')) {
                     if (confirm('Are you sure you want to delete this saved schedule? This cannot be undone.')) {
                         this.deleteSavedSchedule(scheduleId);
                         // Re-render the list after deletion
                         this.showLoadScheduleModal(); 
                     }
                }
            });
        }
        
        // Show modal (UIManager might handle this later)
        modal.style.display = 'block'; 
    }

    calculateScheduleFingerprint(scheduleData, classData, configData, teacherData) {
        // Create a simplified fingerprint to identify if schedules are effectively the same
        try {
            const scheduleStr = JSON.stringify(scheduleData || {});
            const classStr = JSON.stringify(classData || []);
            const configStr = JSON.stringify(configData || {});
            const teacherStr = JSON.stringify(teacherData || {});
            
            // Simple hash function (not cryptographically secure, just for comparison)
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

    showPreviewModal(scheduleId) {
        const savedSchedule = this.dataManager.getSavedScheduleById(scheduleId);
        if (!savedSchedule) {
            this.uiManager.showMessage('error', 'Could not find the saved schedule.');
            return;
        }
        
        const modal = document.getElementById('preview-schedule-modal');
        const contentEl = document.getElementById('preview-content');
        if (!modal || !contentEl) return;
        
        // Calculate schedule stats
        let scheduledClassCount = 0;
        let weekCount = 0;
        const weekSummaries = [];
        
        // Process each week
        Object.keys(savedSchedule.scheduleData || {}).forEach(weekOffset => {
            weekCount++;
            let weekClassCount = 0;
            
            // Get a sample date from this week for display
            const sampleDate = Object.keys(savedSchedule.scheduleData[weekOffset] || {})[0];
            const weekDate = sampleDate ? new Date(sampleDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : `Week ${parseInt(weekOffset) + 1}`;
            
            // Count classes in this week
            Object.values(savedSchedule.scheduleData[weekOffset] || {}).forEach(day => {
                Object.values(day || {}).forEach(className => {
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
                    <div class="stat-item">${(savedSchedule.classData || []).length} classes defined</div>
                    <div class="stat-item">${weekCount} weeks</div>
                </div>
            </div>
            
            <div class="preview-section">
                <h3>Constraint Settings</h3>
                <div class="preview-stats">
                    <div class="stat-item">Max consecutive: ${savedSchedule.constraintData?.maxConsecutiveClasses ?? 'N/A'}</div>
                    <div class="stat-item">Max per day: ${savedSchedule.constraintData?.maxClassesPerDay ?? 'N/A'}</div>
                    <div class="stat-item">Per week: ${savedSchedule.constraintData?.minClassesPerWeek ?? 'N/A'}-${savedSchedule.constraintData?.maxClassesPerWeek ?? 'N/A'}</div>
                </div>
            </div>
            
            <div class="preview-section">
                <h3>Weekly Breakdown</h3>
                ${weekSummaries.join('')}
            </div>
        `;
        
        // Set up load button
        const loadBtn = document.getElementById('load-preview-btn');
        if (loadBtn) {
             loadBtn.dataset.id = scheduleId;
             // Use an arrow function to preserve 'this' context
             loadBtn.onclick = () => { 
                  if (modal) modal.style.display = 'none'; // Hide preview modal
                  this.loadSavedSchedule(scheduleId); // Call load method
             };
        }
        
        // Show modal (UIManager might handle this later)
        modal.style.display = 'block'; 
    }

    loadSavedSchedule(id) {
        // Find the schedule by ID
        const savedSchedule = this.dataManager.getSavedScheduleById(id);
        if (!savedSchedule) {
            this.uiManager.showMessage('error', 'Could not find the saved schedule.');
            return;
        }
        
        // Check if current schedule has any classes scheduled
        const hasCurrentClasses = this.scheduler.hasAnyClassesScheduled();
        if (hasCurrentClasses) {
            // Ask for confirmation before replacing current schedule
            const confirmLoadTitle = 'Confirm Schedule Load';
            const confirmLoadMessage = 'Loading a saved schedule will replace your current schedule. Continue?';
            
            // Use the ConfigController's dialog utility
            this.configController.showConfirmDialog({
                title: confirmLoadTitle,
                message: confirmLoadMessage,
                buttons: [
                    {
                        text: 'Continue',
                        class: 'btn',
                        action: () => this.proceedWithScheduleLoad(savedSchedule)
                    },
                    {
                        text: 'Cancel',
                        class: 'btn btn-secondary'
                        // No action needed for cancel
                    }
                ]
            });
        } else {
            // No current schedule, proceed directly
            this.proceedWithScheduleLoad(savedSchedule);
        }
    }

    proceedWithScheduleLoad(savedSchedule) {
        // Check for class differences between saved and current
        const classDifferences = this.findClassDifferences(savedSchedule.classData, this.dataManager.classes);
        
        if (classDifferences.hasChanges) {
            // Show conflict resolution dialog
            this.showConflictResolutionDialog(savedSchedule, classDifferences);
        } else {
            // No conflicts, load directly using 'full' mode
            this.applyLoadedSchedule(savedSchedule, 'full');
        }
    }

    findClassDifferences(savedClasses = [], currentClasses = []) {
        const missing = []; // Classes in saved but not in current
        const modified = []; // Classes in both but with different conflicts
        const added = []; // Classes in current but not in saved
        
        // Find missing and modified classes
        savedClasses.forEach(savedClass => {
            const currentClass = currentClasses.find(c => c.name === savedClass.name);
            
            if (!currentClass) {
                missing.push(savedClass);
            } else {
                // Check if conflicts are different (deep comparison needed)
                const savedConflictsJSON = JSON.stringify(savedClass.conflicts || {});
                const currentConflictsJSON = JSON.stringify(currentClass.conflicts || {});
                
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

    showConflictResolutionDialog(savedSchedule, differences) {
        const modal = document.getElementById('conflict-resolution-modal');
        const contentEl = document.getElementById('conflict-details');
        const actionsEl = document.getElementById('conflict-actions');
        if (!modal || !contentEl || !actionsEl) {
             console.error("Conflict resolution modal elements not found!");
             // Fallback: attempt to load with adaptation
             this.uiManager.showMessage('warning', 'Class differences detected. Attempting to adapt schedule.');
             this.applyLoadedSchedule(savedSchedule, 'adapt');
             return;
        }
        
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
        actionsEl.innerHTML = '';
        
        // Full restore button (uses saved class data)
        const fullRestoreBtn = document.createElement('button');
        fullRestoreBtn.className = 'btn';
        fullRestoreBtn.textContent = 'Full Restore (Use Saved Classes)';
        fullRestoreBtn.addEventListener('click', () => {
            modal.style.display = 'none'; // UIManager hide later
            this.applyLoadedSchedule(savedSchedule, 'full');
        });
        actionsEl.appendChild(fullRestoreBtn);
        
        // Adapt button (uses current class data)
        const adaptBtn = document.createElement('button');
        adaptBtn.className = 'btn';
        adaptBtn.textContent = 'Adapt to Current Classes';
        adaptBtn.addEventListener('click', () => {
            modal.style.display = 'none'; // UIManager hide later
            this.applyLoadedSchedule(savedSchedule, 'adapt');
        });
        actionsEl.appendChild(adaptBtn);
        
        // Cancel button
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn btn-secondary';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.addEventListener('click', () => {
            modal.style.display = 'none'; // UIManager hide later
        });
        actionsEl.appendChild(cancelBtn);
        
        // Show modal (UIManager might handle this later)
        modal.style.display = 'block'; 
    }

    applyLoadedSchedule(savedSchedule, mode) {
        try {
                                    // Ensure data structures exist before accessing
            const savedScheduleData = savedSchedule.scheduleData || {};
            const savedClassData = savedSchedule.classData || [];
            const savedConstraintData = savedSchedule.constraintData || {};
            const savedTeacherData = savedSchedule.teacherData || {};

            if (mode === 'full') {
                // Full restore - use all saved data including classes
                // First, set the scheduleStartDate from savedSchedule if available
                if (savedSchedule.startDate) {
                    const [year, month, day] = savedSchedule.startDate.split('-').map(num => parseInt(num, 10));
                    this.dataManager.scheduleStartDate = new Date(year, month - 1, day); 
                    console.log("Restored schedule start date:", this.dataManager.scheduleStartDate.toDateString());
                } else {
                    // If no startDate, try to infer it
                    console.log("No startDate in saved schedule, attempting to infer it");
                    const firstWeekOffset = Object.keys(savedScheduleData).sort()[0];
                    if (firstWeekOffset) {
                        const firstWeekDates = Object.keys(savedScheduleData[firstWeekOffset] || {}).sort();
                        if (firstWeekDates.length > 0) {
                            const [year, month, day] = firstWeekDates[0].split('-').map(num => parseInt(num, 10));
                            const firstDate = new Date(year, month - 1, day);
                            this.dataManager.scheduleStartDate = this.dataManager.getMondayOfWeek(firstDate);
                            console.log("Inferred start date:", this.dataManager.scheduleStartDate.toDateString());
                        }
                    }
                }
                
                // Deep copy data
                this.dataManager.scheduleWeeks = JSON.parse(JSON.stringify(savedScheduleData));
                this.dataManager.classes = JSON.parse(JSON.stringify(savedClassData));
                this.dataManager.config = JSON.parse(JSON.stringify(savedConstraintData));
                this.dataManager.teacherUnavailability = JSON.parse(JSON.stringify(savedTeacherData));
                
                // Save to localStorage
                localStorage.setItem('cooking-class-schedule', JSON.stringify(this.dataManager.scheduleWeeks));
                localStorage.setItem('cooking-classes', JSON.stringify(this.dataManager.classes));
                localStorage.setItem('cooking-class-config', JSON.stringify(this.dataManager.config));
                localStorage.setItem('teacher-unavailability', JSON.stringify(this.dataManager.teacherUnavailability));
                
                // Reset Class Manager UI if open (Needs reference or event)
                // TODO: Replace direct DOM check/calls with events or controller interaction
                if (document.getElementById('class-manager-modal')?.style.display === 'block') {
                    console.warn("Need to refresh Class Manager UI after full schedule load.");
                    // Example: this.classManagerController.refreshUI(); 
                }
                
            } else if (mode === 'adapt') {
                // Adapt mode - keep current classes but load scheduled placements where possible
                
                // Set start date
                if (savedSchedule.startDate) {
                    const [year, month, day] = savedSchedule.startDate.split('-').map(num => parseInt(num, 10));
                    this.dataManager.scheduleStartDate = new Date(year, month - 1, day);
                    console.log("Restored schedule start date (adapt mode):", this.dataManager.scheduleStartDate.toDateString());
                } else if (Object.keys(savedScheduleData).length > 0) {
                    console.log("No startDate in saved schedule (adapt mode), attempting to infer it");
                     const firstWeekOffset = Object.keys(savedScheduleData).sort()[0];
                     if (firstWeekOffset) {
                          const firstWeekDates = Object.keys(savedScheduleData[firstWeekOffset] || {}).sort();
                          if (firstWeekDates.length > 0) {
                               const [year, month, day] = firstWeekDates[0].split('-').map(num => parseInt(num, 10));
                               const firstDate = new Date(year, month - 1, day);
                               this.dataManager.scheduleStartDate = this.dataManager.getMondayOfWeek(firstDate);
                               console.log("Inferred start date (adapt mode):", this.dataManager.scheduleStartDate.toDateString());
                          }
                     }
                }
                
                // Reset schedule weeks but keep current classes
                this.dataManager.scheduleWeeks = {};
                
                // Create empty weeks matching saved structure
                Object.keys(savedScheduleData).forEach(weekOffset => {
                    this.dataManager.scheduleWeeks[weekOffset] = {};
                    Object.keys(savedScheduleData[weekOffset] || {}).forEach(dateStr => {
                        this.dataManager.scheduleWeeks[weekOffset][dateStr] = {};
                        for (let period = 1; period <= 8; period++) {
                            this.dataManager.scheduleWeeks[weekOffset][dateStr][period] = null;
                        }
                    });
                });
                
                // Apply scheduled classes that still exist in current class list
                Object.keys(savedScheduleData).forEach(weekOffset => {
                    Object.keys(savedScheduleData[weekOffset] || {}).forEach(dateStr => {
                        Object.keys(savedScheduleData[weekOffset][dateStr] || {}).forEach(period => {
                            const className = savedScheduleData[weekOffset][dateStr][period];
                            if (className && typeof className === 'string') {
                                const classExists = this.dataManager.classes.some(c => c.name === className);
                                if (classExists) {
                                    // Ensure the target slot exists before assigning
                                    if(this.dataManager.scheduleWeeks[weekOffset]?.[dateStr]) {
                                         this.dataManager.scheduleWeeks[weekOffset][dateStr][period] = className;
                                    }
                                }
                            }
                        });
                    });
                });
                
                // Load config and teacher unavailability
                this.dataManager.config = JSON.parse(JSON.stringify(savedConstraintData));
                this.dataManager.teacherUnavailability = JSON.parse(JSON.stringify(savedTeacherData));
                
                // Save to localStorage
                localStorage.setItem('cooking-class-schedule', JSON.stringify(this.dataManager.scheduleWeeks));
                localStorage.setItem('cooking-class-config', JSON.stringify(this.dataManager.config));
                localStorage.setItem('teacher-unavailability', JSON.stringify(this.dataManager.teacherUnavailability));
                
                 // Reset Class Manager UI if open (Needs reference or event)
                 // TODO: Replace direct DOM check/calls with events or controller interaction
                 if (document.getElementById('class-manager-modal')?.style.display === 'block') {
                     console.warn("Need to refresh Class Manager UI after adapting schedule load.");
                     // Example: this.classManagerController.refreshUI(); 
                 }
            }
            
            // Reset to the first week of the schedule
            this.dataManager.currentWeekOffset = 0;
            
            // Update UI (Ideally emit events later)
            // Pass scheduler, but teacherModeActive is likely false after a load
            this.uiManager.renderScheduleGrid(this.scheduler, false);
            this.uiManager.renderUnscheduledClasses(); // No args needed
            this.uiManager.updateProgress();
            this.uiManager.updateConstraintStatus(this.scheduler);
            this.uiManager.updateCurrentWeekDisplay();
            
            this.uiManager.showMessage('success', `Schedule "${savedSchedule.name}" loaded successfully.`);
        } catch (error) {
            console.error('Error applying loaded schedule:', error);
            this.uiManager.showMessage('error', 'Failed to load schedule due to an error. Please try again.');
        }
    }

    deleteSavedSchedule(id) {
        // Find the schedule to get its name
        const schedule = this.dataManager.getSavedScheduleById(id);
        if (!schedule) return;
        
        const name = schedule.name;
        
        // Delete the schedule
        if (this.dataManager.deleteSavedSchedule(id)) {
            this.uiManager.showMessage('success', `Schedule "${name}" deleted.`);
        } else {
            this.uiManager.showMessage('error', `Failed to delete schedule "${name}". Please try again.`);
        }
    }
}

export default SaveLoadController;