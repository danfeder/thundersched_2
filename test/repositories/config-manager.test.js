import { jest } from '@jest/globals';
import { ConfigManager } from '../../src/repositories/config-manager.js';
import { createMockDataStore, createMockPersistenceService } from '../test-setup.js';

describe('ConfigManager', () => {
  let configManager;
  let mockDataStore;
  let mockPersistenceService;

  beforeEach(() => {
    mockDataStore = createMockDataStore();
    mockPersistenceService = createMockPersistenceService();
    // Instantiate the *real* ConfigManager with mocks
    configManager = new ConfigManager(mockDataStore, mockPersistenceService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  // Tests moved from data-manager.test.js will go here...

  test('should be defined', () => {
    expect(configManager).toBeDefined();
  });

});