import { jest } from '@jest/globals';
import { ScheduleRepository } from '../../src/repositories/schedule-repository.js';
import { createMockDataStore, createMockPersistenceService, createMockClassRepository } from '../test-setup.js';
import * as DateUtils from '../../src/date-utils.js'; // Import real DateUtils

describe('ScheduleRepository', () => {
  let scheduleRepository;
  let mockDataStore;
  let mockPersistenceService;
  let mockClassRepository;

  beforeEach(() => {
    mockDataStore = createMockDataStore();
    mockPersistenceService = createMockPersistenceService();
    // Note: ScheduleRepository needs ClassRepository, so we mock that too
    mockClassRepository = createMockClassRepository(mockDataStore, mockPersistenceService);
    // Instantiate the *real* ScheduleRepository with mocks
    scheduleRepository = new ScheduleRepository(mockDataStore, mockPersistenceService, mockClassRepository);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  // Tests moved from data-manager.test.js will go here...

  test('should be defined', () => {
    expect(scheduleRepository).toBeDefined();
  });

});