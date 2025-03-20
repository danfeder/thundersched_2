# Cooking Class Scheduler Assistant

A simple, interactive tool to help schedule cooking classes while managing constraints and teacher availability.

## Features

- Interactive drag-and-drop interface for class scheduling
- Real-time validation of class placements based on constraints
- Visualization of conflicts and available time slots
- "Suggest Next" feature to recommend which class to schedule next
- Export functionality to save completed schedules as CSV

## How to Use

1. Open `index.html` in your web browser
2. Click on a class in the sidebar to see available slots (green) and conflicts (red)
3. Drag and drop the class onto an available slot in the schedule grid
4. Use the "Suggest Next Class" button to get recommendations on which class to schedule next
5. Double-click on a scheduled class to remove it
6. Use the "Export Schedule" button to download your completed schedule as a CSV file

## Project Structure

- `index.html` - Main application page
- `css/styles.css` - Styling for the application
- `src/data.js` - Data handling and CSV parsing
- `src/scheduler.js` - Scheduling logic and constraint validation
- `src/app.js` - Main application logic and UI interactions

## Scheduling Rules

- Classes cannot be scheduled during their conflict periods
- Maximum of 4 classes per day
- No more than 2 consecutive classes (to avoid 3+ in a row)
- Weekly teaching load: 12-16 classes total

## Future Enhancements

- Teacher availability calendar
- Multiple schedule comparisons
- Auto-complete functionality for classes with few constraints
- Enhanced reporting and analytics