# CLAUDE.md - Cooking Class Scheduler Assistant

## Project Overview
This project is a manual cooking class scheduler that helps users schedule cooking classes for 33 elementary school classes while respecting schedule constraints.

## Current Implementation Status
- **Core Scheduling UI**: Implemented with drag-and-drop functionality
- **Multi-Week Scheduling**: Implemented with date-based navigation
- **Teacher Unavailability**: Implemented with togglable "Teacher Mode"
- **Class Manager**: Implemented with ability to add/edit/delete classes and their conflict periods
- **Constraint Visualization**: Implemented with color-coded feedback
- **CSV Data Integration**: Implemented for class conflict data
- **Analytics Dashboard**: Implemented read-only metrics and visualizations (Phase 1)
- **Schedule Insights**: Implemented basic insights and optimization suggestions (Phase 2)
- **What-If Analysis**: Implemented constraint simulation capabilities (Phase 3)

## Repository
- GitHub: https://github.com/danfeder/thundersched_2

## Project Structure
- **HTML**: index.html (main UI)
- **CSS**: 
  - css/styles.css: Main application styling
  - css/analytics.css: Analytics dashboard styling
- **JavaScript**:
  - src/data.js: Data management and persistence
  - src/scheduler.js: Scheduling logic and constraint validation
  - src/app.js: Main application and UI interaction
  - src/class-manager.js: Class definition and conflict management
  - src/analytics.js: Schedule analytics and optimization suggestions

## Key Features
1. **Interactive Scheduling Grid**:
   - Drag-and-drop interface
   - Real-time constraint validation
   - Visual feedback for conflicts and availability

2. **Multi-Week Support**:
   - Calendar-based week selection
   - Date navigation (prev/next week)
   - Persistent scheduling across weeks

3. **Teacher Mode**:
   - Toggle to mark periods when teacher is unavailable
   - Visual indicators for unavailable periods
   - Conflict validation for teacher availability

4. **Class Manager**:
   - Add, edit, and delete classes
   - Configure class conflict periods
   - Visual conflict grid for period selection

5. **Schedule Analytics**:
   - Schedule quality metrics (span, balance, utilization)
   - Visualizations (heatmap, period utilization, constraint pressure)
   - Insights on schedule patterns and efficiency
   - Optimization suggestions for improving schedule quality

## Data Structure
- **Classes**: 
  - name: Class identifier (e.g., "PK207")
  - conflicts: Object mapping weekdays to arrays of period numbers

- **Schedule**: 
  - Organized by week offset, date, and period
  - Stores class names in scheduled slots

- **Teacher Unavailability**:
  - Organized by week offset, date, and period
  - Boolean values indicating unavailable periods

## Safe Constraint Analytics Implementation
Following the phased approach from our implementation plan:

### Completed Phases
- **Phase 1: Read-Only Analytics Dashboard** ✅
  - Isolated metrics calculation without modifying core data
  - Data visualization of schedule quality 
  - Basic insights generation

- **Phase 2: Basic Insights and Suggestions** ✅
  - Actionable suggestions based on schedule analysis
  - UI for generating and displaying suggestions
  - Optimized threshold parameters for better suggestions

- **Phase 3: What-If Analysis** ✅
  - Constraint simulation capabilities
  - Impact analysis for constraint changes
  - Lazy-loaded constraint solver

### Upcoming Phases

- **Phase 4: Enhanced Visualizations and Optimization**
  - Advanced canvas-based visualizations
  - Specific optimization suggestions
  - Automated schedule improvement options

## Implementation Priorities
- [x] Core manual scheduling interface
- [x] Teacher unavailability tracking
- [x] Class management interface
- [x] Read-only analytics dashboard
- [x] Basic optimization suggestions
- [x] What-if constraint analysis
- [ ] Enhanced visualization and optimization

## Future Enhancements
1. **Smart Suggestions**:
   - "Suggest Next" to recommend which class to schedule
   - Highlight optimal placement options

2. **Schedule Optimization**:
   - Auto-complete for remaining classes
   - Schedule quality scoring
   - Multiple schedule comparison

3. **Enhanced Reports**:
   - Printable calendar views
   - Schedule statistics and analysis