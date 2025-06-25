import { Buffer } from './core.js';

/**
 * A WebGPU compatible data structure for defining structured buffers
 */
export class Struct {
  /**
   * Create a new Struct
   * @param {string} name - The name of the struct in shader code
   * @param {Array} [data=[]] - Initial data array of {name, type} objects
   */
  constructor(name, data = []) {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new Error('Struct: Name must be a non-empty string');
    }

    this.name = name;
    this.data = data;

    // Add padding if needed to align to vec4 (16 bytes)
    if (this.floatSize % 4 != 0) {
      const fillerCount = 4 - (this.floatSize % 4);
      for (let i = 0; i < fillerCount; i++) {
        this.data.push({ name: `FILLER___${i}`, type: type_f32 });
      }
    }
  }

  /**
   * Add a field to the struct
   * @param {string} name - Field name
   * @param {Object} type - Field type (one of the predefined types e.g. type_f32, type_vec2)
   */
  add(name, type) {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new Error('Struct.add: Field name must be a non-empty string');
    }
    if (!type || typeof type !== 'object' || !('size' in type)) {
      throw new Error('Struct.add: Invalid type provided');
    }

    this.data.push({ name, type });
  }

  /**
   * Get the size of the struct in bytes
   * @returns {number} Size in bytes
   */
  get byteSize() {
    return this.data.reduce((acc, cur) => acc + cur.type.size, 0);
  }

  /**
   * Get the size of the struct in float units (4 bytes each)
   * @returns {number} Size in float units
   */
  get floatSize() {
    return this.byteSize / 4;
  }

  /**
   * Get the WGSL code representation of this struct
   * @returns {string} WGSL struct declaration
   */
  get code() {
    let str = 'struct ' + this.name + ' {\n';
    this.data.forEach(({ name, type }) => {
      str += type.code(name) + ',\n';
    });
    str = str.slice(0, -2); // Remove last comma and newline
    return str + '\n};';
  }

  /**
   * Create a JavaScript object matching this struct with default values
   * @returns {Object} Default object instance
   */
  object() {
    const obj = {};
    this.data.forEach(({ name, type }) => {
      obj[name] = type.object();
    });
    return obj;
  }

  /**
   * Convert JavaScript objects to Float32Array for GPU upload
   * @param {Object|Array} vals - Object(s) to convert
   * @returns {Float32Array} Packed Float32Array ready for GPU upload
   * @throws {Error} If input is invalid
   */
  toFloat32Array(vals) {
    if (!vals) {
      throw new Error('Struct.toFloat32Array: Input values are required');
    }

    if (!(vals instanceof Array)) vals = [vals];
    const arr = new Float32Array(this.floatSize * vals.length);
    let offset = 0;

    vals.forEach((val, i) => {
      if (!val || typeof val !== 'object') {
        throw new Error(`Struct.toFloat32Array: Invalid value at index ${i}`);
      }

      this.data.forEach(({ name, type }) => {
        const value = val[name];
        if (value === undefined) {
          throw new Error(`Struct.toFloat32Array: Missing field ${name} at index ${i}`);
        }

        if (type instanceof Struct) {
          arr.set(type.toFloat32Array(value), offset);
        } else {
          arr.set(type.toFloat32Array(value), offset);
        }
        offset += type.size / 4;
      });
    });

    return arr;
  }

  /**
   * Convert a Float32Array back to JavaScript objects
   * @param {Float32Array} arr - Array to convert
   * @returns {Array} Array of JavaScript objects
   * @throws {Error} If the input is not a Float32Array
   */
  fromFloat32Array(arr) {
    if (!(arr instanceof Float32Array)) {
      throw new Error('Struct.fromFloat32Array: Input must be a Float32Array');
    }

    const vals = [];
    let offset = 0;

    while (offset < arr.length) {
      const val = {};
      this.data.forEach(({ name, type }) => {
        if (offset + type.size / 4 > arr.length) {
          throw new Error('Struct.fromFloat32Array: Array too short for struct layout');
        }

        if (type instanceof Struct) {
          val[name] = type.fromFloat32Array(arr.slice(offset, offset + type.size / 4));
        } else {
          val[name] = type.fromFloat32Array(arr.slice(offset, offset + type.size / 4));
        }
        offset += type.size / 4;
      });
      vals.push(val);
    }

    return vals;
  }

  /**
   * Create a WebGPU buffer from JavaScript objects
   * @param {Array|Object} vals - Values to store in the buffer
   * @param {string} name - Buffer name
   * @returns {Buffer|Array<Buffer>} Buffer or array of buffers if data exceeds size limit
   * @throws {Error} If input is invalid
   */
  createBuffer(name, vals) {
    if (!vals) {
      throw new Error('Struct.createBuffer: Values are required');
    }

    if (!Array.isArray(vals)) {
      const newBuffer = new Buffer(name, this.toFloat32Array([vals]));
      newBuffer.struct = this;
      return newBuffer;
    }

    if (vals.length < 1) {
      throw new Error('Struct.createBuffer: Empty values array');
    }

    if (vals.length < 65000) {
      try {
        const newBuffer = new Buffer(name, this.toFloat32Array(vals));
        newBuffer.struct = this;
        newBuffer.isArray = true
        return newBuffer;
      } catch (error) {
        throw new Error(`Struct.createBuffer: Failed to create buffer: ${error.message}`);
      }
    }

    // Split into multiple buffers if too large
    const buffers = [];
    for (let i = 0; i < vals.length; i += 65000) {
      const nextData = vals.slice(i, i + 65000);
      try {
        const nextBuffer = new Buffer(name, this.toFloat32Array(nextData));
        nextBuffer.count = nextData.length;
        nextBuffer.struct = this;
        nextBuffer.isArray = true;
        buffers.push(nextBuffer);
      } catch (error) {
        throw new Error(`Struct.createBuffer: Failed to create buffer chunk ${i}: ${error.message}`);
      }
    }
    return buffers;
  }
}

/**
 * Float (f32) type definition for WGSL
 */
export const type_f32 = {
  size: 4,
  toFloat32Array: (val) => {
    if (typeof val !== 'number') {
      throw new Error('type_f32.toFloat32Array: Expected a number');
    }
    return new Float32Array([val]);
  },
  fromFloat32Array: (arr) => arr[0],
  code: (name) => `${name}: f32`,
  object: () => 0
};

/**
 * 2D vector (vec2<f32>) type definition for WGSL
 */
export const type_vec2 = {
  size: 8,
  toFloat32Array: (val) => {
    if (!val || typeof val !== 'object' || !('x' in val) || !('y' in val)) {
      throw new Error('type_vec2.toFloat32Array: Expected an object with x and y properties');
    }
    return new Float32Array([val.x, val.y]);
  },
  fromFloat32Array: (arr) => ({ x: arr[0], y: arr[1] }),
  code: (name) => `${name}: vec2<f32>`,
  object: () => ({ x: 0, y: 0 })
};

/**
 * 3D vector (vec3<f32>) type definition for WGSL
 */
export const type_vec3 = {
  size: 12,
  toFloat32Array: (val) => {
    if (!val || typeof val !== 'object' || !('x' in val) || !('y' in val) || !('z' in val)) {
      throw new Error('type_vec3.toFloat32Array: Expected an object with x, y, and z properties');
    }
    return new Float32Array([val.x, val.y, val.z]);
  },
  fromFloat32Array: (arr) => ({ x: arr[0], y: arr[1], z: arr[2] }),
  code: (name) => `${name}: vec3<f32>`,
  object: () => ({ x: 0, y: 0, z: 0 })
};

/**
 * 4D vector (vec4<f32>) type definition for WGSL
 */
export const type_vec4 = {
  size: 16,
  toFloat32Array: (val) => {
    if (!val || typeof val !== 'object' || !('x' in val) || !('y' in val) || !('z' in val) || !('w' in val)) {
      throw new Error('type_vec4.toFloat32Array: Expected an object with x, y, z, and w properties');
    }
    return new Float32Array([val.x, val.y, val.z, val.w]);
  },
  fromFloat32Array: (arr) => ({ x: arr[0], y: arr[1], z: arr[2], w: arr[3] }),
  code: (name) => `${name}: vec4<f32>`,
  object: () => ({ x: 0, y: 0, z: 0, w: 0 })
};

/**
 * RGBA color (vec4<f32>) type definition for WGSL
 * Used for color values with r,g,b,a components
 */
export const type_color = {
  size: 16,
  toFloat32Array: (val) => {
    if (!val || typeof val !== 'object' || !('r' in val) || !('g' in val) || !('b' in val) || !('a' in val)) {
      throw new Error('type_color.toFloat32Array: Expected an object with r, g, b, and a properties');
    }
    return new Float32Array([val.r, val.g, val.b, val.a]);
  },
  fromFloat32Array: (arr) => ({ r: arr[0], g: arr[1], b: arr[2], a: arr[3] }),
  code: (name) => `${name}: vec4<f32>`,
  object: () => ({ r: 0, g: 0, b: 0, a: 1 })
};
