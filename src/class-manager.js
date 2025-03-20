// Class Manager functionality

// Function to refresh the class list without reopening the modal
function refreshClassList(selectClassName = null) {
    try {
        if (window.dataManager) {
            const classes = window.dataManager.getClasses();
            console.log('Refreshing class list, classes:', classes.length);
            
            // Clear and populate the class list
            const classList = document.getElementById('class-list');
            if (classList) {
                classList.innerHTML = '';
                
                // Check if there are any classes
                if (classes.length === 0) {
                    const placeholder = document.createElement('div');
                    placeholder.className = 'class-manager-placeholder';
                    placeholder.textContent = 'No classes defined yet';
                    classList.appendChild(placeholder);
                } else {
                    classes.forEach(classInfo => {
                        const classElement = document.createElement('div');
                        classElement.className = 'class-item';
                        classElement.textContent = classInfo.name;
                        
                        // Add click handler
                        classElement.addEventListener('click', function() {
                            // Deselect any currently selected class
                            const selected = classList.querySelector('.selected');
                            if (selected) {
                                selected.classList.remove('selected');
                            }
                            
                            // Select this class
                            classElement.classList.add('selected');
                            
                            // Show the class details in the editor
                            showClassDetails(classInfo);
                        });
                        
                        // If this is the class we want to select, mark it as selected
                        if (selectClassName && classInfo.name === selectClassName) {
                            classElement.classList.add('selected');
                            // Show its details
                            setTimeout(() => showClassDetails(classInfo), 50);
                        }
                        
                        classList.appendChild(classElement);
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error refreshing class list:', error);
    }
}

// Create a global function to open the class manager
window.openClassManager = function() {
    console.log('Global open class manager function called');
    const modal = document.getElementById('class-manager-modal');
    if (modal) {
        modal.style.display = 'block';
        
        // Try to load classes
        try {
            if (window.dataManager) {
                const classes = window.dataManager.getClasses();
                console.log('Classes loaded:', classes.length);
                
                // Clear and populate the class list
                const classList = document.getElementById('class-list');
                if (classList) {
                    classList.innerHTML = '';
                    
                    // Check if there are any classes
                    if (classes.length === 0) {
                        const placeholder = document.createElement('div');
                        placeholder.className = 'class-manager-placeholder';
                        placeholder.textContent = 'No classes defined yet';
                        classList.appendChild(placeholder);
                    } else {
                        classes.forEach(classInfo => {
                            const classElement = document.createElement('div');
                            classElement.className = 'class-item';
                            classElement.textContent = classInfo.name;
                            
                            // Add click handler
                            classElement.addEventListener('click', function() {
                                // Deselect any currently selected class
                                const selected = classList.querySelector('.selected');
                                if (selected) {
                                    selected.classList.remove('selected');
                                }
                                
                                // Select this class
                                classElement.classList.add('selected');
                                
                                // Show the class details in the editor
                                showClassDetails(classInfo);
                            });
                            
                            classList.appendChild(classElement);
                        });
                    }
                }
                
                // Initialize the conflict grid
                createConflictGrid();
            }
        } catch (error) {
            console.error('Error loading classes:', error);
        }
    } else {
        console.error('Class manager modal not found globally');
    }
};

// Close the class manager
window.closeClassManager = function() {
    console.log('Global close class manager function called');
    const modal = document.getElementById('class-manager-modal');
    if (modal) {
        modal.style.display = 'none';
    }
};

// Function to create and set up the conflict grid
function createConflictGrid() {
    const conflictGrid = document.getElementById('conflict-grid');
    if (!conflictGrid) {
        console.error('Conflict grid not found');
        return;
    }
    
    // Clear existing grid
    conflictGrid.innerHTML = '';
    
    // Add empty cell in top-left corner
    const cornerCell = document.createElement('div');
    cornerCell.className = 'conflict-grid-header';
    conflictGrid.appendChild(cornerCell);
    
    // Add day headers (Monday-Friday)
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    days.forEach(day => {
        const headerCell = document.createElement('div');
        headerCell.className = 'conflict-grid-header';
        headerCell.textContent = day;
        conflictGrid.appendChild(headerCell);
    });
    
    // Add period rows with cells
    for (let period = 1; period <= 8; period++) {
        // Add period label
        const periodLabel = document.createElement('div');
        periodLabel.className = 'conflict-grid-header';
        periodLabel.textContent = `Period ${period}`;
        conflictGrid.appendChild(periodLabel);
        
        // Add cells for each day in this period
        days.forEach(day => {
            const cell = document.createElement('div');
            cell.className = 'conflict-grid-cell';
            cell.dataset.day = day;
            cell.dataset.period = period;
            
            // Add click handler to toggle conflict
            cell.addEventListener('click', function() {
                cell.classList.toggle('conflict');
            });
            
            conflictGrid.appendChild(cell);
        });
    }
}

// Function to display class details in the editor
function showClassDetails(classInfo) {
    const classNameInput = document.getElementById('class-name');
    const classGradeSelect = document.getElementById('class-grade');
    
    if (!classNameInput || !classGradeSelect) {
        console.error('Class editor form elements not found');
        return;
    }
    
    // Enable the form
    const classEditForm = document.getElementById('class-edit-form');
    if (classEditForm) {
        classEditForm.classList.remove('disabled');
    }
    
    // Populate the form with class data
    classNameInput.value = classInfo.name;
    
    // Extract grade from class name
    let grade = 'PK';
    if (classInfo.name.includes('-')) {
        const parts = classInfo.name.split('-');
        grade = parts[0].trim();
    } else if (classInfo.name.startsWith('PK')) {
        grade = 'PK';
    } else if (classInfo.name.startsWith('K')) {
        grade = 'K';
    } else {
        // Try to extract a numeric grade
        const match = classInfo.name.match(/^(\d+)/);
        if (match) {
            grade = match[1];
        }
    }
    
    classGradeSelect.value = grade;
    
    // Mark conflicts on the grid
    clearConflicts();
    if (classInfo.conflicts) {
        const conflictGrid = document.getElementById('conflict-grid');
        
        Object.entries(classInfo.conflicts).forEach(([day, periods]) => {
            periods.forEach(period => {
                const cell = conflictGrid.querySelector(`.conflict-grid-cell[data-day="${day}"][data-period="${period}"]`);
                if (cell) {
                    cell.classList.add('conflict');
                }
            });
        });
    }
    
    // Enable delete button
    const deleteClassBtn = document.getElementById('delete-class-btn');
    if (deleteClassBtn) {
        deleteClassBtn.disabled = false;
    }
}

// Function to clear all conflicts in the grid
function clearConflicts() {
    const cells = document.querySelectorAll('.conflict-grid-cell');
    cells.forEach(cell => {
        cell.classList.remove('conflict');
    });
}

// Add new class button handler
document.getElementById('add-class-btn')?.addEventListener('click', function() {
    // Deselect any selected class
    const selected = document.querySelector('.class-item.selected');
    if (selected) {
        selected.classList.remove('selected');
    }
    
    // Clear the form
    const classNameInput = document.getElementById('class-name');
    const classGradeSelect = document.getElementById('class-grade');
    const classEditForm = document.getElementById('class-edit-form');
    
    if (classNameInput && classGradeSelect) {
        classNameInput.value = '';
        classGradeSelect.value = 'PK';
        clearConflicts();
        
        // Enable the form
        if (classEditForm) {
            classEditForm.classList.remove('disabled');
        }
        
        // Disable delete button
        const deleteClassBtn = document.getElementById('delete-class-btn');
        if (deleteClassBtn) {
            deleteClassBtn.disabled = true;
        }
        
        // Focus on the name input
        classNameInput.focus();
    }
});

// Save class form handler
document.getElementById('class-edit-form')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const classNameInput = document.getElementById('class-name');
    const classGradeSelect = document.getElementById('class-grade');
    
    if (!classNameInput || !classGradeSelect) {
        console.error('Class editor form elements not found');
        return;
    }
    
    // Get form data
    const name = classNameInput.value.trim();
    const grade = classGradeSelect.value;
    
    // Generate class name based on grade if needed
    let className = name;
    if (!className) {
        // Generate a name based on grade level and a number
        const existingClasses = window.dataManager?.getClasses() || [];
        const gradeClasses = existingClasses.filter(c => c.name.startsWith(grade));
        const classNumber = gradeClasses.length + 1;
        className = `${grade}-${300 + classNumber}`;
    }
    
    // Build the conflicts object
    const conflicts = {};
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    days.forEach(day => {
        conflicts[day] = [];
        
        for (let period = 1; period <= 8; period++) {
            const cell = document.querySelector(`.conflict-grid-cell[data-day="${day}"][data-period="${period}"]`);
            if (cell && cell.classList.contains('conflict')) {
                conflicts[day].push(Number(period));
            }
        }
    });
    
    // Get the selected class (if any)
    const selectedElement = document.querySelector('.class-item.selected');
    const selectedClassName = selectedElement?.textContent;
    const isNewClass = !selectedClassName;
    
    // Create or update the class
    if (isNewClass) {
        // Add new class
        const newClass = { name: className, conflicts };
        window.dataManager?.addClass(newClass);
        
        // Update the class list without closing the modal
        refreshClassList(className);
        
        // Update the unscheduled classes list and progress in the main app
        if (window.renderUnscheduledClasses) {
            window.renderUnscheduledClasses();
            // Update progress if available
            if (typeof window.updateProgress === 'function') {
                window.updateProgress();
            }
        }
    } else {
        // Update existing class
        const selectedClass = window.dataManager?.getClasses().find(c => c.name === selectedClassName);
        if (selectedClass) {
            window.dataManager?.updateClass(selectedClass.name, { name: className, conflicts });
            
            // If name changed, update the selected element
            if (selectedClassName !== className && selectedElement) {
                selectedElement.textContent = className;
            }
            
            // Update the conflicts to match what we just saved
            const updatedClass = { name: className, conflicts };
            showClassDetails(updatedClass);
            
            // Update the unscheduled classes list and progress in the main app
            if (window.renderUnscheduledClasses) {
                window.renderUnscheduledClasses();
                // Update progress if available
                if (typeof window.updateProgress === 'function') {
                    window.updateProgress();
                }
            }
        }
    }
    
    // Show success message
    const action = isNewClass ? 'added' : 'updated';
    if (window.showMessage) {
        window.showMessage('success', `Class ${className} ${action} successfully`);
    }
    
    // Briefly flash the save button to indicate successful save
    const saveButton = document.getElementById('save-class-btn');
    if (saveButton) {
        const originalText = saveButton.textContent;
        saveButton.textContent = '✓ Saved';
        saveButton.classList.add('success-flash');
        
        setTimeout(() => {
            saveButton.textContent = originalText;
            saveButton.classList.remove('success-flash');
        }, 1500);
    }
});

// Delete class button handler
document.getElementById('delete-class-btn')?.addEventListener('click', function() {
    const selectedElement = document.querySelector('.class-item.selected');
    const selectedClassName = selectedElement?.textContent;
    
    if (!selectedClassName) return;
    
    // Check if the class is scheduled anywhere
    if (window.dataManager?.isClassScheduled(selectedClassName)) {
        if (window.showMessage) {
            window.showMessage('error', `Cannot delete ${selectedClassName} because it is scheduled. Unschedule it first.`);
        }
        return;
    }
    
    // Confirm deletion
    if (confirm(`Are you sure you want to delete ${selectedClassName}? This cannot be undone.`)) {
        // Delete the class
        window.dataManager?.deleteClass(selectedClassName);
        
        // Reload the class list by reopening the modal
        window.openClassManager();
        
        // Update the unscheduled classes list and progress in the main app
        if (window.renderUnscheduledClasses) {
            window.renderUnscheduledClasses();
            // Update progress if available
            if (typeof window.updateProgress === 'function') {
                window.updateProgress();
            }
        }
        
        // Show success message
        if (window.showMessage) {
            window.showMessage('success', `Class ${selectedClassName} deleted successfully`);
        }
    }
});