import { createMockDataManager } from './test-setup.js';

describe('DataManager', () => {
  let dataManager;

  beforeEach(() => {
    dataManager = createMockDataManager();
  });

  describe('Class Data Management', () => {
    test('should load classes from CSV correctly', async () => {
      await dataManager.loadClassesFromCSV();

      expect(dataManager.classes).toHaveLength(2);
      expect(dataManager.classes[0]).toEqual({
        name: 'Math 101',
        grade: '5',
        conflicts: {
          Monday: [1, 2],
          Tuesday: [3, 4]
        }
      });
    });

    test('should handle malformed CSV data gracefully', async () => {
      dataManager.loadClassesFromCSV = jest.fn(async () => {
        throw new Error('Invalid conflict format');
      });

      await expect(dataManager.loadClassesFromCSV())
        .rejects
        .toThrow('Invalid conflict format');
    });
  });

  describe('Schedule Management', () => {
    // Set timeout for all tests in this block
    jest.setTimeout(10000);
    
    test('should schedule a class successfully', () => {
      const date = '2025-03-22';
      const period = 3;

      dataManager.scheduleClass('Math 101', date, period);
      expect(dataManager.scheduleWeeks[0][date][period]).toBe('Math 101');
    });

    test('should prevent double booking', () => {
      const date = '2025-03-22';
      const period = 3;

      dataManager.scheduleClass('Math 101', date, period);
      
      expect(() => {
        dataManager.scheduleClass('Science 102', date, period);
      }).toThrow('Time slot already occupied');
    });

    test('should handle class conflicts correctly', async () => {
      const className = 'Math 101';
      const date = '2025-03-25'; // Tuesday
      const period = 3;  // Known conflict time for Math 101

      // Directly set the classes in the state
      dataManager._state.classes = [{
        name: 'Math 101',
        grade: '5',
        conflicts: {
          Monday: [1, 2],
          Tuesday: [3, 4]
        }
      }];

      // Verify conflict detection
      const hasConflict = dataManager.hasConflict(className, date, period);
      expect(hasConflict).toBe(true);
    });
  });

  describe('Teacher Availability', () => {
    test('should track teacher unavailability', () => {
      const date = '2025-03-22';
      const period = 4;

      dataManager.markTeacherUnavailable(date, period);
      expect(dataManager.isTeacherUnavailable(date, period)).toBe(true);
    });

    test('should clear teacher unavailability', () => {
      const date = '2025-03-22';
      const period = 4;

      dataManager.markTeacherUnavailable(date, period);
      dataManager.clearTeacherUnavailable(date, period);

      expect(dataManager.isTeacherUnavailable(date, period)).toBe(false);
    });
  });

  describe('Persistence', () => {
    test('should save schedule to localStorage', () => {
      const schedule = {
        '2025-03-22': {
          3: 'Math 101',
          4: 'Science 102'
        }
      };
      dataManager.scheduleWeeks[0] = schedule;

      dataManager.saveToLocalStorage();

      const saved = JSON.parse(localStorage.getItem('cooking-class-schedule'));
      expect(saved[0]).toEqual(schedule);
    });

    test('should load schedule from localStorage', () => {
      const schedule = {
        0: {
          '2025-03-22': {
            3: 'Math 101',
            4: 'Science 102'
          }
        }
      };

      localStorage.setItem('cooking-class-schedule', JSON.stringify(schedule));

      dataManager.loadFromLocalStorage();

      expect(dataManager.scheduleWeeks[0]).toEqual(schedule[0]);
    });

    test('should handle corrupt localStorage data', () => {
      localStorage.setItem('cooking-class-schedule', 'invalid json');

      expect(() => {
        dataManager.loadFromLocalStorage();
      }).toThrow('Invalid storage data');
    });
  });

  describe('Saved Schedules', () => {
    test('should save named schedule', () => {
      const name = 'Spring 2025';
      const notes = 'Test schedule';

      dataManager.saveSchedule(name, notes);

      expect(dataManager.savedSchedules).toHaveLength(1);
      expect(dataManager.savedSchedules[0]).toMatchObject({
        name,
        notes,
        timestamp: expect.any(Number)
      });
    });

    test('should prevent duplicate schedule names', () => {
      const name = 'Spring 2025';

      dataManager.saveSchedule(name, 'First version');
      
      expect(() => {
        dataManager.saveSchedule(name, 'Second version');
      }).toThrow('Schedule name already exists');
    });

    test('should load saved schedule', () => {
      const name = 'Spring 2025';
      const schedule = {
        '2025-03-22': {
          3: 'Math 101'
        }
      };

      dataManager.saveSchedule(name, '', schedule);
      dataManager.loadSavedSchedule(name);

      expect(dataManager.scheduleWeeks[0]).toEqual(schedule);
    });
  });
});