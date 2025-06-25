/**
 * @jest-environment jsdom
 */

import { VERSION } from '../src/index';

describe('WebGPU Utils', () => {
  test('should have a version number', () => {
    expect(VERSION).toBeDefined();
    expect(typeof VERSION).toBe('string');
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);  // Semantic versioning format
  });
});
