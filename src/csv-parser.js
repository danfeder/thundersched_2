// CSV Parsing Utilities

/**
 * Parses a string containing conflict periods (e.g., "1, 3, 5") into an array of numbers.
 * @param {string} periodsString - The string representation of periods.
 * @returns {number[]} An array of period numbers. Returns empty array if input is empty or invalid.
 */
export function parseConflictPeriods(periodsString) {
    // Trim whitespace and remove any quotes
    const cleaned = (periodsString || "").toString().trim().replace(/"/g, '');
    
    // If empty, return an empty array
    if (!cleaned) return [];
    
    // Split by comma and convert to numbers, filtering out any NaN results
    return cleaned.split(',')
        .map(period => parseInt(period.trim(), 10))
        .filter(num => !isNaN(num));
}

/**
 * Parses a single row of CSV text, handling quoted fields containing commas.
 * @param {string} row - The CSV row string.
 * @returns {string[]} An array of values from the row.
 */
export function parseCSVRow(row) {
    const values = [];
    let insideQuotes = false;
    let currentValue = '';
    
    for (let i = 0; i < row.length; i++) {
        const char = row[i];
        
        if (char === '"') {
            // Check for escaped quotes ("")
            if (insideQuotes && row[i + 1] === '"') {
                currentValue += '"'; // Add one quote
                i++; // Skip the next quote
            } else {
                insideQuotes = !insideQuotes;
            }
        } else if (char === ',' && !insideQuotes) {
            values.push(currentValue.trim()); // Trim whitespace from value
            currentValue = '';
        } else {
            currentValue += char;
        }
    }
    
    values.push(currentValue.trim()); // Add the last value and trim
    return values;
}

/**
 * Parses the entire CSV text content into an array of class data objects.
 * @param {string} csvText - The full CSV text content.
 * @returns {object[]} An array of objects, each representing a class with its name and conflicts.
 * Example: [{ name: "Class A", conflicts: { Monday: [1, 2], ... } }, ...]
 */
export function parseCSVData(csvText) {
    // Split the CSV text into lines and remove any empty lines
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    
    // Skip the header row if it exists
    const dataRows = lines.length > 0 && lines[0].toLowerCase().includes('class') ? lines.slice(1) : lines;
    
    const classData = [];
    
    // Process each row
    for (const row of dataRows) {
        // Use our CSV row parser to handle quoted values correctly
        const values = parseCSVRow(row);
        
        if (values.length >= 6) { // Class name + 5 days of the week
            const className = values[0].trim();
            
            // Skip row if class name is empty
            if (!className) continue; 

            const conflicts = {
                "Monday": parseConflictPeriods(values[1]),
                "Tuesday": parseConflictPeriods(values[2]),
                "Wednesday": parseConflictPeriods(values[3]),
                "Thursday": parseConflictPeriods(values[4]),
                "Friday": parseConflictPeriods(values[5])
            };
            
            classData.push({ name: className, conflicts });
        } else {
            console.warn(`Skipping malformed CSV row: ${row}`);
        }
    }
    
    return classData;
}