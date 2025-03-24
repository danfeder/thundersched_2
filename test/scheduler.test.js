import { createMockDataManager, createMockScheduler } from './test-setup.js';

describe('Scheduler', () => {
  let dataManager;
  let scheduler;

  beforeEach(() => {
    jest.useFakeTimers();
    dataManager = createMockDataManager();
    scheduler = createMockScheduler(dataManager);
  });

  describe('Class Placement Validation', () => {
    test('should validate basic placement', () => {
      const result = scheduler.isValidPlacement('Math 101', '2025-03-22', 3);
      expect(result.valid).toBe(true);
      expect(result.reason).toBeNull();
    });

    test('should detect class conflicts', async () => {
      jest.setTimeout(10000); // Increase timeout for async operations
      await dataManager.loadClassesFromCSV();
      
      // Tuesday period 3 is a conflict for Math 101
      const result = scheduler.isValidPlacement('Math 101', '2025-03-25', 3);
      expect(result).toEqual({
        valid: false,
        reason: 'Class has a conflict during this period'
      });
    });

    test('should detect teacher unavailability', () => {
      dataManager.markTeacherUnavailable('2025-03-22', 3);

      const result = scheduler.isValidPlacement('Math 101', '2025-03-22', 3);
      expect(result).toEqual({
        valid: false,
        reason: 'Teacher is unavailable during this period'
      });
    });

    test('should detect double booking', () => {
      dataManager.scheduleClass('Science 102', '2025-03-22', 3);

      const result = scheduler.isValidPlacement('Math 101', '2025-03-22', 3);
      expect(result).toEqual({
        valid: false,
        reason: 'Time slot is already occupied'
      });
    });
  });

  describe('Constraint Checking', () => {
    test('should check consecutive class limits', () => {
      const schedule = {
        '2025-03-22': {
          1: 'Math 101',
          2: 'Science 102',
          3: 'History 101',
          4: 'English 101'  // Exceeds maxConsecutiveClasses (3)
        }
      };

      const result = scheduler.checkConstraints(schedule);
      expect(result).toEqual({
        valid: false,
        violations: [{
          type: 'consecutive',
          date: '2025-03-22',
          details: 'Too many consecutive classes (max: 3)'
        }]
      });
    });

    test('should check daily class limits', () => {
      const schedule = {
        '2025-03-22': {
          1: 'Class 1',
          3: 'Class 2',
          4: 'Class 3',
          5: 'Class 4',
          6: 'Class 5',
          7: 'Class 6',
          8: 'Class 7'  // Exceeds maxClassesPerDay (6)
        }
      };

      const result = scheduler.checkConstraints(schedule);
      expect(result).toEqual({
        valid: false,
        violations: [{
          type: 'daily',
          date: '2025-03-22',
          details: 'Too many classes scheduled for this day (max: 6)'
        }]
      });
    });

    test('should check weekly class limits', () => {
      const schedule = {};
      const baseDate = new Date('2025-03-24'); // Monday
      
      // Schedule 26 classes (exceeds maxClassesPerWeek: 25)
      for (let day = 0; day < 5; day++) {
        const date = new Date(baseDate);
        date.setDate(baseDate.getDate() + day);
        const dateStr = dataManager.getFormattedDate(date);
        
        schedule[dateStr] = {
          1: `Class ${day}-1`,
          3: `Class ${day}-2`,
          5: `Class ${day}-3`,
          6: `Class ${day}-4`,
          8: `Class ${day}-5`
        };
      }
      schedule[dataManager.getFormattedDate(baseDate)][6] = 'Extra Class';

      const result = scheduler.checkConstraints(schedule);
      expect(result).toEqual({
        valid: false,
        violations: [{
          type: 'weekly',
          details: 'Too many classes scheduled for this week (max: 25)'
        }]
      });
    });

    test('should check minimum weekly classes', () => {
      const schedule = {
        '2025-03-24': { // Monday
          1: 'Class 1',
          2: 'Class 2'
        },
        '2025-03-25': { // Tuesday
          3: 'Class 3'
        }
      };

      const result = scheduler.checkConstraints(schedule);
      expect(result).toEqual({
        valid: false,
        violations: [{
          type: 'weekly',
          details: 'Not enough classes scheduled for this week (min: 15)'
        }]
      });
    });
  });

  describe('What-If Analysis', () => {
    test('should simulate constraint changes', async () => {
      const currentSchedule = {
        '2025-03-24': {
          1: 'Class 1',
          2: 'Class 2',
          3: 'Class 3',
          4: 'Class 4'  // Would violate new maxConsecutiveClasses (3)
        }
      };

      const newConstraints = {
        maxConsecutiveClasses: 3,
        maxClassesPerDay: 6,
        minClassesPerWeek: 15,
        maxClassesPerWeek: 25
      };

      const simulation = await scheduler.simulateConstraintChanges(
        currentSchedule,
        dataManager.getConfig(),
        newConstraints
      );

      expect(simulation).toEqual({
        valid: false,
        invalidPlacements: [{
          className: 'Class 4',
          date: '2025-03-24',
          period: 4,
          reason: 'Would violate consecutive class limit'
        }],
        impactedClasses: ['Class 4'],
        suggestedChanges: [{
          className: 'Class 4',
          from: { date: '2025-03-24', period: 4 },
          to: { date: '2025-03-24', period: 6 }
        }]
      });
    });

    test('should validate constraint combinations', () => {
      const result = scheduler.validateConstraintCombination({
        maxConsecutiveClasses: 4,
        maxClassesPerDay: 3  // Invalid: maxClassesPerDay < maxConsecutiveClasses
      });

      expect(result).toEqual({
        valid: false,
        reason: 'Maximum classes per day cannot be less than maximum consecutive classes'
      });
    });
  });

  describe('Schedule Generation', () => {
    test('should suggest next class placement', () => {
      const suggestion = scheduler.suggestNextClass();
      
      expect(suggestion).toEqual({
        className: 'Math 101',
        date: '2025-03-22',
        period: 3
      });
    });

    test('should generate valid schedule suggestions', () => {
      const suggestions = scheduler.generateScheduleSuggestions();

      expect(suggestions).toEqual({
        valid: true,
        schedule: {
          '2025-03-24': { 1: 'Math 101', 3: 'Science 102' },
          '2025-03-25': { 2: 'History 101' }
        },
        unscheduledClasses: []
      });

      // Verify the suggested schedule follows all constraints
      expect(scheduler.checkConstraints(suggestions.schedule).valid).toBe(true);
    });
  });
});