// Import Jest's matchers
import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

// Make Jest available globally
global.jest = jest;

// Mock DataTransfer API
class DataTransfer {
  constructor() {
    this.data = {};
  }
  setData(type, data) {
    this.data[type] = data;
  }
  getData(type) {
    return this.data[type];
  }
  clearData() {
    this.data = {};
  }
}

// Create test event factory
global.createTestEvent = (type, options = {}) => {
  const event = new Event(type, { bubbles: true, cancelable: true, ...options });
  
  if (type.startsWith('drag') || type === 'drop') {
    event.dataTransfer = new DataTransfer();
    event.preventDefault = jest.fn();
    event.stopPropagation = jest.fn();
  }

  if (options.target) {
    Object.defineProperty(event, 'target', {
      value: options.target,
      enumerable: true
    });
  }

  return event;
};

// Mock browser APIs
global.window.localStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};

// Mock fetch API
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve('')
  })
);

// Set up common test data
global.testData = {
  mockDate: new Date('2025-03-22T12:00:00Z')
};

// Reset before each test
beforeEach(() => {
  jest.clearAllMocks();
  document.body.innerHTML = '';
  localStorage.clear();
});

// Clean up after each test
afterEach(() => {
  jest.restoreAllMocks();
});

// Mock timers
jest.useFakeTimers();