/**
 * Test Data Generator for Cooking Class Scheduler
 * 
 * This script generates a consistent set of test data for the cooking class scheduler
 * to enable reliable testing of the application.
 */

// Save this file and include it in your HTML after the main app scripts to load test data
// Use ?loadTestData=true as a URL parameter to trigger data loading

(function() {
    // Check if we should load test data
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.has('loadTestData') || urlParams.get('loadTestData') !== 'true') {
        console.log('Test data loading skipped. Add ?loadTestData=true to URL to load test data.');
        return;
    }

    console.log('Generating test data...');
    
    // Clear existing data
    localStorage.removeItem('cooking-class-schedule');
    localStorage.removeItem('cooking-classes');
    localStorage.removeItem('teacher-unavailability');
    
    // Use the same class data as the main application
    const testClasses = [
        { name: "PK207", conflicts: { "Monday": [2], "Tuesday": [2], "Wednesday": [4], "Thursday": [3], "Friday": [1, 3] } },
        { name: "PK214", conflicts: { "Monday": [2, 5], "Tuesday": [3, 5], "Wednesday": [1, 5], "Thursday": [5, 7], "Friday": [2, 3, 5] } },
        { name: "PK208", conflicts: { "Monday": [2, 5], "Tuesday": [7, 5], "Wednesday": [2, 5], "Thursday": [2, 5], "Friday": [3, 5, 7] } },
        { name: "PK213", conflicts: { "Monday": [2, 6], "Tuesday": [1, 6], "Wednesday": [6, 8], "Thursday": [2, 6], "Friday": [3, 4, 6] } },
        { name: "K-313", conflicts: { "Monday": [1], "Tuesday": [4], "Wednesday": [2, 4], "Thursday": [4], "Friday": [8] } },
        { name: "K-309", conflicts: { "Monday": [1], "Tuesday": [7], "Wednesday": [2, 7], "Thursday": [3], "Friday": [1] } },
        { name: "K-311", conflicts: { "Monday": [1], "Tuesday": [7], "Wednesday": [2, 7], "Thursday": [1], "Friday": [3] } },
        { name: "1-407", conflicts: { "Monday": [2], "Tuesday": [1], "Wednesday": [1], "Thursday": [2, 4], "Friday": [7] } },
        { name: "1-409", conflicts: { "Monday": [4], "Tuesday": [1], "Wednesday": [3], "Thursday": [2, 5], "Friday": [4] } },
        { name: "2-411", conflicts: { "Monday": [7], "Tuesday": [2, 8], "Wednesday": [1], "Thursday": [8], "Friday": [2] } },
        { name: "3-418", conflicts: { "Monday": [8], "Tuesday": [3], "Wednesday": [3, 8], "Thursday": [1], "Friday": [8] } },
        { name: "4-509", conflicts: { "Monday": [1], "Tuesday": [8], "Wednesday": [3], "Thursday": [3, 8], "Friday": [1] } }
    ];
    
    // Save test classes to local storage
    localStorage.setItem('cooking-classes', JSON.stringify(testClasses));
    
    // Generate sample schedule data
    const currentWeekDates = window.dataManager.getWeekDates(0);
    const nextWeekDates = window.dataManager.getWeekDates(1);
    
    // Format date strings for the current week
    const currentWeekDateStrings = [];
    for (let i = 0; i < currentWeekDates.length; i++) {
        currentWeekDateStrings.push(window.dataManager.getFormattedDate(currentWeekDates[i]));
    }
    
    // Format date strings for the next week
    const nextWeekDateStrings = [];
    for (let i = 0; i < nextWeekDates.length; i++) {
        nextWeekDateStrings.push(window.dataManager.getFormattedDate(nextWeekDates[i]));
    }
    
    // Create a sample schedule with a few classes scheduled
    const scheduleData = {
        "0": { // Current week
            [currentWeekDateStrings[0]]: { // Monday
                "3": "PK207",
                "5": "K-313"
            },
            [currentWeekDateStrings[1]]: { // Tuesday
                "4": "PK213",
                "7": "1-407"
            }
        },
        "1": { // Next week
            [nextWeekDateStrings[2]]: { // Wednesday
                "2": "PK214",
                "6": "2-411"
            },
            [nextWeekDateStrings[3]]: { // Thursday
                "5": "K-309",
                "7": "3-418"
            }
        }
    };
    
    // Save schedule data to local storage
    localStorage.setItem('cooking-class-schedule', JSON.stringify(scheduleData));
    
    // Generate teacher unavailability data
    const teacherUnavailability = {
        "0": { // Current week
            [currentWeekDateStrings[0]]: { // Monday
                "1": true,
                "2": true
            },
            [currentWeekDateStrings[4]]: { // Friday
                "7": true,
                "8": true
            }
        },
        "1": { // Next week
            [nextWeekDateStrings[1]]: { // Tuesday
                "3": true,
                "4": true
            },
            [nextWeekDateStrings[3]]: { // Thursday
                "6": true
            }
        }
    };
    
    // Save teacher unavailability data to local storage
    localStorage.setItem('teacher-unavailability', JSON.stringify(teacherUnavailability));
    
    console.log('Test data generation complete!');
    
    // Refresh the application if it's already loaded
    if (typeof window.initApp === 'function') {
        window.initApp();
    }
    
    // Alert the user that test data has been loaded
    setTimeout(() => {
        alert('Test data has been loaded successfully. The application has been populated with sample classes, schedules, and teacher unavailability data.');
    }, 500);
})();