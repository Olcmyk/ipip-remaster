import type { TestProgress, TestResults } from './types';

const STORAGE_PREFIX = 'ipip_';
const PROGRESS_KEY = `${STORAGE_PREFIX}progress_`;
const RESULTS_KEY = `${STORAGE_PREFIX}results_`;

/**
 * Save test progress to localStorage
 */
export function saveTestProgress(progress: TestProgress): void {
  try {
    const key = `${PROGRESS_KEY}${progress.testId}`;
    localStorage.setItem(key, JSON.stringify(progress));
  } catch (error) {
    console.error('Failed to save test progress:', error);
  }
}

/**
 * Load test progress from localStorage
 */
export function loadTestProgress(testId: string): TestProgress | null {
  try {
    const key = `${PROGRESS_KEY}${testId}`;
    const data = localStorage.getItem(key);
    if (!data) return null;
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load test progress:', error);
    return null;
  }
}

/**
 * Clear test progress from localStorage
 */
export function clearTestProgress(testId: string): void {
  try {
    const key = `${PROGRESS_KEY}${testId}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to clear test progress:', error);
  }
}

/**
 * Save test results to localStorage
 */
export function saveTestResults(results: TestResults): void {
  try {
    const key = `${RESULTS_KEY}${results.testId}_${Date.now()}`;
    localStorage.setItem(key, JSON.stringify(results));
  } catch (error) {
    console.error('Failed to save test results:', error);
  }
}

/**
 * Load all test results from localStorage
 */
export function loadAllTestResults(): TestResults[] {
  try {
    const results: TestResults[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(RESULTS_KEY)) {
        const data = localStorage.getItem(key);
        if (data) {
          results.push(JSON.parse(data));
        }
      }
    }
    return results.sort((a, b) =>
      new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );
  } catch (error) {
    console.error('Failed to load test results:', error);
    return [];
  }
}

/**
 * Delete a specific test result
 */
export function deleteTestResult(testId: string, completedAt: string): void {
  try {
    // Find the key that matches this result
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(RESULTS_KEY)) {
        const data = localStorage.getItem(key);
        if (data) {
          const result = JSON.parse(data);
          if (result.testId === testId && result.completedAt === completedAt) {
            localStorage.removeItem(key);
            break;
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to delete test result:', error);
  }
}

/**
 * Clear all test data from localStorage
 */
export function clearAllTestData(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error('Failed to clear test data:', error);
  }
}

/**
 * Check if localStorage is available
 */
export function isStorageAvailable(): boolean {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get storage usage info
 */
export function getStorageInfo(): { used: number; available: boolean } {
  if (!isStorageAvailable()) {
    return { used: 0, available: false };
  }

  try {
    let used = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        const value = localStorage.getItem(key);
        if (value) {
          used += key.length + value.length;
        }
      }
    }
    return { used, available: true };
  } catch (error) {
    return { used: 0, available: false };
  }
}
