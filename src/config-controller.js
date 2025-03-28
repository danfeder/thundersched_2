// Assuming UIManager is imported where needed or passed in
// Assuming Scheduler and DataManager are passed in

class ConfigController {
    constructor(dataManager, scheduler, uiManager) {
        this.dataManager = dataManager;
        this.scheduler = scheduler;
        this.uiManager = uiManager; // Assuming UIManager instance is passed
        console.log("ConfigController initialized");
    }

    // Method to show the configuration modal
    showConfigModal() {
        const modal = document.getElementById('config-modal');
        if (!modal) {
            console.error("Config modal element not found!");
            return;
        }
        const config = this.dataManager.getConfig();
        const hasExistingSchedule = this.scheduler.hasAnyClassesScheduled();
        
        // Populate form with current values
        document.getElementById('max-consecutive').value = config.maxConsecutiveClasses;
        document.getElementById('max-daily').value = config.maxClassesPerDay;
        document.getElementById('min-weekly').value = config.minClassesPerWeek;
        document.getElementById('max-weekly').value = config.maxClassesPerWeek;
        
        // Add warning if schedule exists
        const warningContainer = document.getElementById('config-warning-container');
        warningContainer.innerHTML = ''; // Clear previous warnings
        
        if (hasExistingSchedule) {
            const warning = document.createElement('div');
            warning.className = 'warning-message';
            warning.textContent = 'Warning: Changing constraints may invalidate parts of your current schedule.';
            warningContainer.appendChild(warning);
        }
        
        // Show the modal (UIManager might handle this later)
        modal.style.display = 'block'; 
    }

    // Method to reset the configuration form to defaults
    resetConfigForm() {
        // Use UIManager confirm if available, otherwise fallback
        if (confirm('Reset configuration to default values?')) { 
            // Reset form values
            document.getElementById('max-consecutive').value = 2;
            document.getElementById('max-daily').value = 4;
            document.getElementById('min-weekly').value = 12;
            document.getElementById('max-weekly').value = 16;

            this.uiManager.showMessage('info', 'Form reset to default values. Click Save to apply changes.');
        }
    }

    // Method to handle the submission of the configuration form
    handleConfigFormSubmit() {
        // Get values from form
        const newConfig = {
            maxConsecutiveClasses: parseInt(document.getElementById('max-consecutive').value),
            maxClassesPerDay: parseInt(document.getElementById('max-daily').value),
            minClassesPerWeek: parseInt(document.getElementById('min-weekly').value),
            maxClassesPerWeek: parseInt(document.getElementById('max-weekly').value)
        };
        
        // Validate ranges
        if (newConfig.maxClassesPerWeek < newConfig.minClassesPerWeek) {
            this.uiManager.showMessage('error', 'Maximum weekly classes must be greater than minimum weekly classes.');
            return;
        }
        
        // Check if any constraints are being tightened
        const currentConfig = this.dataManager.getConfig();
        const isTightening = 
            newConfig.maxConsecutiveClasses < currentConfig.maxConsecutiveClasses ||
            newConfig.maxClassesPerDay < currentConfig.maxClassesPerDay ||
            newConfig.maxClassesPerWeek < currentConfig.maxClassesPerWeek;
        
        if (isTightening && this.scheduler.hasAnyClassesScheduled()) {
            // Find what would become invalid
            const invalidPlacements = this.scheduler.findInvalidPlacementsWithNewConstraints(newConfig);
            
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
                
                // Show confirmation with details using the utility method
                this.showConfirmDialog({
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
                                    this.dataManager.unscheduleClass(p.dateStr, p.period);
                                });
                                
                                // Update config
                                this.dataManager.updateConfig(newConfig);
                                document.getElementById('config-modal').style.display = 'none'; // UIManager hide later
                                
                                // Explicitly save schedule to localStorage (temporary global call)
                                if (window.saveScheduleToLocalStorage) window.saveScheduleToLocalStorage();
                                
                                // Refresh UI (Ideally emit events later)
                                // Pass scheduler, assume teacherModeActive is false after config change
                                this.uiManager.renderScheduleGrid(this.scheduler, false);
                                this.uiManager.renderUnscheduledClasses(); // No args needed
                                this.uiManager.updateProgress();
                                this.uiManager.updateConstraintStatus(this.scheduler);
                                this.uiManager.showMessage('warning', `Constraints updated. ${invalidPlacements.length} invalid placements were removed.`);
                            }
                        },
                        {
                            text: 'Keep current schedule',
                            class: 'btn',
                            action: () => {
                                // Don't change config
                                document.getElementById('config-modal').style.display = 'none'; // UIManager hide later
                                this.uiManager.showMessage('info', 'Constraint changes cancelled to preserve current schedule.');
                            }
                        }
                    ]
                });
                return; // Stop processing here, wait for dialog action
            }
        }
        
        // No conflicts or user chose to proceed without removing placements
        this.dataManager.updateConfig(newConfig);
        document.getElementById('config-modal').style.display = 'none'; // UIManager hide later
        
        
        // Refresh UI (Ideally emit events later)
        // Pass scheduler, assume teacherModeActive is false after config change
        this.uiManager.renderScheduleGrid(this.scheduler, false);
        this.uiManager.updateConstraintStatus(this.scheduler);
        
        const selectedClassElement = document.querySelector('.class-item.suggested');
        if (selectedClassElement) {
            const className = selectedClassElement.dataset.className;
            this.uiManager.highlightAvailableSlots(className, this.scheduler);
        }

        this.uiManager.showMessage('success', 'Scheduling constraints updated successfully.');
    }

    // General confirmation dialog utility (might move to UIManager later)
    showConfirmDialog(options) {
        const modal = document.getElementById('confirm-dialog');
        if (!modal) {
             console.error("Confirm dialog element not found!");
             // Fallback to basic confirm if modal is missing
             if (confirm(options.message || 'Are you sure?')) {
                  if (options.buttons && options.buttons[0] && typeof options.buttons[0].action === 'function') {
                       options.buttons[0].action(); // Execute the primary action
                  }
             }
             return;
        }

        const titleEl = document.getElementById('confirm-title');
        const messageEl = document.getElementById('confirm-message');
        const detailsEl = document.getElementById('confirm-details');
        const buttonsEl = document.getElementById('confirm-buttons');
        
        // Set content
        if(titleEl) titleEl.textContent = options.title || 'Confirmation';
        if(messageEl) messageEl.textContent = options.message || 'Are you sure?';
        
        // Set details if provided
        if (detailsEl) {
             if (options.details) {
                  detailsEl.innerHTML = options.details;
                  detailsEl.style.display = 'block';
             } else {
                  detailsEl.style.display = 'none';
             }
        }
        
        // Clear previous buttons and add new ones
        if (buttonsEl) {
             buttonsEl.innerHTML = ''; 
             options.buttons.forEach(btn => {
                  const button = document.createElement('button');
                  button.textContent = btn.text;
                  button.className = btn.class || 'btn';
                  
                  button.addEventListener('click', () => {
                       modal.style.display = 'none'; // UIManager hide later
                       if (typeof btn.action === 'function') {
                            btn.action();
                       }
                  });
                  
                  buttonsEl.appendChild(button);
             });
        }
        
        // Show the modal (UIManager might handle this later)
        modal.style.display = 'block'; 
    }
}

export default ConfigController;