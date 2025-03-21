# Cooking Class Scheduler Test Plan

## 1. Class Manager Synchronization Tests

### Test 1.1: Adding a New Class
1. Click "Manage Classes" to open the Class Manager
2. Click "Add New Class"
3. Enter a class name (e.g., "Test Class 1")
4. Select a grade level
5. Mark some conflict periods 
6. Click "Save Class"
7. Close the Class Manager
8. **Expected Result**: The new class should appear in the "Unscheduled Classes" list

### Test 1.2: Editing an Existing Class
1. Click "Manage Classes"
2. Select an existing class from the list
3. Change the class name (e.g., append "Modified")
4. Modify some conflict periods
5. Click "Save Class"
6. Close the Class Manager
7. **Expected Result**: The modified class should appear with updated name in the "Unscheduled Classes" list

### Test 1.3: Deleting an Unscheduled Class
1. Ensure a class is unscheduled
2. Click "Manage Classes"
3. Select the unscheduled class
4. Click "Delete Class"
5. Confirm deletion
6. **Expected Result**: The class should be removed from the "Unscheduled Classes" list

### Test 1.4: Attempting to Delete a Scheduled Class
1. Schedule a class by dragging it to the schedule grid
2. Click "Manage Classes"
3. Select the scheduled class
4. Click "Delete Class"
5. **Expected Result**: Error message stating that scheduled classes cannot be deleted

## 2. Date Display Tests

### Test 2.1: Initial Week Display
1. Load the application
2. **Expected Result**: The current week's date range should display correctly above the schedule grid

### Test 2.2: Week Navigation
1. Click "Next Week" button
2. **Expected Result**: The date range should correctly advance by 7 days
3. Click "Prev Week" button
4. **Expected Result**: The date range should return to the previous week's dates

### Test 2.3: Date Picker
1. Click on the date picker
2. Select a date two weeks in the future
3. **Expected Result**: The week display should show the correct date range for the week containing the selected date

### Test 2.4: Week Display Across Month Boundaries
1. Navigate to a week that crosses a month boundary (e.g., Jan 29 - Feb 4)
2. **Expected Result**: The date range should correctly display the month transition

## 3. Class Conflict and Teacher Unavailability Tests

### Test 3.1: Teacher Unavailability Marking
1. Toggle "Teacher Mode" on
2. Click several empty time slots to mark them as unavailable
3. **Expected Result**: The selected slots should display a yellow background with an X

### Test 3.2: Preserving Teacher Unavailability
1. With Teacher Mode on and some slots marked as unavailable
2. Click on an unscheduled class
3. **Expected Result**: The unavailable slots should remain marked even as available slots highlight in green

### Test 3.3: Class Conflict Prioritization
1. Set up a class with conflicts during specific periods
2. Mark some of the same periods as teacher unavailable
3. Click on the class
4. **Expected Result**: Conflict periods should be shown in red, regardless of teacher availability

### Test 3.4: Scheduling in Teacher Unavailable Periods
1. Toggle Teacher Mode on and mark some periods as unavailable
2. Drag a class toward a teacher unavailable period (but not a class conflict period)
3. **Expected Result**: A confirmation dialog should appear asking whether to override teacher unavailability

### Test 3.5: Scheduling in Class Conflict Periods
1. Try to drag a class to a period where it has a conflict
2. **Expected Result**: The class should not be allowed to be scheduled there (no confirmation dialog should appear)

### Test 3.6: Combined Constraints
1. Create a scenario where a period has both a class conflict and teacher unavailability
2. Try to drag the class to that period
3. **Expected Result**: The class should not be schedulable there, with the class conflict taking precedence (no confirmation dialog)

## 4. Multi-Week Persistence Tests

### Test 4.1: Schedule Persistence Across Weeks
1. Schedule several classes in the current week
2. Navigate to a different week
3. Return to the original week
4. **Expected Result**: All scheduled classes should still be in place

### Test 4.2: Teacher Unavailability Persistence
1. Mark several periods as teacher unavailable
2. Navigate to a different week
3. Return to the original week
4. **Expected Result**: All teacher unavailability markings should be preserved

### Test 4.3: Combined Week Scheduling
1. Schedule some classes in week 1
2. Navigate to week 2
3. Schedule different classes in week 2
4. Navigate back and forth between weeks
5. **Expected Result**: Each week should maintain its own schedule independently

## 5. Progress Tracking Tests

### Test 5.1: Progress Bar Update
1. Note the initial progress (e.g., "0 of 33 classes scheduled")
2. Schedule several classes
3. **Expected Result**: The progress bar and text should update correctly (e.g., "5 of 33 classes scheduled")

### Test 5.2: Progress After Class Management
1. Note the current progress
2. Open Class Manager and add a new class
3. **Expected Result**: The progress denominator should increase and text should update

### Test 5.3: Progress After Deletion
1. Delete an unscheduled class through the Class Manager
2. **Expected Result**: The progress denominator should decrease and text should update