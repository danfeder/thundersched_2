# Manual Cooking Class Scheduler Assistant - Project Brief

## 1. Project Vision
- **Project Name**: Cooking Class Scheduler Assistant
- **Purpose**: Create an interactive assistant that helps users manually schedule cooking classes for 33 elementary school classes while visualizing and managing schedule constraints.
- **Desired Outcome**: A system that provides real-time guidance, validates scheduling decisions, and visualizes constraints as users build schedules, reducing errors and making the manual scheduling process more efficient.

## 2. Current Process & Available Data
- Currently scheduling is done manually on paper grids
- Class conflict data is available in CSV format showing:
  - Each of the 33 classes 
  - Five columns for weekdays (Monday-Friday)
  - Each cell contains period numbers when classes CANNOT be scheduled

## 3. Core Functionality

### Schedule Building Assistance
- Interactive interface for manually placing classes into schedule slots
- Real-time validation showing if a placement violates any constraints
- Visual indicators of available/valid slots when selecting a class to schedule
- Dashboard showing progress (scheduled vs. unscheduled classes)
- Suggest optimal placement options for each class

### Constraint Visualization
- **Teacher Availability Calendar**:
  - Allow teacher to block off specific periods, days, or date ranges
  - Visual distinction between hard conflicts and teacher preferences
- Visual indicators for:
  - When placing a class would create 3+ consecutive classes
  - When daily/weekly class limits would be exceeded
  - When a class is being scheduled in one of its conflict periods
- Option to show required break periods after classes

### Smart Suggestions
- "Suggest Next" feature to recommend which class to schedule next
- Highlight all valid time slots for a selected class
- "Validate Schedule" button to check entire schedule for constraint violations
- Warning when attempting to save a schedule with unresolved violations

### Data Import/Export
- Import conflict data from CSV file
- Export completed schedules to CSV format
- Generate printable calendar view

## 4. User Experience Requirements
- Drag-and-drop interface for placing classes into time slots
- Color-coded visualization of:
  - Scheduled classes
  - Classes with conflicts at selected time slot
  - Available slots for selected class
  - Teacher unavailability periods
- Filter view to show only available slots for a particular class
- Undo/redo functionality for schedule changes
- Split-screen view showing unscheduled classes and current schedule
- Weekly schedule view showing all scheduled classes

## 5. Data Requirements
- For each class, track:
  - Class name
  - Grade level
  - Conflict periods (by day and period)
- Teacher availability data:
  - Specific dates and periods when teacher is unavailable
  - Support for recurring unavailability patterns
- Schedule structure:
  - 8 periods per day
  - 5 days per week (Monday through Friday)
- Normal teaching load: 
  - 3-4 classes per day
  - 12-16 classes per week total

## 6. Technical Implementation Notes
- Focus on responsive, intuitive UI for non-technical users
- Prioritize real-time feedback on constraint violations
- Implement client-side validation for immediate user feedback
- Use simple visual cues (colors, icons) to indicate constraint status
- Store scheduling state to prevent data loss during session
- Ensure clear visual feedback when constraints cannot be satisfied
- Optimize for desktop/laptop use primarily

## 7. Interactive Scheduling Assistant Implementation

### Constraint Validation Approach
- Implement real-time validation logic that:
  1. Checks if placement violates class conflict periods
  2. Verifies against teacher unavailability
  3. Validates consecutive class limits
  4. Tracks daily and weekly class counts
  5. Enforces one-class-per-rotation rule

### Suggestion Engine
- Implement a lightweight suggestion engine that:
  - Identifies classes with the most constraints first
  - Highlights all valid placement options for a selected class
  - Suggests optimal placement based on current schedule state

### Implementation Phases

#### Phase 1: Core Manual Scheduling Interface
- Basic drag-and-drop scheduling interface
- Import of conflict data CSV
- Visual calendar representation
- Simple constraint violation indicators
- Basic export functionality

#### Phase 2: Enhanced Assistance Features
- Add smart suggestions functionality
- Implement advanced visualization of constraints
- Add undo/redo capability
- Create detailed constraint violation reporting
- Add printable schedule views

#### Phase 3: Optimization Features (Future)
- Add partial automation capabilities:
  - "Auto-complete remaining" feature for classes with few constraints
  - Batch suggestions for multiple unscheduled classes
  - Optional full-schedule generation for comparison
- Schedule quality scoring
- Multiple schedule comparison views
- User login functionality
- Saving multiple schedule rotations for reference
- Grade-level grouping in schedules
- Tracking previous rotations and reporting

### Testing Strategy
- Focus on usability testing with actual end-users
- Test the responsiveness and accuracy of the constraint validation system
- Validate the usefulness of scheduling suggestions
- Ensure the interface is intuitive for non-technical users
- Test CSV import/export functionality with real data
- Verify that all visual indicators correctly represent the underlying constraints
