import { DataManager } from './data.js';
import { Scheduler } from './scheduler.js';
import EventHandlerService from './event-handler-service.js';
import uiManagerInstance from './ui-manager.js';
import ConfigController from './config-controller.js';
import SaveLoadController from './save-load-controller.js';
import AnalyticsController from './analytics-controller.js';
import WhatIfController from './what-if-controller.js';
// Assuming solver wrapper might need import if not handled globally/passed
import ConstraintSolverWrapper from './solver-wrapper.js';
// AnalyticsController already imports analytics.js

class AppInitializer {
    constructor() {
        console.log("AppInitializer created");
        this.dataManager = null;
        this.scheduler = null;
        this.uiManager = null;
        this.eventHandlerService = null;
        this.configController = null;
        this.saveLoadController = null;
        this.analyticsController = null;
        this.whatIfController = null;
        this.solverWrapper = null; // To hold the solver instance/static class
    }

    async initialize() {
        console.log("App Initializing...");

        // Instantiate core services and UI Manager
        // Create DataManager first (temporarily without scheduler)
        this.dataManager = new DataManager();
                this.uiManager = uiManagerInstance;
        // Create Scheduler, passing the DataManager
        this.scheduler = new Scheduler(this.dataManager);
        // Now, set the scheduler instance on the DataManager
        this.dataManager.scheduler = this.scheduler;
        // Use the imported ConstraintSolverWrapper (assuming static methods or needs init)
        this.solverWrapper = ConstraintSolverWrapper;

        // Instantiate Controllers, passing dependencies
        this.configController = new ConfigController(this.dataManager, this.scheduler, this.uiManager);
        // Pass configController to SaveLoadController for dialogs
        this.saveLoadController = new SaveLoadController(this.dataManager, this.scheduler, this.uiManager, this.configController);
        this.analyticsController = new AnalyticsController(this.dataManager, this.uiManager);
        // Pass necessary components to WhatIfController
        this.whatIfController = new WhatIfController(this.dataManager, this.uiManager, this.solverWrapper, this.configController);

        // Instantiate EventHandlerService, passing core services AND controllers
        this.eventHandlerService = new EventHandlerService(
             this.dataManager,
             this.scheduler,
             this.configController,
             this.saveLoadController,
             this.analyticsController,
             this.whatIfController
        );
        
        // Set dependencies on the UIManager instance using the new method
        if (this.uiManager && typeof this.uiManager.setDependencies === 'function') {
                          this.uiManager.setDependencies(this.dataManager, this.eventHandlerService);
                     } else {
             console.error("Failed to load UIManager instance or setDependencies method not found.");
             return; // Cannot proceed without UIManager
        }

        // --- Start of moved code from app.js DOMContentLoaded ---

        console.log('DOM fully loaded'); // Already logged by initializer
        
        // TODO: Remove Globals - These should be accessed via dependency injection
        // window.dataManager = this.dataManager;
        // window.scheduler = this.scheduler;
        
        // Set up direct event handlers for What-If functionality after a short delay
        // TODO: Move this to a WhatIfController later
        setTimeout(function() {
            console.log('Setting up direct What-If button handlers...');
            const simulateBtn = document.getElementById('what-if-simulate-btn');
            if (simulateBtn) {
                console.log('Adding direct click handler for simulation button');
                simulateBtn.addEventListener('click', function(event) {
                    console.log('Simulate button clicked (direct handler from app-initializer.js)');
                    if (typeof window.runWhatIfSimulation === 'function') {
                        window.runWhatIfSimulation();
                    }
                    event.stopPropagation();
                }, true); 
            } else {
                console.warn('Simulation button not found in DOM yet');
            }
        }, 2000);
        
        // TODO: Remove Globals - Debug helper removed
        // window.debugScheduler = { ... };
        
        // TODO: Remove Globals - Persistence helpers removed (should be handled by DataManager/PersistenceService)
        // window.saveScheduleToLocalStorage = function() { ... };
        // window.saveTeacherUnavailabilityToLocalStorage = function() { ... };

        // Global state for teacher mode (temporary - should move to state management or controller)
        let teacherModeActive = false; 
        
        // Load class data from CSV
        await this.dataManager.loadClassesFromCSV();
        
        // uiEventHandlers object is now obsolete as handlers are in EventHandlerService
    
        // --- Define handlers needed by rendering functions (TEMPORARILY EMPTY/ADAPTED) ---
        // TODO: These handlers need to be moved or managed by EventHandlerService/Controllers
        // Note: renderHandlers are passed to renderScheduleGrid/renderUnscheduledClasses,
        // but the drag handlers themselves are now attached via initializeUI using the eventHandlerService instance.
        // const renderHandlers = { ... }; // Obsolete object removed
    
        // UI structure is now initialized within the first call to renderScheduleGrid.
        // this.uiManager.initializeUI(this.eventHandlerService); // Removed call
    
        // Render initial state using the UIManager instance
        // Pass scheduler and teacherModeActive state directly
                this.uiManager.renderScheduleGrid(this.scheduler, teacherModeActive);
                this.uiManager.renderUnscheduledClasses(this.scheduler); // Pass scheduler
        this.uiManager.updateProgress();
        this.uiManager.updateConstraintStatus(this.scheduler);
        
        // Show welcome message
        this.uiManager.showMessage('info', 'Welcome! Click on a class to see available slots, then drag and drop to schedule it.', 6000);

        // Attach global listeners using the EventHandlerService
                this.eventHandlerService.attachGlobalListeners();
    
        // The listeners below are now attached within EventHandlerService.attachGlobalListeners()
        // document.getElementById('suggest-next-btn')?.addEventListener('click', ...);
        // document.getElementById('export-btn')?.addEventListener('click', ...);
        // document.getElementById('help-btn')?.addEventListener('click', ...);
        // document.getElementById('reset-btn')?.addEventListener('click', ...);
        // document.getElementById('config-btn')?.addEventListener('click', ...);
        // document.getElementById('save-schedule-btn')?.addEventListener('click', ...);
        // document.getElementById('load-schedule-btn')?.addEventListener('click', ...);
        // document.getElementById('analytics-btn')?.addEventListener('click', ...);
        
        // TODO: Remove Globals - WhatIfAnalysis object removed (functionality moved to WhatIfController)
        // console.log('Exposing What-If Analysis functions to global scope (temporary)');
        // window.whatIfAnalysis = { ... };
        // console.log('What-If Analysis functions exposed (partially - needs refactoring):', Object.keys(window.whatIfAnalysis));
        
        // Teacher mode toggle listener is now attached within EventHandlerService.attachGlobalListeners()
        // const teacherModeToggle = document.getElementById('teacher-mode');
        // if (teacherModeToggle) {
        //     teacherModeToggle.addEventListener('change', ...);
        // }
        
        // Week navigation listeners are now attached within EventHandlerService.attachGlobalListeners()
        // document.getElementById('prev-week-btn')?.addEventListener('click', ...);
        // document.getElementById('next-week-btn')?.addEventListener('click', ...);
        
        // Date picker change event listener is now attached within EventHandlerService.attachGlobalListeners()
        // const datePicker = document.getElementById('start-date');
        // if (datePicker) {
        //      datePicker.addEventListener('change', ...);
        // }
        
        // Initialize date picker with default start date
        const startDatePicker = document.getElementById('start-date');
        if (startDatePicker) {
            const formattedStartDate = this.dataManager.getFormattedDate(this.dataManager.scheduleStartDate);
            console.log("Setting date picker to:", formattedStartDate);
            startDatePicker.value = formattedStartDate;
        }
        
        // Display current week
        this.uiManager.updateCurrentWeekDisplay();
        
        // Temporary listener code removed - functionality moved to controllers/services
        // (Config form, reset button, modal closes, save form)

        // --- End of moved code ---

        console.log("App Initialization complete (logic moved).");
    }
}

// Instantiate and initialize on script load
const appInitializer = new AppInitializer();
document.addEventListener('DOMContentLoaded', () => {
    appInitializer.initialize().catch(error => {
        console.error("Error during app initialization:", error);
        const body = document.querySelector('body');
        if (body) {
            body.innerHTML = '<h1 style="color: red;">Application failed to initialize. Please check the console.</h1>';
        }
    });
});

// export default appInitializer; // No default export needed if run on load