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
    
    // Generate class data with conflicts
    const testClasses = [
        {
            name: "PK101",
            conflicts: {
                "Monday": [1, 2],     // Monday periods 1-2
                "Wednesday": [5, 6, 7, 8], // Wednesday periods 5-8
                "Friday": [3, 4]      // Friday periods 3-4
            }
        },
        {
            name: "PK102",
            conflicts: {
                "Monday": [3, 4],     // Monday periods 3-4
                "Tuesday": [1, 2],    // Tuesday periods 1-2
                "Thursday": [5, 6]    // Thursday periods 5-6
            }
        },
        {
            name: "K101",
            conflicts: {
                "Monday": [5, 6],     // Monday periods 5-6
                "Wednesday": [1, 2],  // Wednesday periods 1-2
                "Friday": [7, 8]      // Friday periods 7-8
            }
        },
        {
            name: "K102",
            conflicts: {
                "Tuesday": [5, 6],    // Tuesday periods 5-6
                "Thursday": [3, 4],   // Thursday periods 3-4
                "Friday": [1, 2]      // Friday periods 1-2
            }
        },
        {
            name: "1A",
            conflicts: {
                "Monday": [7, 8],     // Monday periods 7-8
                "Wednesday": [3, 4],  // Wednesday periods 3-4
                "Thursday": [1, 2]    // Thursday periods 1-2
            }
        },
        {
            name: "1B",
            conflicts: {
                "Tuesday": [3, 4],    // Tuesday periods 3-4
                "Wednesday": [7, 8],  // Wednesday periods 7-8
                "Friday": [5, 6]      // Friday periods 5-6
            }
        },
        {
            name: "2A",
            conflicts: {
                "Monday": [6, 7, 8],  // Monday periods 6-8
                "Tuesday": [7, 8],    // Tuesday periods 7-8
                "Thursday": [7, 8]    // Thursday periods 7-8
            }
        },
        {
            name: "2B",
            conflicts: {
                "Tuesday": [1, 2],    // Tuesday periods 1-2
                "Wednesday": [1, 2, 3], // Wednesday periods 1-3
                "Friday": [1, 2]      // Friday periods 1-2
            }
        }
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
                "3": "PK101",
                "5": "K101"
            },
            [currentWeekDateStrings[1]]: { // Tuesday
                "4": "PK102",
                "7": "1A"
            }
        },
        "1": { // Next week
            [nextWeekDateStrings[2]]: { // Wednesday
                "2": "K102",
                "6": "2A"
            },
            [nextWeekDateStrings[3]]: { // Thursday
                "5": "1B",
                "7": "2B"
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