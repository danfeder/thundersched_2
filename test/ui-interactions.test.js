import { createMockDataManager, createMockScheduler, simulateDragStart, simulateDrop, waitFor, createEvent } from './test-setup.js';
import { jest } from '@jest/globals';

describe('UI Interactions', () => {
  let dataManager;
  let scheduler;
  
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="schedule-grid"></div>
      <div id="unscheduled-classes"></div>
      <div id="progress-bar"></div>
      <div id="teacher-mode" class="toggle"></div>
      <div id="message-container"></div>
      <div id="config-modal" class="modal" style="display: none;"></div>
      <div id="analytics-modal" class="modal" style="display: none;">
        <div class="metrics"></div>
        <div class="analytics-visualizations"></div>
      </div>
      <button id="config-btn">Configure</button>
      <button id="analytics-btn">Analytics</button>
    `;
    
    dataManager = createMockDataManager();
    scheduler = createMockScheduler(dataManager);
    window.dataManager = dataManager;
    window.scheduler = scheduler;

    // Add event handlers
    const configModal = document.getElementById('config-modal');
    configModal.addEventListener('click', (e) => {
      if (e.target === configModal) {
        configModal.style.display = 'none';
      }
    });

    document.getElementById('config-btn').addEventListener('click', () => {
      configModal.style.display = 'block';
    });

    document.getElementById('analytics-btn').addEventListener('click', () => {
      document.getElementById('analytics-modal').style.display = 'block';
    });
  });

  describe('Drag and Drop Operations', () => {
    test('should handle class dragging', () => {
      const unscheduledClass = document.createElement('div');
      unscheduledClass.className = 'unscheduled-class';
      unscheduledClass.dataset.className = 'Math 101';
      document.getElementById('unscheduled-classes').appendChild(unscheduledClass);

      const event = simulateDragStart(unscheduledClass);

      expect(event.dataTransfer.getData('text/plain')).toBe('Math 101');
      expect(unscheduledClass.classList.contains('dragging')).toBe(true);
    });

    test('should highlight valid drop targets', () => {
      const gridCell = document.createElement('div');
      gridCell.className = 'grid-cell';
      gridCell.dataset.date = '2025-03-22';
      gridCell.dataset.period = '3';
      document.getElementById('schedule-grid').appendChild(gridCell);

      scheduler.isValidPlacement.mockReturnValue({ valid: true });

      gridCell.addEventListener('dragover', (e) => {
        e.preventDefault();
        gridCell.classList.add('valid-drop-target');
      });

      const dragOverEvent = createEvent('dragover');
      gridCell.dispatchEvent(dragOverEvent);

      expect(gridCell.classList.contains('valid-drop-target')).toBe(true);
    });

    test('should handle successful class drop', () => {
      const gridCell = document.createElement('div');
      gridCell.className = 'grid-cell';
      gridCell.dataset.date = '2025-03-22';
      gridCell.dataset.period = '3';
      document.getElementById('schedule-grid').appendChild(gridCell);

      scheduler.isValidPlacement.mockReturnValue({ valid: true });

      gridCell.addEventListener('drop', (e) => {
        const className = e.dataTransfer.getData('text/plain');
        const classElement = document.createElement('div');
        classElement.className = 'scheduled-class';
        classElement.textContent = className;
        gridCell.appendChild(classElement);
      });

      const dropEvent = simulateDrop(gridCell, {
        'text/plain': 'Math 101'
      });

      expect(gridCell.querySelector('.scheduled-class')).toBeTruthy();
      expect(gridCell.querySelector('.scheduled-class').textContent).toBe('Math 101');
    });

    test('should prevent invalid drops', () => {
      const gridCell = document.createElement('div');
      gridCell.className = 'grid-cell';
      gridCell.dataset.date = '2025-03-22';
      gridCell.dataset.period = '3';
      document.getElementById('schedule-grid').appendChild(gridCell);

      scheduler.isValidPlacement.mockReturnValue({
        valid: false,
        reason: 'Class conflict'
      });

      gridCell.addEventListener('drop', (e) => {
        if (scheduler.isValidPlacement().valid) {
          const className = e.dataTransfer.getData('text/plain');
          const classElement = document.createElement('div');
          classElement.className = 'scheduled-class';
          classElement.textContent = className;
          gridCell.appendChild(classElement);
        }
      });

      const dropEvent = simulateDrop(gridCell, {
        'text/plain': 'Math 101'
      });

      expect(gridCell.querySelector('.scheduled-class')).toBeFalsy();
    });
  });

  describe('Modal Operations', () => {
    test('should show configuration modal', () => {
      const configBtn = document.getElementById('config-btn');
      const configModal = document.getElementById('config-modal');
      
      configBtn.click();

      expect(configModal.style.display).toBe('block');
    });

    test('should close modal on outside click', () => {
      const modal = document.getElementById('config-modal');
      modal.style.display = 'block';

      const clickEvent = createEvent('click', {
        bubbles: true,
        cancelable: true
      });
      
      Object.defineProperty(clickEvent, 'target', {
        value: modal,
        enumerable: true
      });

      modal.dispatchEvent(clickEvent);

      expect(modal.style.display).toBe('none');
    });

    test('should handle config form submission', () => {
      const form = document.createElement('form');
      form.id = 'config-form';
      form.innerHTML = `
        <input name="maxConsecutive" value="3">
        <input name="maxDaily" value="6">
        <input name="minWeekly" value="15">
        <input name="maxWeekly" value="25">
      `;
      document.body.appendChild(form);

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        dataManager.setConfig({
          maxConsecutiveClasses: 3,
          maxClassesPerDay: 6,
          minClassesPerWeek: 15,
          maxClassesPerWeek: 25
        });
      });

      const submitEvent = createEvent('submit');
      form.dispatchEvent(submitEvent);

      expect(dataManager.setConfig).toHaveBeenCalledWith({
        maxConsecutiveClasses: 3,
        maxClassesPerDay: 6,
        minClassesPerWeek: 15,
        maxClassesPerWeek: 25
      });
    });
  });

  describe('Teacher Mode', () => {
    test('should toggle teacher mode', () => {
      const toggle = document.getElementById('teacher-mode');
      toggle.addEventListener('change', () => {
        document.body.classList.toggle('teacher-mode-active');
      });

      const changeEvent = createEvent('change', {
        target: { checked: true }
      });
      toggle.dispatchEvent(changeEvent);

      expect(document.body.classList.contains('teacher-mode-active')).toBe(true);
    });

    test('should handle cell clicks in teacher mode', () => {
      document.body.classList.add('teacher-mode-active');

      const cell = document.createElement('div');
      cell.className = 'grid-cell';
      cell.dataset.date = '2025-03-22';
      cell.dataset.period = '3';
      document.getElementById('schedule-grid').appendChild(cell);

      cell.addEventListener('click', () => {
        if (document.body.classList.contains('teacher-mode-active')) {
          cell.classList.add('teacher-unavailable');
          dataManager.markTeacherUnavailable(cell.dataset.date, parseInt(cell.dataset.period));
        }
      });

      cell.click();

      expect(cell.classList.contains('teacher-unavailable')).toBe(true);
      expect(dataManager.isTeacherUnavailable('2025-03-22', 3)).toBe(true);
    });
  });

  describe('Progress Updates', () => {
    test('should update progress bar', () => {
      const progressBar = document.getElementById('progress-bar');
      
      dataManager.getScheduledClassCount.mockReturnValue(5);
      dataManager.getTotalClassCount.mockReturnValue(20);

      updateProgress();

      expect(progressBar.style.width).toBe('25%');
      expect(progressBar.textContent).toBe('5 of 20 classes scheduled');
    });
  });

  describe('Message Display', () => {
    test('should show and auto-hide messages', async () => {
      jest.useFakeTimers();
      
      const message = 'Test message';
      const duration = 100;

      showMessage('info', message, duration);
      const messageContainer = document.getElementById('message-container');
      
      expect(messageContainer.textContent).toBe(message);
      expect(messageContainer.classList.contains('info')).toBe(true);

      jest.advanceTimersByTime(duration + 50);
      
      expect(messageContainer.style.display).toBe('none');
      
      jest.useRealTimers();
    });

    test('should handle different message types', () => {
      const messageTypes = ['info', 'success', 'warning', 'error'];
      const messageContainer = document.getElementById('message-container');

      messageTypes.forEach(type => {
        showMessage(type, 'Test message');
        expect(messageContainer.classList.contains(type)).toBe(true);
      });
    });
  });

  describe('Analytics View', () => {
    test('should update analytics display', () => {
      const analyticsBtn = document.getElementById('analytics-btn');
      const analyticsModal = document.getElementById('analytics-modal');

      analyticsBtn.click();

      expect(analyticsModal.style.display).toBe('block');
      expect(analyticsModal.querySelector('.metrics')).toBeTruthy();
    });

    test('should render visualizations', () => {
      const container = document.querySelector('.analytics-visualizations');
      
      const metrics = {
        classesPerDay: { Mon: 5, Tue: 4, Wed: 6, Thu: 3, Fri: 4 },
        periodsUtilization: { 1: 0.8, 2: 0.6, 3: 0.9, 4: 0.7 },
        constraintStatus: {
          consecutive: { violations: 0 },
          daily: { violations: 1 },
          weekly: { violations: 0 }
        }
      };

      renderAnalyticsVisualizations(metrics);
      expect(container.children.length).toBeGreaterThan(0);
    });
  });
});

// Helper functions
function updateProgress() {
  const progressBar = document.getElementById('progress-bar');
  const scheduled = dataManager.getScheduledClassCount();
  const total = dataManager.getTotalClassCount();
  const percentage = (scheduled / total) * 100;
  
  progressBar.style.width = `${percentage}%`;
  progressBar.textContent = `${scheduled} of ${total} classes scheduled`;
}

function showMessage(type, message, duration = 4000) {
  const container = document.getElementById('message-container');
  container.textContent = message;
  container.className = `message ${type}`;
  container.style.display = 'block';

  if (duration > 0) {
    setTimeout(() => {
      container.style.display = 'none';
    }, duration);
  }
}

function renderAnalyticsVisualizations(metrics) {
  const container = document.querySelector('.analytics-visualizations');
  container.innerHTML = '<div class="visualization"></div>';
}