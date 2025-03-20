#!/bin/bash

# Run-Tests Script for Cooking Class Scheduler
# This script launches a local web server to test the application

echo "Starting test environment for Cooking Class Scheduler..."

# Determine the appropriate Python command
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    echo "Error: Python is not installed. Please install Python to run the test server."
    exit 1
fi

# Define the port to use
PORT=8000

# Check if the port is already in use
if nc -z localhost $PORT 2>/dev/null; then
    echo "Warning: Port $PORT is already in use. Choose a different port or close the existing process."
    read -p "Enter a different port number (or press Ctrl+C to exit): " PORT
fi

echo "Launching web server on port $PORT..."
echo "Access the application at: http://localhost:$PORT/test.html"
echo ""
echo "Available test pages:"
echo "- Main Test Application: http://localhost:$PORT/test.html"
echo "- Function Tester: http://localhost:$PORT/test-runner.html"
echo "- Data Inspector: http://localhost:$PORT/data-inspector.html"
echo "- Test Plan: http://localhost:$PORT/test-plan.md"
echo ""
echo "Press Ctrl+C to stop the server"

# Start the server
$PYTHON_CMD -m http.server $PORT