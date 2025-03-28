/**
 * UIManager
 * Handles direct DOM manipulation, rendering, and UI updates.
 */
class UIManager {
    constructor() {
        // Cache frequently accessed elements if necessary (or select when needed)
        this.messageArea = document.getElementById('message-area');
        // Add other element selections here as needed
    }

    /**
     * Creates an element with a specified tag name, class name, and optional text content.
     * @param {string} tagName - The HTML tag name (e.g., 'div', 'button').
     * @param {string} className - The CSS class name(s) to apply.
     * @param {string} [textContent=''] - Optional text content for the element.
     * @returns {HTMLElement} The created element.
     */
    createElementWithClass(tagName, className, textContent = '') {
        const element = document.createElement(tagName);
        element.className = className;
        element.textContent = textContent;
        return element;
    }

    /**
     * Displays a message to the user in the message area.
     * @param {'info' | 'success' | 'warning' | 'error'} type - The type of message.
     * @param {string} message - The message text.
     * @param {number} [duration=4000] - How long to display the message (in ms). 0 for permanent.
     */
    showMessage(type, message, duration = 4000) {
        if (!this.messageArea) {
            console.error("Message area not found");
            return;
        }
        // Clear previous message classes
        this.messageArea.className = 'message-area'; // Reset classes

        // Add the new message type
        this.messageArea.classList.add(type);
        this.messageArea.classList.add('visible');
        this.messageArea.textContent = message;

        // Auto-hide after duration if duration is positive
        if (duration > 0) {
            // Clear any existing timer
            if (this.messageArea.timer) {
                clearTimeout(this.messageArea.timer);
            }
            this.messageArea.timer = setTimeout(() => {
                this.messageArea.classList.remove('visible');
                this.messageArea.timer = null; // Clear timer reference
            }, duration);
        }
    }

    // --- Other UI/Rendering methods will be moved here ---
    // initializeUI(...) {}
    // renderScheduleGrid(...) {}
    // renderUnscheduledClasses(...) {}
    // highlightAvailableSlots(...) {}
    // clearHighlights() {}
    // updateProgress(...) {}
    // updateCurrentWeekDisplay(...) {}
    // updateConstraintStatus(...) {}
    // showModal(modalId) {}
    // hideModal(modalId) {}
    // populateConfigForm(config) {}
    // populateSavedScheduleList(schedules) {}
    // etc.
}

// Export an instance or the class depending on desired usage pattern
// Using a single instance might be simpler for now
const uiManager = new UIManager();
export default uiManager;
// Or export the class: export default UIManager;