// Date Utility Functions

/**
 * Calculates the date of the next Monday. If today is Monday, it returns the following Monday.
 * @returns {Date} The date object representing the next Monday.
 */
export function getNextMonday() {
    const date = new Date();
    const day = date.getUTCDay(); // 0 is Sunday, 1 is Monday, etc. Use UTC
    // If today is Sunday (0), add 1 day to get to Monday
    // If today is Monday (1), add 7 days to get to next Monday
    // Otherwise, add days needed to get to next Monday
    const daysToAdd = day === 0 ? 1 : day === 1 ? 7 : 8 - day;
    date.setUTCDate(date.getUTCDate() + daysToAdd); // Use UTC
    // Set time to midnight UTC for consistency
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Gets the date of the Monday for the week containing the given date.
 * @param {Date} date - The date within the week of interest.
 * @returns {Date} The date object representing the Monday of that week.
 */
export function getMondayOfWeek(date) {
    const newDate = new Date(date); // Clone date
    const day = newDate.getUTCDay(); // Use UTC day
    // Calculate days to subtract to get to Monday
    // If Sunday (0), subtract 6 days. If Monday (1), subtract 0. Otherwise subtract (day - 1).
    const daysToSubtract = day === 0 ? 6 : day - 1;
    newDate.setUTCDate(newDate.getUTCDate() - daysToSubtract); // Use UTC
    // Set time to midnight UTC
    return new Date(Date.UTC(newDate.getUTCFullYear(), newDate.getUTCMonth(), newDate.getUTCDate()));
}

/**
 * Formats a Date object into YYYY-MM-DD string using UTC dates.
 * @param {Date} date - The date object to format.
 * @returns {string} The formatted date string.
 */
export function getFormattedDate(date) {
    if (!(date instanceof Date)) {
        console.warn("getFormattedDate received non-Date object:", date);
        date = new Date(date); // Attempt conversion
        if (isNaN(date)) return "Invalid Date"; // Handle invalid date conversion
    }
    // Using UTC methods to avoid timezone issues
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`; // YYYY-MM-DD
}

/**
 * Gets the name of the day (e.g., "Monday") from a Date object using UTC day.
 * @param {Date} date - The date object.
 * @returns {string} The name of the day.
 */
export function getDayFromDate(date) {
    if (!(date instanceof Date) || isNaN(date)) {
         console.warn("getDayFromDate received invalid Date object:", date);
         return "Invalid Day";
    }
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getUTCDay()]; // Use UTC day
}

/**
 * Generates an array of Date objects representing Monday to Friday for a given week offset.
 * @param {Date} scheduleStartDate - The starting Monday of the schedule (or week 0).
 * @param {number} [weekOffset=0] - The week offset from the scheduleStartDate.
 * @returns {Date[]} An array of Date objects for the weekdays.
 */
export function getWeekDates(scheduleStartDate, weekOffset = 0) {
    const weekDates = [];
    const baseStartDate = new Date(scheduleStartDate); // Clone base start date

    // Calculate the target week's start date by adding the offset
    const targetDate = new Date(baseStartDate);
    targetDate.setUTCDate(baseStartDate.getUTCDate() + weekOffset * 7); // Use UTC (Corrected variable name)

    // Find the Monday of that target week using the existing utility function
    const monday = getMondayOfWeek(targetDate);
    // Ensure time is set to midnight UTC (getMondayOfWeek already does this)
    // monday.setUTCHours(0, 0, 0, 0); // Not needed if getMondayOfWeek handles it

    for (let i = 0; i < 5; i++) { // Monday to Friday
        const date = new Date(monday);
        date.setUTCDate(monday.getUTCDate() + i); // Use UTC
        weekDates.push(date);
    }
    return weekDates;
}