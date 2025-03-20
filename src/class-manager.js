// Class Manager functionality

// Function to handle CSV import
function importCSVClasses() {
    try {
        // Check if the input element exists, create it if it doesn't
        let fileInput = document.getElementById('csv-file-input');
        
        if (!fileInput) {
            fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.id = 'csv-file-input';
            fileInput.accept = '.csv';
            fileInput.style.display = 'none';
            document.body.appendChild(fileInput);
            
            // Add event listener for when a file is selected
            fileInput.addEventListener('change', function(e) {
                if (e.target.files.length === 0) return;
                
                const file = e.target.files[0];
                const reader = new FileReader();
                
                reader.onload = function(event) {
                    try {
                        const csvText = event.target.result;
                        
                        // Parse CSV data
                        if (window.dataManager) {
                            const classData = window.dataManager.parseCSVData(csvText);
                            
                            // Check if there are any classes in the CSV
                            if (classData.length === 0) {
                                showModalErrorMessage('No valid classes found in the CSV file');
                                return;
                            }
                            
                            // Ask for confirmation if there are existing classes
                            const existingClasses = window.dataManager.getClasses();
                            
                            let shouldProceed = true;
                            if (existingClasses.length > 0) {
                                shouldProceed = confirm(`You have ${existingClasses.length} existing classes. Importing will replace them. Continue?`);
                            }
                            
                            if (shouldProceed) {
                                // Replace existing classes with imported ones
                                window.dataManager.classes = classData;
                                
                                // Save to localStorage
                                localStorage.setItem('cooking-classes', JSON.stringify(classData));
                                
                                // Refresh the class list
                                refreshClassList();
                                
                                // Update the unscheduled classes list and progress in the main app
                                if (window.renderUnscheduledClasses) {
                                    window.renderUnscheduledClasses();
                                    if (typeof window.updateProgress === 'function') {
                                        window.updateProgress();
                                    }
                                }
                                
                                // Show success message
                                if (window.showMessage) {
                                    window.showMessage('success', `Successfully imported ${classData.length} classes from CSV`);
                                }
                            }
                        } else {
                            showModalErrorMessage('Data manager not available. Cannot import classes.');
                        }
                    } catch (error) {
                        console.error('Error processing CSV file:', error);
                        showModalErrorMessage('Error processing CSV file: ' + error.message);
                    }
                };
                
                reader.onerror = function() {
                    showModalErrorMessage('Error reading the CSV file');
                };
                
                reader.readAsText(file);
            });
        }
        
        // Trigger file selection dialog
        fileInput.click();
    } catch (error) {
        console.error('Error in CSV import:', error);
        showModalErrorMessage('Error importing CSV: ' + error.message);
    }
}

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
    
    // Check for mixed grade classes with commas (like "K, 1, 2-417" or "3, 4, 5-518")
    if (classInfo.name.includes(',') && classInfo.name.includes('-')) {
        grade = 'mixed';
    } else if (classInfo.name.includes('-')) {
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

// Function to show an error message within the modal
function showModalErrorMessage(message) {
    // Check if there's already an error message container
    let errorContainer = document.querySelector('.modal-error-message');
    
    if (!errorContainer) {
        // Create a new error container if it doesn't exist
        errorContainer = document.createElement('div');
        errorContainer.className = 'modal-error-message';
        
        // Insert it at the top of the class editor
        const classEditor = document.querySelector('.class-editor');
        if (classEditor && classEditor.firstChild) {
            classEditor.insertBefore(errorContainer, classEditor.firstChild);
        } else {
            // Fallback to append to modal content
            const modalContent = document.querySelector('.class-manager-content');
            if (modalContent) {
                modalContent.appendChild(errorContainer);
            }
        }
    }
    
    // Set the error message
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
    
    // Hide the error message after a few seconds
    setTimeout(() => {
        errorContainer.style.display = 'none';
    }, 5000);
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
        
        if (grade === 'mixed') {
            // For mixed grade, generate a name like "K, 1, 2-XXX" or "3, 4, 5-XXX"
            // Get a count of existing mixed grade classes to generate a number
            const mixedClasses = existingClasses.filter(c => c.name.includes(',') && c.name.includes('-'));
            const classNumber = mixedClasses.length + 1;
            
            // Default to "K, 1, 2" mix for new mixed classes - can be edited after creation
            className = `K, 1, 2-${400 + classNumber}`;
        } else {
            // For regular single-grade classes
            const gradeClasses = existingClasses.filter(c => c.name.startsWith(grade));
            const classNumber = gradeClasses.length + 1;
            className = `${grade}-${300 + classNumber}`;
        }
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
        // Show error message in the modal
        showModalErrorMessage(`Cannot delete ${selectedClassName} because it is scheduled. Unschedule it first.`);
        
        // Also show in the main app if available
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

// Import CSV button handler
document.getElementById('import-csv-btn')?.addEventListener('click', function() {
    importCSVClasses();
});

// Save Class Collection button handler
document.getElementById('save-class-collection-btn')?.addEventListener('click', function() {
    showSaveClassCollectionModal();
});

// Load Class Collection button handler
document.getElementById('load-class-collection-btn')?.addEventListener('click', function() {
    showLoadClassCollectionModal();
});

// Save Class Collection form submission handler
document.getElementById('save-class-collection-form')?.addEventListener('submit', function(e) {
    e.preventDefault();
    handleSaveClassCollectionSubmit();
});

// Flag to prevent duplicate submissions
let isSavingClassCollection = false;

// Function to show the save class collection modal
function showSaveClassCollectionModal() {
    // Check if there are any classes to save
    if (!window.dataManager || window.dataManager.getClasses().length === 0) {
        if (window.showMessage) {
            window.showMessage('error', 'No classes to save. Please add at least one class first.');
        } else {
            showModalErrorMessage('No classes to save. Please add at least one class first.');
        }
        return;
    }
    
    // Reset form
    const modal = document.getElementById('save-class-collection-modal');
    const form = document.getElementById('save-class-collection-form');
    form.reset();
    
    // Suggest a default name
    document.getElementById('class-collection-name').value = 
        "Class Collection " + (window.dataManager.savedClassCollections.length + 1);
    
    // Show modal
    modal.style.display = 'block';
    
    // Focus on name field
    document.getElementById('class-collection-name').focus();
}

// Function to handle save class collection form submission
function handleSaveClassCollectionSubmit() {
    // Prevent duplicate submissions
    if (isSavingClassCollection) {
        console.log('Already processing a save request');
        return;
    }
    
    isSavingClassCollection = true;
    
    const name = document.getElementById('class-collection-name').value.trim();
    if (!name) {
        showModalErrorMessage('Please enter a collection name.');
        isSavingClassCollection = false;
        return;
    }
    
    // Check for duplicate names
    const isDuplicateName = window.dataManager.savedClassCollections.some(collection => 
        collection.name.toLowerCase() === name.toLowerCase()
    );
    
    if (isDuplicateName) {
        showModalErrorMessage(`A collection named "${name}" already exists. Please use a different name.`);
        isSavingClassCollection = false;
        return;
    }
    
    const description = document.getElementById('class-collection-description').value.trim();
    console.log('Saving class collection with name:', name, 'description:', description);
    
    // Create a unique ID
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const timestamp = new Date().toISOString();
    
    // Create a deep copy of the classes
    const savedCollection = {
        id,
        name,
        description,
        createdAt: timestamp,
        lastModified: timestamp,
        classData: JSON.parse(JSON.stringify(window.dataManager.classes))
    };
    
    // Add to saved class collections
    if (window.dataManager.addSavedClassCollection(savedCollection)) {
        // Hide modal
        document.getElementById('save-class-collection-modal').style.display = 'none';
        
        // Show success message
        if (window.showMessage) {
            window.showMessage('success', `Class collection "${name}" saved successfully.`);
        } else {
            showModalErrorMessage(`Class collection "${name}" saved successfully.`, 'success');
        }
    }
    
    // Reset the saving flag
    isSavingClassCollection = false;
}

// Function to show the load class collection modal
function showLoadClassCollectionModal() {
    const modal = document.getElementById('load-class-collection-modal');
    const listContainer = document.getElementById('saved-class-collections-list');
    
    // Debug log saved class collections
    console.log('Showing load class collection modal. Saved collections:', window.dataManager.savedClassCollections);
    
    // Clear existing list
    listContainer.innerHTML = '';
    
    if (!window.dataManager.savedClassCollections || window.dataManager.savedClassCollections.length === 0) {
        console.log('No saved class collections found');
        listContainer.innerHTML = '<div class="empty-message">No saved class collections found.</div>';
    } else {
        // Create list items for each saved class collection
        window.dataManager.savedClassCollections.forEach(collection => {
            const item = document.createElement('div');
            item.className = 'saved-schedule-item';
            
            const dateOptions = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
            const formattedDate = new Date(collection.createdAt).toLocaleDateString(undefined, dateOptions);
            const formattedModified = collection.lastModified && collection.lastModified !== collection.createdAt ? 
                new Date(collection.lastModified).toLocaleDateString(undefined, dateOptions) : null;
            
            item.innerHTML = `
                <div class="schedule-info">
                    <h3>${collection.name}</h3>
                    <p class="schedule-date">Created: ${formattedDate}</p>
                    ${formattedModified ? `<p class="schedule-modified">Modified: ${formattedModified}</p>` : ''}
                    <p class="schedule-description">${collection.description || 'No description'}</p>
                    <p class="schedule-stats">
                        ${collection.classData.length} classes in this collection
                    </p>
                </div>
                <div class="schedule-actions">
                    <button class="btn btn-small preview-collection-btn" data-id="${collection.id}">Preview</button>
                    <button class="btn btn-small load-collection-btn" data-id="${collection.id}">Load</button>
                    <button class="btn btn-small btn-danger delete-collection-btn" data-id="${collection.id}">Delete</button>
                </div>
            `;
            
            listContainer.appendChild(item);
        });
        
        // Add event listeners
        document.querySelectorAll('.preview-collection-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const collectionId = e.target.dataset.id;
                previewClassCollection(collectionId);
            });
        });
        
        document.querySelectorAll('.load-collection-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const collectionId = e.target.dataset.id;
                modal.style.display = 'none';
                loadClassCollection(collectionId);
            });
        });
        
        document.querySelectorAll('.delete-collection-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const collectionId = e.target.dataset.id;
                if (confirm('Are you sure you want to delete this saved class collection? This cannot be undone.')) {
                    deleteClassCollection(collectionId);
                    // Re-render the list
                    showLoadClassCollectionModal();
                }
            });
        });
    }
    
    modal.style.display = 'block';
}

// Function to preview a class collection
function previewClassCollection(id) {
    const collection = window.dataManager.getSavedClassCollectionById(id);
    if (!collection) {
        if (window.showMessage) {
            window.showMessage('error', 'Could not find the saved class collection.');
        } else {
            showModalErrorMessage('Could not find the saved class collection.');
        }
        return;
    }
    
    // For now, just show an alert with the collection details
    // In a full implementation, this would show a modal with a detailed view
    alert(`Preview of "${collection.name}"\n\nDescription: ${collection.description || 'None'}\n\nContains ${collection.classData.length} classes.`);
}

// Function to load a class collection
function loadClassCollection(id) {
    const collection = window.dataManager.getSavedClassCollectionById(id);
    if (!collection) {
        if (window.showMessage) {
            window.showMessage('error', 'Could not find the saved class collection.');
        } else {
            showModalErrorMessage('Could not find the saved class collection.');
        }
        return;
    }
    
    // Check if there are any existing classes
    const hasExistingClasses = window.dataManager.getClasses().length > 0;
    
    // Check if any existing classes are scheduled
    const hasScheduledClasses = hasExistingClasses && 
                               window.dataManager.getClasses().some(classInfo => 
                                   window.dataManager.isClassScheduled(classInfo.name));
    
    if (hasExistingClasses) {
        // Show conflict resolution dialog if there are existing classes
        showClassCollectionConflictDialog(collection, hasScheduledClasses);
    } else {
        // No existing classes, load directly
        applyLoadedClassCollection(collection, 'replace');
    }
}

// Function to delete a class collection
function deleteClassCollection(id) {
    const collection = window.dataManager.getSavedClassCollectionById(id);
    if (!collection) return;
    
    const name = collection.name;
    
    if (window.dataManager.deleteSavedClassCollection(id)) {
        if (window.showMessage) {
            window.showMessage('success', `Class collection "${name}" deleted.`);
        } else {
            showModalErrorMessage(`Class collection "${name}" deleted.`, 'success');
        }
    } else {
        if (window.showMessage) {
            window.showMessage('error', `Failed to delete class collection "${name}". Please try again.`);
        } else {
            showModalErrorMessage(`Failed to delete class collection "${name}". Please try again.`);
        }
    }
}

// Function to show the conflict resolution dialog when loading a class collection
function showClassCollectionConflictDialog(collection, hasScheduledClasses) {
    const modal = document.getElementById('class-collection-conflict-modal');
    const contentEl = document.getElementById('class-collection-conflict-details');
    
    // Build the content based on whether there are scheduled classes
    let content = `
        <p>You already have ${window.dataManager.getClasses().length} classes defined in your system.</p>
    `;
    
    if (hasScheduledClasses) {
        content += `
            <div class="conflict-warning">
                <p><strong>Warning:</strong> Some of your current classes are scheduled in the calendar. 
                Replacing or modifying them could affect your current schedule.</p>
            </div>
        `;
    }
    
    content += `
        <h3>Options:</h3>
        <p>How would you like to load this class collection?</p>
    `;
    
    contentEl.innerHTML = content;
    
    // Set up action buttons
    const actionsEl = document.getElementById('class-collection-conflict-actions');
    actionsEl.innerHTML = '';
    
    // Full replace button
    const replaceBtn = document.createElement('button');
    replaceBtn.className = 'btn';
    replaceBtn.textContent = 'Replace All Classes';
    replaceBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        applyLoadedClassCollection(collection, 'replace');
    });
    actionsEl.appendChild(replaceBtn);
    
    // Merge (add new only) button
    const mergeBtn = document.createElement('button');
    mergeBtn.className = 'btn';
    mergeBtn.textContent = 'Add New Classes Only';
    mergeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        applyLoadedClassCollection(collection, 'add_new');
    });
    actionsEl.appendChild(mergeBtn);
    
    // Smart merge button
    const smartMergeBtn = document.createElement('button');
    smartMergeBtn.className = 'btn';
    smartMergeBtn.textContent = 'Smart Merge (Update Existing)';
    smartMergeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        applyLoadedClassCollection(collection, 'smart_merge');
    });
    actionsEl.appendChild(smartMergeBtn);
    
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

// Function to apply a loaded class collection
function applyLoadedClassCollection(collection, mode) {
    try {
        const currentClasses = window.dataManager.getClasses();
        let newClasses = [];
        let updateStats = {
            added: 0,
            updated: 0,
            unchanged: 0,
            total: collection.classData.length
        };
        
        switch (mode) {
            case 'replace':
                // Complete replacement - use saved collection classes
                newClasses = JSON.parse(JSON.stringify(collection.classData));
                updateStats.added = newClasses.length;
                break;
                
            case 'add_new':
                // Keep current classes and only add new ones
                newClasses = [...currentClasses];
                
                // Go through saved collection and add classes that don't exist
                collection.classData.forEach(collectionClass => {
                    const existingClass = currentClasses.find(c => c.name === collectionClass.name);
                    if (!existingClass) {
                        newClasses.push(JSON.parse(JSON.stringify(collectionClass)));
                        updateStats.added++;
                    } else {
                        updateStats.unchanged++;
                    }
                });
                break;
                
            case 'smart_merge':
                // Keep current classes but update conflict periods for existing ones
                newClasses = [];
                
                // Process current classes first
                currentClasses.forEach(currentClass => {
                    const collectionClass = collection.classData.find(c => c.name === currentClass.name);
                    
                    if (collectionClass) {
                        // Class exists in both - merge conflicts
                        const mergedClass = {
                            name: currentClass.name,
                            conflicts: JSON.parse(JSON.stringify(collectionClass.conflicts))
                        };
                        newClasses.push(mergedClass);
                        updateStats.updated++;
                    } else {
                        // Class only exists in current - keep it
                        newClasses.push(JSON.parse(JSON.stringify(currentClass)));
                        updateStats.unchanged++;
                    }
                });
                
                // Now add any classes from collection that don't exist in current
                collection.classData.forEach(collectionClass => {
                    const existingClass = currentClasses.find(c => c.name === collectionClass.name);
                    if (!existingClass) {
                        newClasses.push(JSON.parse(JSON.stringify(collectionClass)));
                        updateStats.added++;
                    }
                });
                break;
        }
        
        // Update the classes in dataManager
        window.dataManager.classes = newClasses;
        
        // Save to localStorage
        localStorage.setItem('cooking-classes', JSON.stringify(newClasses));
        
        // Refresh the class list
        refreshClassList();
        
        // Update the unscheduled classes list and progress in the main app
        if (window.renderUnscheduledClasses) {
            window.renderUnscheduledClasses();
            if (typeof window.updateProgress === 'function') {
                window.updateProgress();
            }
        }
        
        // Show success message with stats
        let message = `Successfully loaded "${collection.name}" with `;
        if (updateStats.added > 0) message += `${updateStats.added} classes added`;
        if (updateStats.updated > 0) {
            if (updateStats.added > 0) message += `, `;
            message += `${updateStats.updated} classes updated`;
        }
        if (updateStats.unchanged > 0 && mode !== 'replace') {
            if (updateStats.added > 0 || updateStats.updated > 0) message += `, `;
            message += `${updateStats.unchanged} classes unchanged`;
        }
        
        if (window.showMessage) {
            window.showMessage('success', message);
        } else {
            showModalErrorMessage(message, 'success');
        }
        
    } catch (error) {
        console.error('Error applying loaded class collection:', error);
        if (window.showMessage) {
            window.showMessage('error', 'Failed to load class collection due to an error. Please try again.');
        } else {
            showModalErrorMessage('Failed to load class collection due to an error. Please try again.');
        }
    }
}

// Helper function to show a modal message with a specified type (error or success)
function showModalErrorMessage(message, type = 'error') {
    // Check if there's already an error message container
    let errorContainer = document.querySelector('.modal-error-message');
    
    if (!errorContainer) {
        // Create a new error container if it doesn't exist
        errorContainer = document.createElement('div');
        errorContainer.className = 'modal-error-message';
        
        // Insert it at the top of the class editor
        const classEditor = document.querySelector('.class-editor');
        if (classEditor && classEditor.firstChild) {
            classEditor.insertBefore(errorContainer, classEditor.firstChild);
        } else {
            // Fallback to append to modal content
            const modalContent = document.querySelector('.class-manager-content');
            if (modalContent) {
                modalContent.appendChild(errorContainer);
            }
        }
    }
    
    // Set appropriate class based on message type
    errorContainer.className = `modal-error-message ${type === 'success' ? 'success' : 'error'}`;
    
    // Set the message
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
    
    // Hide the message after a few seconds
    setTimeout(() => {
        errorContainer.style.display = 'none';
    }, 5000);
}