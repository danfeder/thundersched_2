import { DataManager } from './data.js';
import { Scheduler } from './scheduler.js';
import EventHandlerService from './event-handler-service.js';
import { UIManager } from './ui-manager.js'; // Import the class
import ConfigController from './config-controller.js';
import SaveLoadController from './save-load-controller.js';
import AnalyticsController from './analytics-controller.js';
import WhatIfController from './what-if-controller.js';
// Assuming solver wrapper might need import if not handled globally/passed
import ConstraintSolverWrapper from './solver-wrapper.js';
import { getFormattedDate } from './date-utils.js'; // Import date utility
// AnalyticsController already imports analytics.js

export class AppInitializer { // Add export
    // Accept dependencies via constructor
    constructor(dependencies = {}) {
        console.log("AppInitializer created with dependencies:", Object.keys(dependencies));
        // Use provided instances or create new ones if not provided
        this.dataManager = dependencies.dataManager || new DataManager(); // DataManager still needed for non-schedule repo access
        const scheduleRepository = this.dataManager.scheduleRepository; // Get the repo instance
        const classRepository = this.dataManager.classRepository; // Get the class repo instance

        // Pass scheduleRepository AND dataManager to Scheduler constructor
        this.scheduler = dependencies.scheduler || new Scheduler(scheduleRepository, this.dataManager);
        // Ensure scheduler is set on dataManager if created here (still needed for validateExistingScheduleAgainstConstraints)
        if (!dependencies.dataManager && !dependencies.scheduler && this.dataManager) {
             this.dataManager.scheduler = this.scheduler;
        }
        this.uiManager = dependencies.uiManager || new UIManager(); // Instantiate UIManager
        this.solverWrapper = dependencies.solverWrapper || ConstraintSolverWrapper;
        // Instantiate controllers, passing dependencies (use the instances we just determined)
        // ConfigController needs scheduleRepo, scheduler, uiManager, and dataManager (for config)
        this.configController = dependencies.configController || new ConfigController(this.dataManager, this.scheduler, this.uiManager, scheduleRepository);
        // SaveLoadController still uses dataManager for now until SavedStateRepository is done
        this.saveLoadController = dependencies.saveLoadController || new SaveLoadController(this.dataManager, this.scheduler, this.uiManager, this.configController);
        // AnalyticsController needs scheduleRepo, classRepo, uiManager, AND dataManager (for getConfig)
        this.analyticsController = dependencies.analyticsController || new AnalyticsController(scheduleRepository, classRepository, this.uiManager, this.dataManager);
        // WhatIfController needs scheduleRepo, uiManager, solverWrapper, configController, dataManager, classRepository, AND scheduler
        this.whatIfController = dependencies.whatIfController || new WhatIfController(scheduleRepository, this.uiManager, this.solverWrapper, this.configController, this.dataManager, classRepository, this.scheduler); // Added scheduler
        // Instantiate EventHandlerService last, ensuring correct argument order
        this.eventHandlerService = dependencies.eventHandlerService || new EventHandlerService(
             scheduleRepository,     // 1st: scheduleRepository
             this.scheduler,         // 2nd: scheduler
             this.uiManager,         // 3rd: uiManager
             this.configController,    // 4th: configController
             this.saveLoadController,  // 5th: saveLoadController
             this.analyticsController, // 6th: analyticsController
             this.whatIfController     // 7th: whatIfController
        );
    }

    async initialize() {
        console.log("App Initializing...");
        // Dependencies are now set in the constructor.
        // Ensure scheduler is set on dataManager if they were created internally.
        if (this.dataManager && this.scheduler && !this.dataManager.scheduler) {
             // This check might be redundant if constructor logic is correct, but safe to keep.
             this.dataManager.scheduler = this.scheduler;
             console.log("Internal scheduler instance set on internal dataManager instance (in initialize).");
        }
        
        // Set dependencies on the UIManager instance using the new method
        // Pass scheduleRepository AND dataManager
        if (this.uiManager && typeof this.uiManager.setDependencies === 'function') {
                          this.uiManager.setDependencies(this.dataManager.scheduleRepository, this.dataManager, this.scheduler, this.eventHandlerService);
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
        // setTimeout(function() {
        //     console.log('Setting up direct What-If button handlers...');
        //     const simulateBtn = document.getElementById('what-if-simulate-btn');
        //     if (simulateBtn) {
        //         console.log('Adding direct click handler for simulation button');
        //         simulateBtn.addEventListener('click', function(event) {
        //             console.log('Simulate button clicked (direct handler from app-initializer.js)');
        //             if (typeof window.runWhatIfSimulation === 'function') {
        //                 window.runWhatIfSimulation();
        //             }
        //             event.stopPropagation();
        //         }, true);
        //     } else {
        //         console.warn('Simulation button not found in DOM yet');
        //     }
        // }, 2000); // Temporarily commented out to prevent test timeouts
        
        // TODO: Remove Globals - Debug helper removed
        // window.debugScheduler = { ... };
        
        // TODO: Remove Globals - Persistence helpers removed (should be handled by DataManager/PersistenceService)
        // window.saveScheduleToLocalStorage = function() { ... };
        // window.saveTeacherUnavailabilityToLocalStorage = function() { ... };

        // Global state for teacher mode (temporary - should move to state management or controller)
        let teacherModeActive = false;
        
        // Load class data from CSV via the repository
        await this.dataManager.classRepository.loadClassesFromCSV();
        
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
            const formattedStartDate = getFormattedDate(this.dataManager.dataStore.scheduleStartDate); // Access via dataStore
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
// Now we don't pass dependencies here, assuming real instances are desired in production
const appInitializerInstance = new AppInitializer();
window.appInitializer = appInitializerInstance; // Expose globally for temporary access
document.addEventListener('DOMContentLoaded', () => {
    appInitializerInstance.initialize().catch(error => {
        console.error("Error during app initialization:", error);
        const body = document.querySelector('body');
        if (body) {
            body.innerHTML = '<h1 style="color: red;">Application failed to initialize. Please check the console.</h1>';
        }
    });
});

// export default appInitializer; // No default export needed if run on load