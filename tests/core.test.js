/**
 * @jest-environment jsdom
 */

import { random, map, choose, Struct, type_f32, type_vec2 } from '../src/core';

describe('Core Utilities', () => {
  describe('random()', () => {
    test('should return a number between 0 and 1 when no args provided', () => {
      const result = random();
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    });

    test('should return a number within range when arguments are provided', () => {
      const min = 5;
      const max = 10;
      const result = random(max, min);
      expect(result).toBeGreaterThanOrEqual(min);
      expect(result).toBeLessThanOrEqual(max);
    });
  });

  describe('map()', () => {
    test('should map a value from one range to another', () => {
      // Map 5 from range [0, 10] to range [0, 100]
      expect(map(5, 0, 10, 0, 100)).toBe(50);
      
      // Map 0 from range [-1, 1] to range [0, 100]
      expect(map(0, -1, 1, 0, 100)).toBe(50);
    });
  });

  describe('choose()', () => {
    test('should select an item from an array', () => {
      const arr = [1, 2, 3, 4, 5];
      const result = choose(arr);
      expect(arr).toContain(result);
    });

    test('should throw an error when given an empty array', () => {
      expect(() => choose([])).toThrow('choose: Cannot select from an empty array');
    });

    test('should throw an error when not given an array', () => {
      expect(() => choose('not an array')).toThrow('choose: Expected an array as argument');
      expect(() => choose(null)).toThrow('choose: Expected an array as argument');
      expect(() => choose(undefined)).toThrow('choose: Expected an array as argument');
    });
  });

  describe('Struct', () => {
    test('should create a struct with the given name', () => {
      const struct = new Struct('TestStruct');
      expect(struct.name).toBe('TestStruct');
    });

    test('should allow adding fields', () => {
      const struct = new Struct('TestStruct');
      struct.add('x', type_f32);
      struct.add('y', type_f32);
      
      expect(struct.data.length).toBe(2);
      expect(struct.data[0].name).toBe('x');
      expect(struct.data[1].name).toBe('y');
    });

    test('should calculate byte size correctly', () => {
      const struct = new Struct('TestStruct');
      struct.add('x', type_f32); // 4 bytes
      struct.add('y', type_f32); // 4 bytes
      struct.add('pos', type_vec2); // 8 bytes
      
      expect(struct.byteSize).toBe(16);
      expect(struct.floatSize).toBe(4);
    });

    test('should generate correct WGSL code', () => {
      const struct = new Struct('Position');
      struct.add('x', type_f32);
      struct.add('y', type_f32);
      
      const code = struct.code;
      expect(code).toContain('struct Position {');
      expect(code).toContain('x: f32');
      expect(code).toContain('y: f32');
    });

    test('should create object with default values', () => {
      const struct = new Struct('TestStruct');
      struct.add('x', type_f32);
      struct.add('y', type_f32);
      struct.add('pos', type_vec2);
      
      const obj = struct.object();
      expect(obj.x).toBe(0);
      expect(obj.y).toBe(0);
      expect(obj.pos).toEqual({x: 0, y: 0});
    });
  });
});
