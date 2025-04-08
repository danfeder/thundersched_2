import { jest } from '@jest/globals';
import { ClassRepository } from '../../src/repositories/class-repository.js';
import { createMockDataStore, createMockPersistenceService } from '../test-setup.js';

describe('ClassRepository', () => {
  let classRepository;
  let mockDataStore;
  let mockPersistenceService;

  beforeEach(() => {
    mockDataStore = createMockDataStore();
    mockPersistenceService = createMockPersistenceService();
    // Instantiate the *real* ClassRepository with mocks
    classRepository = new ClassRepository(mockDataStore, mockPersistenceService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });


  // --- Tests adapted from data-manager.test.js --- 
  describe('ClassRepository Logic', () => {
      test('addClass should add a class if it does not exist', () => {
          const newClass = { name: 'Test Class', conflicts: {} };
          const result = classRepository.addClass(newClass);
          expect(mockDataStore.classes).toContainEqual(newClass);
          expect(mockPersistenceService.save).toHaveBeenCalledWith('cooking-classes', [newClass]);
          expect(result).toBe(true);
      });

      test('addClass should not add a class if it already exists', () => {
          const existingClass = { name: 'Test Class', conflicts: {} };
          mockDataStore.classes = [existingClass]; // Setup initial state
          const result = classRepository.addClass(existingClass);
          expect(mockDataStore.classes).toHaveLength(1);
          expect(mockPersistenceService.save).not.toHaveBeenCalled();
          expect(result).toBe(false);
      });

      test('updateClass should update an existing class', () => {
          const oldName = 'Old';
          const initialClass = { name: oldName, conflicts: {} };
          mockDataStore.classes = [initialClass]; // Setup initial state
          const updatedClass = { name: 'New', conflicts: { Monday: [1] } };
          const result = classRepository.updateClass(oldName, updatedClass);
          expect(mockDataStore.classes[0]).toEqual(updatedClass);
          expect(mockPersistenceService.save).toHaveBeenCalledWith('cooking-classes', [updatedClass]);
          // Assuming name change triggers schedule save
          expect(mockPersistenceService.save).toHaveBeenCalledWith('cooking-class-schedule', mockDataStore.scheduleWeeks);
          expect(result).toBe(true);
      });

       test('updateClass should return false if class not found', () => {
          const updatedClass = { name: 'New', conflicts: {} };
          const result = classRepository.updateClass('NonExistent', updatedClass);
          expect(mockPersistenceService.save).not.toHaveBeenCalled();
          expect(result).toBe(false);
      });

      test('deleteClass should remove an existing class if not scheduled', () => {
          const className = 'ToDelete';
          mockDataStore.classes = [{ name: className, conflicts: {} }]; // Setup state
          // Ensure class is not scheduled
          mockDataStore.scheduleWeeks = { 0: { '2025-03-24': { 1: 'Other Class' } } };
          const result = classRepository.deleteClass(className);
          expect(mockDataStore.classes).toHaveLength(0);
          expect(mockPersistenceService.save).toHaveBeenCalledWith('cooking-classes', []);
          expect(result).toBe(true);
      });

       test('deleteClass should not remove a class if it is scheduled', () => {
          const className = 'ScheduledClass';
          mockDataStore.classes = [{ name: className, conflicts: {} }]; // Setup state
          // Ensure class IS scheduled
          mockDataStore.scheduleWeeks = { 0: { '2025-03-24': { 1: className } } };
          const result = classRepository.deleteClass(className);
          expect(mockDataStore.classes).toHaveLength(1);
          expect(mockPersistenceService.save).not.toHaveBeenCalled();
          expect(result).toBe(false);
      });

       test('deleteClass should return false if class not found', () => {
          const result = classRepository.deleteClass('NotFound');
          expect(mockPersistenceService.save).not.toHaveBeenCalled();
          expect(result).toBe(false);
      });

      test('getClasses should return classes from DataStore', () => {
          const testClasses = [{ name: 'Test', conflicts: {} }];
          mockDataStore.classes = testClasses; // Setup state
          const result = classRepository.getClasses();
          expect(result).toEqual(testClasses);
      });

      test('isClassScheduled should return true if class is in scheduleWeeks', () => {
          const className = 'ToCheck';
          mockDataStore.scheduleWeeks = { 0: { '2025-03-24': { 1: className } } };
          const result = classRepository.isClassScheduled(className);
          expect(result).toBe(true);
      });

      test('isClassScheduled should return false if class is not in scheduleWeeks', () => {
          const className = 'NotScheduled';
          mockDataStore.scheduleWeeks = { 0: { '2025-03-24': { 1: 'Other' } } };
          const result = classRepository.isClassScheduled(className);
          expect(result).toBe(false);
      });

      // loadClassesFromCSV and loadClassesFromLocalStorage might need more involved tests
      // depending on their implementation (e.g., mocking fetch or file reads if applicable)
      // For now, just check they call persistence load
      test('loadClassesFromLocalStorage should call persistenceService.load', () => {
          classRepository.loadClassesFromLocalStorage();
          expect(mockPersistenceService.load).toHaveBeenCalledWith('cooking-classes');
      });

      test('getClassByName should return the correct class', () => {
          const class1 = { name: 'Yoga', conflicts: {} };
          const class2 = { name: 'Pilates', conflicts: {} };
          mockDataStore.classes = [class1, class2];
          const result = classRepository.getClassByName('Pilates');
          expect(result).toEqual(class2);
      });

       test('getClassByName should return undefined if not found', () => {
          const class1 = { name: 'Yoga', conflicts: {} };
          mockDataStore.classes = [class1];
          const result = classRepository.getClassByName('NotFound');
          expect(result).toBeUndefined();
      });

  });
  // Tests moved from data-manager.test.js will go here...

  test('should be defined', () => {
    expect(classRepository).toBeDefined();
  });

});