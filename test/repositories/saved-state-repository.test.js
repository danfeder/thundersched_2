import { jest } from '@jest/globals';
import { SavedStateRepository } from '../../src/repositories/saved-state-repository.js';
import { createMockDataStore, createMockPersistenceService } from '../test-setup.js';
import * as DateUtils from '../../src/date-utils.js'; // Import real DateUtils for migration logic

describe('SavedStateRepository', () => {
  let savedStateRepository;
  let mockDataStore;
  let mockPersistenceService;

  beforeEach(() => {
    mockDataStore = createMockDataStore();
    mockPersistenceService = createMockPersistenceService();
    // Instantiate the *real* SavedStateRepository with mocks
    savedStateRepository = new SavedStateRepository(mockDataStore, mockPersistenceService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  // Tests moved from data-manager.test.js will go here...

  test('should be defined', () => {
    expect(savedStateRepository).toBeDefined();
  });

});