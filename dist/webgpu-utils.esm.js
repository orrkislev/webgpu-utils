/**
 * @file WebGPU shader noise utilities
 * Provides noise functions for WGSL shaders
 */

let noiseBuffer;

/**
 * Get WGSL code for noise functions
 * @returns {string} WGSL noise functions code
 */
function getNoiseCode() {
  // Create a noise offset buffer if it doesn't exist
  if (!noiseBuffer) {
    noiseBuffer = new Buffer('noiseOffset', [Math.random() * 1000, Math.random() * 1000, Math.random() * 1000], 'noiseOffset');
  }

  // Combine noise function implementations
  return `
    ${wgslNoise}
    ${wgslNoise2}
    `;
}

/**
 * Simple 1D noise function for WGSL
 * @type {string}
 */
const wgslNoise = `
fn rand(n: f32) -> f32 { return fract(sin(438.347 * n / 10000)); }
fn noise(p: f32) -> f32 {
  let pVal = p+noiseOffset.x;
  let fl = floor(pVal);
  let fc = fract(pVal);
  return mix(rand(fl), rand(fl + 1.), fc);
}
`;

/**
 * 2D simplex noise implementation for WGSL
 * @type {string}
 */
const wgslNoise2 =
  `fn mod289(x: vec2<f32>) -> vec2<f32> {return x - floor(x * (1. / 289.)) * 289.;}
fn mod289_3(x: vec3<f32>) -> vec3<f32> {return x - floor(x * (1. / 289.)) * 289.;}
fn permute3(x: vec3<f32>) -> vec3<f32> {return mod289_3(((x * 34.) + 1.) * x);}
fn noise2(v: vec2<f32>) -> f32 {
  let v2 = v * .4 + noiseOffset.xy;
  let C = vec4(
      0.211324865405187, // (3.0-sqrt(3.0))/6.0
      0.366025403784439, // 0.5*(sqrt(3.0)-1.0)
      -0.577350269189626, // -1.0 + 2.0 * C.x
      0.024390243902439 // 1.0 / 41.0
  );
  var i = floor(v2 + dot(v2, C.yy));
  let x0 = v2 - i + dot(i, C.xx);
  var i1 = select(vec2(0., 1.), vec2(1., 0.), x0.x > x0.y);
  var x12 = x0.xyxy + C.xxzz;
  x12.x = x12.x - i1.x;
  x12.y = x12.y - i1.y;
  i = mod289(i); // Avoid truncation effects in permutation
  var p = permute3(permute3(i.y + vec3(0., i1.y, 1.)) + i.x + vec3(0., i1.x, 1.));
  var m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), vec3(0.));
  m *= m;
  m *= m;
  let x = 2. * fract(p * C.www) - 1.;
  let h = abs(x) - 0.5;
  let ox = floor(x + 0.5);
  let a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  let g = vec3(a0.x * x0.x + h.x * x0.y, a0.yz * x12.xz + h.yz * x12.yw);
  return 130. * dot(m, g);
}`;

/**
 * 3D simplex noise implementation for WGSL
 * @type {string}
 */
const wgslNoise3 = `
fn mod289_f(x: f32) -> f32 { return x - floor(x * (1.0 / 289.0)) * 289.0; }
fn mod289_vec3(x: vec3<f32>) -> vec3<f32> { return x - floor(x * (1.0 / 289.0)) * 289.0; }
fn mod289_vec4(x: vec4<f32>) -> vec4<f32> { return x - floor(x * (1.0 / 289.0)) * 289.0; }
fn permute_vec4(x: vec4<f32>) -> vec4<f32> { return mod289_vec4(((x * 34.0) + 1.0) * x); }
fn taylorInvSqrt_f(r: f32) -> f32 { return 1.79284291400159 - 0.85373472095314 * r; }
fn taylorInvSqrt_vec4(r: vec4<f32>) -> vec4<f32> { return 1.79284291400159 - 0.85373472095314 * r; }

fn noise3(v: vec3<f32>) -> f32 {
  let C = vec4<f32>(
    0.1381966, // 1/6
    0.2763932, // 1/3
    0.5,
    -0.5
  );
  
  // First corner
  var i = floor(v + dot(v, C.yyy));
  let x0 = v - i + dot(i, C.xxx);
  
  // Other corners
  let g = step(x0.yzx, x0.xyz);
  let l = 1.0 - g;
  let i1 = min(g.xyz, l.zxy);
  let i2 = max(g.xyz, l.zxy);
  
  let x1 = x0 - i1 + C.xxx;
  let x2 = x0 - i2 + C.yyy;
  let x3 = x0 - 0.5;
  
  // Permutations
  i = mod289_vec3(i); // Avoid truncation effects in permutation
  let p = permute_vec4(permute_vec4(permute_vec4(
    i.z + vec4<f32>(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4<f32>(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4<f32>(0.0, i1.x, i2.x, 1.0));
    
  // Gradients: 7x7 points over a square, mapped onto an octahedron.
  // The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
  let j = p - 49.0 * floor(p * (1.0 / 49.0));  // mod(p,7*7)
  
  let x_ = floor(j * (1.0 / 7.0));
  let y_ = floor(j - 7.0 * x_);  // mod(j,N)
  
  let x = x_ * (2.0 / 7.0) + 0.5 / 7.0 - 1.0;
  let y = y_ * (2.0 / 7.0) + 0.5 / 7.0 - 1.0;
  
  let h = 1.0 - abs(x) - abs(y);
  
  let b0 = vec4<f32>(x.xy, y.xy);
  let b1 = vec4<f32>(x.zw, y.zw);
  
  let s0 = floor(b0) * 2.0 + 1.0;
  let s1 = floor(b1) * 2.0 + 1.0;
  let sh = -step(h, vec4<f32>(0.0));
  
  let a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  let a1 = b1.xzyw + s1.xzyw * sh.zzww;
  
  var p0 = vec3<f32>(a0.xy, h.x);
  var p1 = vec3<f32>(a0.zw, h.y);
  var p2 = vec3<f32>(a1.xy, h.z);
  var p3 = vec3<f32>(a1.zw, h.w);
  
  // Normalise gradients
  let norm = taylorInvSqrt_vec4(vec4<f32>(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  
  // Mix final noise value
  var m = max(0.6 - vec4<f32>(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), vec4<f32>(0.0));
  m = m * m;
  return 42.0 * dot(m * m, vec4<f32>(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
`;

/**
 * FBM (Fractal Brownian Motion) noise for WGSL
 * @type {string}
 */
const wgslFBM = `
fn fbm(p: vec2<f32>, octaves: i32) -> f32 {
    var value = 0.0;
    var amplitude = 0.5;
    var frequency = 1.0;
    var p2 = p + noiseOffset.xy * 10.0;
    
    for (var i = 0; i < octaves; i = i + 1) {
        value += amplitude * noise2(p2 * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    
    return value;
}
`;

/**
 * WGSL function for voronoi noise
 * @type {string}
 */
const wgslVoronoi = `
fn voronoi(uv: vec2<f32>, scale: f32, seed: f32) -> f32 {
    let s = scale;
    let iuv = floor(uv * s);
    let fuv = fract(uv * s);
    var min_dist = 1.0;
    
    for (var y: i32 = -1; y <= 1; y = y + 1) {
        for (var x: i32 = -1; x <= 1; x = x + 1) {
            let neighbor = vec2<f32>(f32(x), f32(y));
            let point = 0.5 + 0.5 * sin(seed + 6.2831 * rand(rand(iuv.x + neighbor.x + seed) + iuv.y + neighbor.y));
            let diff = neighbor + point - fuv;
            let dist = length(diff);
            min_dist = min(min_dist, dist);
        }
    }
    
    return min_dist;
}
`;

/**
 * A WebGPU compatible data structure for defining structured buffers
 */
class Struct {
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
        newBuffer.isArray = true;
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
const type_f32 = {
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
const type_vec2 = {
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
const type_vec3 = {
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
const type_vec4 = {
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
const type_color = {
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

/**
 * Generates a random number between two values
 * @param {number} [a=1] - Upper bound (if only one argument is provided) or range
 * @param {number} [b=0] - Lower bound
 * @returns {number} Random number between a and b
 */
const random = (a = 1, b = 0) => Math.random() * (a - b) + b;

/**
 * Selects a random element from an array
 * @param {Array} arr - The array to select from
 * @returns {*} Random element from the array
 * @throws {Error} If the array is empty or not an array
 */
const choose = (arr) => {
    if (!Array.isArray(arr)) {
        throw new Error('choose: Expected an array as argument');
    }
    if (arr.length === 0) {
        throw new Error('choose: Cannot select from an empty array');
    }
    return arr[Math.floor(random(arr.length))];
};

/**
 * Creates a promise that resolves after a specified time
 * @param {number} [ms=10] - Milliseconds to wait
 * @returns {Promise} Promise that resolves after the specified time
 */
const timeout = async (ms = 10) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Maps a value from one range to another
 * @param {number} val - The value to map
 * @param {number} inMin - Input range minimum
 * @param {number} inMax - Input range maximum
 * @param {number} outMin - Output range minimum
 * @param {number} outMax - Output range maximum
 * @returns {number} Mapped value
 */
const map = (val, inMin, inMax, outMin, outMax) =>
    outMin + (outMax - outMin) * (val - inMin) / (inMax - inMin);


/**
 * Creates a mouse position buffer that updates on mouse movement
 * @returns {Buffer} Mouse position buffer with x, y coordinates and button state
 * @throws {Error} If canvas is not defined
 * @example
 * createMouseBuffer();
 * // This will create a buffer that updates with the mouse position and button state
 * @throws {Error} If canvas is not defined
 */
let mouseBuffer = null;
function createMouseBuffer() {
    if (!canvas) {
        throw new Error('createMouseBuffer: Canvas is not defined');
    }
    const mouseStruct = new Struct('mouseStruct', [
        { name: 'pos', type: type_vec2 },
        { name: 'button', type: type_f32 }
    ]);
    mouseBuffer = mouseStruct.createBuffer('mouse', mouseStruct.object());
    const mouseEvent = (e) => {
        const rect = canvas.getBoundingClientRect();
        const mouseIsDown = e.buttons == 1 ? 0 : 1;
        // mouseBuffer.update(mouseStruct.toFloat32Array([newMouseData]))
        mouseBuffer.update(new Float32Array([
            width * (e.clientX - rect.left) / rect.width,
            height * (e.clientY - rect.top) / rect.height,
            mouseIsDown
        ]));
    };
    document.addEventListener('mousemove', mouseEvent);
    document.addEventListener('mousedown', mouseEvent);
    document.addEventListener('mouseup', mouseEvent);
}


/** * Creates a time buffer that updates with the current time in seconds
 * @returns {Buffer} Time buffer that updates with the current time
 * @example
 * createTimeBuffer();
 * // This will create a buffer that updates with the current time in seconds
 */
let timeBuffer = null;
function getTimeBuffer() {
    if (!timeBuffer) {
        throw new Error('getTimeBuffer: Time buffer has not been created yet');
    }
    return timeBuffer;
}
function createTimeBuffer() {
    timeBuffer = new Buffer('time', new Float32Array([0]));
    setInterval(() => {
        timeBuffer.update(new Float32Array([performance.now() / 1000]));
    }, 1000 / 60); // Update at 60 FPS
    return timeBuffer
}

// RenderPass and ComputePass classes extracted from render.js

class RenderPass {
    constructor(texture, code) {
        if (!device) {
            throw new Error('RenderPass: WebGPU device not initialized. Call initCanvas() first.');
        }
        if (!texture || typeof texture !== 'object') {
            throw new Error('RenderPass: Invalid texture');
        }
        if (typeof code !== 'string' || code.trim() === '') {
            throw new Error('RenderPass: Shader code must be a non-empty string');
        }
        try {
            this.module = device.createShaderModule({ code });
            this.pipeline = device.createRenderPipeline({
                layout: 'auto',
                vertex: { module: this.module, entryPoint: 'vs' },
                fragment: { module: this.module, entryPoint: 'fs', targets: [{ format: canvasPresentationFormat }] },
            });
            this.sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' });
            this.bindGroup = device.createBindGroup({
                layout: this.pipeline.getBindGroupLayout(0),
                entries: [
                    { binding: 0, resource: this.sampler },
                    { binding: 1, resource: texture.resource },
                ],
            });
            this.renderPassDescriptor = {
                colorAttachments: [{ clearValue: [0, 0, 0, 1], loadOp: 'clear', storeOp: 'store' }],
            };
        } catch (error) {
            throw new Error(`Failed to create RenderPass: ${error.message}`);
        }
    }
    run(encoder) {
        try {
            this.renderPassDescriptor.colorAttachments[0].view = ctx.getCurrentTexture().createView();
            const pass = encoder.beginRenderPass(this.renderPassDescriptor);
            pass.setPipeline(this.pipeline);
            pass.setBindGroup(0, this.bindGroup);
            pass.draw(6);
            pass.end();
        } catch (error) {
            throw new Error(`Failed to run RenderPass: ${error.message}`);
        }
    }
}


class ComputePass {
    constructor(code, bindings, dispatchSize, entryPoint = 'main') {

        // inject auto-bindings
        const Auto_Bindings = [
            { binding: mouseBuffer, regex: /\bmouse(\.(pos|button))?\b/ },
            { binding: timeBuffer, regex: /\btime\b/ },
            { binding: renderTxtr, regex: /\brenderTxtr\b/, function: 'write' },
            { binding: feedbackTxtr, regex: /\bfeedbackTxtr\b/, function: 'read' },
        ];
        Auto_Bindings.forEach(auto => {
            if (code.match(auto.regex)) {
                if (!bindings.some(b => b.name === auto.binding.name)) {
                    const newBinding = auto.function ? auto.binding[auto.function]() : auto.binding;
                    bindings.push(newBinding);
                }
            }
        });

        if (/\bnoise2?\s*\(/.test(code)) {
            if (noiseBuffer) bindings.push(noiseBuffer);
        }


        if (bindings.some(b => Array.isArray(b))) {
            const multipleBuffer = bindings.find(b => Array.isArray(b));
            const multipleBufferIndex = bindings.findIndex(b => Array.isArray(b));
            return multipleBuffer.map((buffer, i) => {
                const newBindings = bindings.slice();
                newBindings[multipleBufferIndex] = buffer;
                return new ComputePass(code, newBindings, buffer.count, entryPoint)
            })
        }

        let bindingsCode = '';
        bindings.forEach((binding, i) => {
            bindingsCode += binding.getBindingCode(i) + '\n';
        });
        code = bindingsCode + code;

        bindings.forEach(binding => {
            if (binding.struct) code = binding.struct.code + '\n' + code;
        });

        this.code = code;

        this.module = device.createShaderModule({ code });
        this.pipeline = device.createComputePipeline({
            layout: 'auto',
            compute: { module: this.module, entryPoint },
        });
        this.bindGroup = device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: bindings.map((bind, i) => ({ binding: i, resource: bind.resource })),
        });

        this.dispatchSize = dispatchSize;
        if (!Array.isArray(dispatchSize)) this.dispatchSize = [dispatchSize];
    }

    run(encoder) {
        const pass = encoder.beginComputePass();
        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, this.bindGroup);
        pass.dispatchWorkgroups(...this.dispatchSize);
        pass.end();
    }



    /**
     * Static methods
     */
    static texture(code, bindings){
        return new ComputePass(code, bindings, [width, height]);
    }
    static compute(code, bindings, arr){
        return new ComputePass(code, bindings, [arr.length]);
    }
}

/**
 * Execute multiple render or compute passes
 * @param {Array} passes - Array of RenderPass or ComputePass objects (or arrays of passes)
 * @param {number} [repeats=1] - Number of times to repeat the passes
 * @throws {Error} If device is not initialized or passes are invalid
 */
function runPasses(passes, repeats = 1) {
    if (!device) {
        throw new Error('runPasses: WebGPU device not initialized. Call initCanvas() first.');
    }

    if (!Array.isArray(passes))
        passes = [passes];

    try {
        const commandEncoder = device.createCommandEncoder();
        for (let i = 0; i < repeats; i++) {
            for (const pass of passes) {
                if (Array.isArray(pass)) {
                    pass.forEach(p => {
                        if (!p || typeof p.run !== 'function') {
                            throw new Error('Invalid pass object in array');
                        }
                        p.run(commandEncoder);
                    });
                } else {
                    if (!pass || typeof pass.run !== 'function') {
                        throw new Error('Invalid pass object');
                    }
                    pass.run(commandEncoder);
                }
            }
        }
        device.queue.submit([commandEncoder.finish()]);
    } catch (error) {
        throw new Error(`Failed to run passes: ${error.message}`);
    }
}

/**
 * @file WebGPU render passes for common operations
 * Provides specialized render passes for common rendering tasks
 */

/**
 * Global rendering parameters
 * @type {Object}
 */
const renderParams = {
    bgColor: [0, 0, 0]
};

/**
 * Texture array for render targets
 * @type {Array}
 */
let renderTxtr, feedbackTxtr;
let renderPass, matchPass, clearPass;

/**
 * Creates a standard render pass for displaying to screen
 * @async
 * @param {Object} [options] - Render pass options
 * @param {Array<number>} [options.bgColor] - Background color [r, g, b] (0-255)
 * @returns {Promise<RenderPass>} The configured render pass
 */
async function createRenderPass(options = {}) {
    if (options.bgColor) {
        renderParams.bgColor = options.bgColor;
    }

    await createTextures();

    createClearPass();

    renderPass = new RenderPass(renderTxtr, basicRenderCode);
    return renderPass;
}

/**
 * Creates textures for rendering
 * @async
 * @returns {Promise<void>}
 */
async function createTextures() {
    try {
        renderTxtr = new Texture('renderTxtr', width, height);
        feedbackTxtr = new Texture('feedbackTxtr', width, height);

        const code = `
        @compute @workgroup_size(1)
        fn main(@builtin(global_invocation_id) id: vec3<u32>) {
          let x: i32 = i32(id.x);
          let y: i32 = i32(id.y);
          let clr = vec4f(${renderParams.bgColor[0] / 255},${renderParams.bgColor[1] / 255},${renderParams.bgColor[2] / 255},1.0);
          textureStore(renderTxtr, vec2<i32>(x, y), clr);
          textureStore(feedbackTxtr, vec2<i32>(x, y), clr);
        }`;

        const pass1 = new ComputePass(code, [renderTxtr.write(), feedbackTxtr.write()], [width, height]);
        runPasses([pass1]);
    } catch (error) {
        throw new Error(`Failed to create textures: ${error.message}`);
    }
}

/**
 * Basic render code for fullscreen quad rendering
 * @type {string}
 */
const basicRenderCode = `
    struct OurVertexShaderOutput {
        @builtin(position) position: vec4f,
        @location(0) uv: vec2f,
    };

    @vertex fn vs(@builtin(vertex_index) vertexIndex: u32) -> OurVertexShaderOutput {
        let pos = array(
            vec2f(-1.0, -1.0), vec2f(1.0, -1.0),
            vec2f(-1.0, 1.0), vec2f(-1.0, 1.0),
            vec2f(1.0, -1.0), vec2f(1.0, 1.0),
        );

        var vsOutput: OurVertexShaderOutput;
        let xy = pos[vertexIndex];
        vsOutput.position = vec4f(xy, 0.0, 1.0);
        vsOutput.uv = vec2f((xy.x + 1.0) / 2.0, 1.0-(xy.y + 1.0) / 2.0);
        return vsOutput;
    }

    @group(0) @binding(0) var ourSampler: sampler;
    @group(0) @binding(1) var ourTexture: texture_2d<f32>;

    @fragment fn fs(fsInput: OurVertexShaderOutput) -> @location(0) vec4f {
        return textureSample(ourTexture, ourSampler, fsInput.uv);
    }
    `;

/**
 * Creates a pass that matches/copies one texture to another
 * @async
 * @returns {Promise<ComputePass>} The configured compute pass
 */
async function createMatchPass() {
    if (!renderTxtr || !feedbackTxtr) {
        throw new Error('createMatchPass: Textures must be created first with createTextures()');
    }

    const code = `
    @compute @workgroup_size(1)
    fn main(@builtin(global_invocation_id) id: vec3<u32>) {
      let x: i32 = i32(id.x);
      let y: i32 = i32(id.y);
      let clr = textureLoad(renderTxtr, vec2<i32>(x, y), 0);
      textureStore(feedbackTxtr, vec2<i32>(x, y), vec4<f32>(clr.r, clr.g, clr.b, 1.0));
    }`;

    matchPass = new ComputePass(code, [renderTxtr.read(), feedbackTxtr.write()], [width, height]);
    return matchPass;
}

/**
 * Creates a pass that clears all textures to the background color
 * @async
 * @returns {Promise<ComputePass>} The configured compute pass
 */
async function createClearPass() {
    if (!renderTxtr || !feedbackTxtr) {
        throw new Error('createClearPass: Textures must be created first with createTextures()');
    }

    const code = `
    @compute @workgroup_size(1)
    fn main(@builtin(global_invocation_id) id: vec3<u32>) {
      let x: i32 = i32(id.x);
      let y: i32 = i32(id.y);

      var clr = vec4<f32>(${renderParams.bgColor[0] / 255}, ${renderParams.bgColor[1] / 255}, ${renderParams.bgColor[2] / 255}, 1.0);

      textureStore(renderTxtr, vec2<i32>(x, y), clr);
      textureStore(feedbackTxtr, vec2<i32>(x, y), clr);
    }`;

    clearPass = new ComputePass(code, [renderTxtr.write(), feedbackTxtr.write()], [width, height]);
    return clearPass;
}

/**
 * Set background color and update render parameters
 * @param {Array<number>} color - RGB color values [0-255]
 */
function setBackgroundColor(color) {
    if (!Array.isArray(color) || color.length < 3) {
        throw new Error('setBackgroundColor: Expected an array of at least 3 RGB values [0-255]');
    }

    renderParams.bgColor = color.map(v => Math.max(0, Math.min(255, v)));
}

/**
 * @file WebGPU canvas initialization and rendering utilities
 * Provides functions to initialize a WebGPU canvas, set up the rendering context,
 * and handle basic rendering operations.
 */

let width, height, device;
let canvas, canvasPresentationFormat, ctx;

/**
 * Initialize the WebGPU canvas and device
 * @param {Object} [options] - Canvas initialization options
 * @param {number} [options.width] - Canvas width (defaults to window width * 2)
 * @param {number} [options.height] - Canvas height (defaults to window height * 2)
 * @param {HTMLCanvasElement} [options.canvas] - Existing canvas to use (creates one if not provided)
 * @param {string} [options.containerId] - ID of the container to append the canvas to and size it to
 * @returns {Promise<{device: GPUDevice, canvas: HTMLCanvasElement, width: number, height: number}>}
 * @throws {Error} If WebGPU is not supported or initialization fails
 */
async function initCanvas(options = {}) {
    if (!navigator.gpu) {
        throw new Error('WebGPU not supported in this browser.');
    }

    try {
        const adapter = await navigator.gpu?.requestAdapter();
        if (!adapter) {
            throw new Error('Couldn\'t request WebGPU adapter.');
        }

        device = await adapter.requestDevice();
        if (!device) {
            throw new Error('Couldn\'t request WebGPU device.');
        }

        // Set up error handling for device
        device.addEventListener('uncapturederror', (event) => {
            console.error('WebGPU device error:', event.error);
        });

        // Get or create canvas
        canvas = options.canvas || document.querySelector('canvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
        }

        let container = null;
        if (options.containerId) {
            container = document.getElementById(options.containerId);
            if (!container) {
                throw new Error(`Container with ID '${options.containerId}' not found.`);
            }
            container.appendChild(canvas);
            width = container.clientWidth;
            height = container.clientHeight;
            canvas.style.display = 'block';
        } else {
            if (!options.canvas) {
                document.body.appendChild(canvas);
            }
            width = window.innerWidth;
            height = window.innerHeight;
        }

        if (options.width) width = options.width;
        if (options.height) height = options.height;

        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        width *= 2;
        height *= 2;
        canvas.width = width;
        canvas.height = height;

        // Configure WebGPU context
        ctx = canvas.getContext('webgpu');
        if (!ctx) {
            throw new Error('Couldn\'t get WebGPU context from canvas.');
        }

        canvasPresentationFormat = navigator.gpu.getPreferredCanvasFormat();
        ctx.configure({
            device,
            format: canvasPresentationFormat,
            alphaMode: 'premultiplied'
        });

        // Add keyboard shortcut for saving canvas
        window.addEventListener('keydown', (e) => {
            if (e.key === 's') {
                const a = document.createElement('a');
                a.href = canvas.toDataURL();
                a.download = 'webgpu-image-' + new Date().toISOString().replace(/:/g, '-') + '.png';
                a.click();
            }
        });

        // In your WebGPU initialization (e.g. after device, ctx, canvasPresentationFormat are set):
        // _setWebGPUContext(device, ctx, canvasPresentationFormat);

        // Export reference variables to global scope for convenience
        return { device, canvas, width, height };
    } catch (error) {
        throw new Error(`Failed to initialize canvas: ${error.message}`);
    }
}

// Check if WebGPU is supported in the current browser
function isWebGPUSupported() {
    return typeof navigator !== 'undefined' && navigator && ('gpu' in navigator);
}

// Utility to create a promise that resolves when the DOM is loaded
function domReady() {
    return new Promise(resolve => {
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            resolve();
        } else {
            document.addEventListener('DOMContentLoaded', () => resolve());
        }
    });
}

// Initialize the library and canvas in one call
async function init(options = {}) {
    await domReady();
    await initCanvas(options);
    if (options.mouse) createMouseBuffer();
    if (options.time) createTimeBuffer();
    createRenderPass();
    if (options.feedback) createMatchPass();
}

/**
 * WebGPU Core Module
 * Provides basic WebGPU functionality including buffer and texture creation.
 * This module is designed to be used with the WebGPU API and requires a compatible browser.
 */

/**
 * Create WebGPU buffer
 * @class
 */
class Buffer {
    /**
     * Create a WebGPU buffer
     * @param {string} [name=''] - Name for the buffer
     * @param {Float32Array|Array} data - Data to store in buffer
     * @throws {Error} If device is not initialized or buffer creation fails
     */
    constructor(name, data) {
        if (!device) {
            throw new Error('Buffer: WebGPU device not initialized. Call initCanvas() first.');
        }

        try {
            this.name = name;

            // Convert array to Float32Array if needed
            if (Array.isArray(data)) {
                data = new Float32Array(data);
            } else if (!(data instanceof Float32Array)) {
                throw new Error('Buffer: Data must be an Array or Float32Array');
            }

            this.data = data;
            this.size = data.byteLength;

            // Create the GPU buffer
            this.buffer = device.createBuffer({
                label: this.name,
                size: this.size,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
                mappedAtCreation: true
            });

            // Write data to the buffer
            new Float32Array(this.buffer.getMappedRange()).set(data);
            this.buffer.unmap();

            // Create resource binding
            this.resource = { buffer: this.buffer };
        } catch (error) {
            throw new Error(`Failed to create Buffer: ${error.message}`);
        }
    }

    /**
     * Update buffer data
     * @param {Float32Array|Array} data - New data for the buffer
     */
    update(data) {
        if (!data || (!Array.isArray(data) && !(data instanceof Float32Array))) {
            throw new Error('Buffer.update: Data must be an Array or Float32Array');
        }

        try {
            // Convert array to Float32Array if needed
            if (Array.isArray(data)) {
                data = new Float32Array(data);
            }

            // Update data
            device.queue.writeBuffer(this.buffer, 0, data);
            this.data = data;
        } catch (error) {
            throw new Error(`Failed to update Buffer: ${error.message}`);
        }
    }

    /**
     * Get binding code for this buffer
     * @param {number} index - Binding index for the buffer
     * @returns {string} WGSL binding code for the buffer
     * @throws {Error} If buffer resource is not initialized
     */
    getBindingCode(index) {
        if (!this.resource || !this.resource.buffer) {
            throw new Error('Buffer.getBindingCode: Buffer resource not initialized');
        }

        let bufferType = 'f32';
        if (this.struct) bufferType = this.struct.name;
        else {
            if (this.size == 4) bufferType = 'f32';
            else if (this.size == 8) bufferType = 'vec2f';
            else if (this.size == 12) bufferType = 'vec3f';
            else if (this.size == 16) bufferType = 'vec4f';
        }
        if (this.isArray) bufferType = `array<${bufferType}>`;
        return `@group(0) @binding(${index}) var<storage, read_write> ${this.name}: ${bufferType};`
    }

    async getData(){
        // get the data from the buffer
        const readBuffer = device.createBuffer({
            size: this.size,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });

        // Step 2: Create a command encoder and copy the buffer
        const commandEncoder = device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(
            this.buffer, // source buffer
            0,           // source offset
            readBuffer,  // destination buffer
            0,           // destination offset
            this.size    // size
        );

        // Submit the commands
        const commands = commandEncoder.finish();
        device.queue.submit([commands]);

        // Step 3: Map the read buffer and read the data
        await readBuffer.mapAsync(GPUMapMode.READ);
        const copyArrayBuffer = readBuffer.getMappedRange();

        // Assuming the data is float32
        const newdata = [...new Float32Array(copyArrayBuffer)];

        // Don't forget to unmap the buffer
        readBuffer.unmap();
        return newdata
    }
}

/**
 * WebGPU Texture wrapper
 * @class
 */
class Texture {
    /**
     * Create a WebGPU texture
     * @param {string} [name=''] - Name for the texture
     * @param {number} [width=512] - Texture width
     * @param {number} [height=512] - Texture height
     * @param {GPUTextureFormat} [format='rgba8unorm'] - Texture format
     * @throws {Error} If device is not initialized or texture creation fails
     */
    constructor(name = '', width = 512, height = 512, format = 'rgba8unorm') {
        if (!device) {
            throw new Error('Texture: WebGPU device not initialized. Call initCanvas() first.');
        }

        try {
            this.name = name;
            this.width = width;
            this.height = height;
            this.format = format;

            // Create the texture
            this.texture = device.createTexture({
                label: this.name,
                size: [width, height, 1],
                format,
                usage: GPUTextureUsage.COPY_DST |
                    GPUTextureUsage.STORAGE_BINDING |
                    GPUTextureUsage.TEXTURE_BINDING
            });

            // Create texture view
            this.view = this.texture.createView();
            this.resource = this.view;
        } catch (error) {
            throw new Error(`Failed to create Texture: ${error.message}`);
        }
    }

    /**
     * Get binding for this texture in read mode
     * @returns {GPUTextureView} Texture view for binding
     */
    read() {
        return new TextureBindingHelper(this, 'read');
    }

    /**
     * Get binding for this texture in write mode
     * @returns {GPUTextureView} Texture view for binding
     */
    write() {
        return new TextureBindingHelper(this, 'write');
    }
}
function TextureBindingHelper(texture, readOrWrite = 'read') {
    this.texture = texture;
    this.readOrWrite = readOrWrite;
    this.resource = texture.resource;
    this.name = texture.name;

    this.getBindingCode = (bindingIndex) => {
        if (this.readOrWrite === 'read' && this.texture.format == 'rgba8unorm') {
            return `@group(0) @binding(${bindingIndex}) var ${this.texture.name}: texture_2d<f32>;`
        }
        return `@group(0) @binding(${bindingIndex}) var ${this.texture.name}: texture_storage_2d<${this.texture.format}, ${this.readOrWrite}>;`
    };
}

/**
 * @file WebGPU camera utilities for WGSL shaders
 * Provides camera functions and perspective calculations for 3D rendering
 */

/**
 * Generates camera-related WGSL code
 * @param {Object} [options] - Camera configuration options
 * @param {number} [options.cameraDistance=250.0] - Base distance of camera from origin
 * @param {number} [options.rotationSpeed=0.01] - Camera rotation speed
 * @param {number} [options.fieldOfView=90.0] - Camera field of view in degrees
 * @param {number} [options.nearPlane=1.0] - Near clipping plane distance
 * @param {number} [options.farPlane=1000.0] - Far clipping plane distance
 * @param {number} [options.cameraY=-100.0] - Camera Y position
 * @returns {string} WGSL camera code
 */
function getCamStuff(options = {}) {
    const {
        cameraDistance = 250.0,
        rotationSpeed = 0.01,
        fieldOfView = 90.0,
        nearPlane = 1.0,
        farPlane = 1000.0,
        cameraY = -100.0
    } = options;

    return `
    // Camera configuration constants
    const BASE_CAMERA_DISTANCE = ${cameraDistance};
    const ROTATION_SPEED = ${rotationSpeed};            // Adjust this to change rotation speed
    const FIELD_OF_VIEW = ${fieldOfView};
    const ASPECT_RATIO = ${width / height};
    const NEAR_PLANE = ${nearPlane};
    const FAR_PLANE = ${farPlane};
    const CAMERA_UP = vec3 < f32 > (0.0, 1.0, 0.0);

    // Orthographic parameters
    const ORTHO_SIZE = 5.0;               // Size of the orthographic view (height)
    const ORTHO_WIDTH = ORTHO_SIZE * ASPECT_RATIO;
    const ORTHO_HEIGHT = ORTHO_SIZE;

    fn calculateCameraPosition() -> vec3 < f32 > {
        let angle = globalData[0].frame * ROTATION_SPEED;
        return vec3 < f32 > (
            cos(angle) * BASE_CAMERA_DISTANCE,
            ${cameraY},
            sin(angle) * BASE_CAMERA_DISTANCE
        );
    }

    fn lookAt(eye: vec3 < f32 >, targetDir: vec3 < f32 >, up: vec3 < f32 >) -> mat4x4 < f32 > {
        let f = normalize(targetDir - eye);
        let s = normalize(cross(f, up));
        let u = cross(s, f);

        return mat4x4 < f32 > (
            vec4 < f32 > (s.x, u.x, -f.x, 0.0),
            vec4 < f32 > (s.y, u.y, -f.y, 0.0),
            vec4 < f32 > (s.z, u.z, -f.z, 0.0),
            vec4 < f32 > (-dot(s, eye), -dot(u, eye), dot(f, eye), 1.0)
        );
    }

    fn perspectiveMatrix() -> mat4x4 < f32 > {
        let fovRad = radians(FIELD_OF_VIEW);
        let f = 1.0 / tan(fovRad / 2.0);

        return mat4x4 < f32 > (
            vec4 < f32 > (f / ASPECT_RATIO, 0.0, 0.0, 0.0),
            vec4 < f32 > (0.0, f, 0.0, 0.0),
            vec4 < f32 > (0.0, 0.0, (FAR_PLANE + NEAR_PLANE) / (NEAR_PLANE - FAR_PLANE), -1.0),
            vec4 < f32 > (0.0, 0.0, (2.0 * FAR_PLANE * NEAR_PLANE) / (NEAR_PLANE - FAR_PLANE), 0.0)
        );
    }

    fn worldToScreenPerspective(worldPos: vec3 < f32 >) -> vec2 < f32 > {
        let cameraPos = calculateCameraPosition();
        let viewMatrix = lookAt(cameraPos, vec3 < f32 > (0.0, 0.0, 0.0), CAMERA_UP);
        let projMatrix = perspectiveMatrix();
        let viewProj = projMatrix * viewMatrix;

        // Transform to clip space
        let clipPos = viewProj * vec4 < f32 > (worldPos, 1.0);

        // Perspective division
        let ndcPos = clipPos.xyz / clipPos.w;

        // Convert to screen coordinates [0,1]
        return vec2 < f32 > (
            (ndcPos.x + 1.0) * 0.5,
            (ndcPos.y + 1.0) * 0.5
        );
    }
    `;
}

/**
 * Creates a static camera at a specific position
 * @param {Object} position - Camera position
 * @param {number} position.x - X coordinate
 * @param {number} position.y - Y coordinate
 * @param {number} position.z - Z coordinate
 * @param {Object} [target] - Camera target position (default: origin)
 * @param {number} [target.x=0] - Target X coordinate
 * @param {number} [target.y=0] - Target Y coordinate
 * @param {number} [target.z=0] - Target Z coordinate
 * @returns {string} WGSL code for a static camera
 */
function createStaticCamera(position, target = { x: 0, y: 0, z: 0 }) {
    if (!position || typeof position !== 'object' || 
        typeof position.x !== 'number' || 
        typeof position.y !== 'number' || 
        typeof position.z !== 'number') {
        throw new Error('createStaticCamera: Valid position object with x, y, z coordinates is required');
    }

    return `
    // Static camera configuration constants
    const FIELD_OF_VIEW = 90.0;
    const ASPECT_RATIO = ${width / height};
    const NEAR_PLANE = 1.0;
    const FAR_PLANE = 1000.0;
    const CAMERA_UP = vec3 < f32 > (0.0, 1.0, 0.0);
    
    const CAMERA_POSITION = vec3<f32>(${position.x}, ${position.y}, ${position.z});
    const CAMERA_TARGET = vec3<f32>(${target.x}, ${target.y}, ${target.z});

    fn calculateCameraPosition() -> vec3 < f32 > {
        return CAMERA_POSITION;
    }

    fn lookAt(eye: vec3 < f32 >, targetDir: vec3 < f32 >, up: vec3 < f32 >) -> mat4x4 < f32 > {
        let f = normalize(targetDir - eye);
        let s = normalize(cross(f, up));
        let u = cross(s, f);

        return mat4x4 < f32 > (
            vec4 < f32 > (s.x, u.x, -f.x, 0.0),
            vec4 < f32 > (s.y, u.y, -f.y, 0.0),
            vec4 < f32 > (s.z, u.z, -f.z, 0.0),
            vec4 < f32 > (-dot(s, eye), -dot(u, eye), dot(f, eye), 1.0)
        );
    }

    fn perspectiveMatrix() -> mat4x4 < f32 > {
        let fovRad = radians(FIELD_OF_VIEW);
        let f = 1.0 / tan(fovRad / 2.0);

        return mat4x4 < f32 > (
            vec4 < f32 > (f / ASPECT_RATIO, 0.0, 0.0, 0.0),
            vec4 < f32 > (0.0, f, 0.0, 0.0),
            vec4 < f32 > (0.0, 0.0, (FAR_PLANE + NEAR_PLANE) / (NEAR_PLANE - FAR_PLANE), -1.0),
            vec4 < f32 > (0.0, 0.0, (2.0 * FAR_PLANE * NEAR_PLANE) / (NEAR_PLANE - FAR_PLANE), 0.0)
        );
    }

    fn worldToScreenPerspective(worldPos: vec3 < f32 >) -> vec2 < f32 > {
        let cameraPos = calculateCameraPosition();
        let viewMatrix = lookAt(cameraPos, CAMERA_TARGET, CAMERA_UP);
        let projMatrix = perspectiveMatrix();
        let viewProj = projMatrix * viewMatrix;

        // Transform to clip space
        let clipPos = viewProj * vec4 < f32 > (worldPos, 1.0);

        // Perspective division
        let ndcPos = clipPos.xyz / clipPos.w;

        // Convert to screen coordinates [0,1]
        return vec2 < f32 > (
            (ndcPos.x + 1.0) * 0.5,
            (ndcPos.y + 1.0) * 0.5
        );
    }
    `;
}

/**
 * Creates a first-person camera controller WGSL code
 * @param {Object} [options] - First-person camera options
 * @param {Object} [options.initialPosition={ x: 0, y: 2, z: 5 }] - Starting position
 * @param {Object} [options.initialLookAt={ x: 0, y: 0, z: 0 }] - Initial look target
 * @param {number} [options.moveSpeed=0.1] - Camera movement speed
 * @param {number} [options.sensitivity=0.003] - Mouse look sensitivity
 * @returns {string} WGSL first-person camera code
 */
function createFirstPersonCamera(options = {}) {
    const {
        initialPosition = { x: 0, y: 2, z: 5 },
        initialLookAt = { x: 0, y: 0, z: 0 },
        moveSpeed = 0.1,
        sensitivity = 0.003
    } = options;
    
    return `
    // First-person camera constants
    const CAMERA_MOVE_SPEED = ${moveSpeed};
    const MOUSE_SENSITIVITY = ${sensitivity};
    const FIELD_OF_VIEW = 70.0;
    const ASPECT_RATIO = ${width / height};
    const NEAR_PLANE = 0.1;
    const FAR_PLANE = 1000.0;
    const CAMERA_UP = vec3<f32>(0.0, 1.0, 0.0);
    
    // Camera state (should be fed from uniform buffer in real implementation)
    var<private> camera_position = vec3<f32>(${initialPosition.x}, ${initialPosition.y}, ${initialPosition.z});
    var<private> camera_front = normalize(vec3<f32>(${initialLookAt.x - initialPosition.x}, 
                                                   ${initialLookAt.y - initialPosition.y},
                                                   ${initialLookAt.z - initialPosition.z}));
    var<private> camera_right = normalize(cross(camera_front, CAMERA_UP));
    var<private> camera_up = normalize(cross(camera_right, camera_front));
    var<private> yaw = -90.0; // Default is looking along negative z
    var<private> pitch = 0.0;
    
    fn updateCameraVectors() {
        let direction = vec3<f32>(
            cos(radians(yaw)) * cos(radians(pitch)),
            sin(radians(pitch)),
            sin(radians(yaw)) * cos(radians(pitch))
        );
        
        camera_front = normalize(direction);
        camera_right = normalize(cross(camera_front, CAMERA_UP));
        camera_up = normalize(cross(camera_right, camera_front));
    }
    
    fn moveCamera(direction: i32) {
        switch direction {
            case 0: { // Forward
                camera_position += CAMERA_MOVE_SPEED * camera_front;
            }
            case 1: { // Backward
                camera_position -= CAMERA_MOVE_SPEED * camera_front;
            }
            case 2: { // Left
                camera_position -= CAMERA_MOVE_SPEED * camera_right;
            }
            case 3: { // Right
                camera_position += CAMERA_MOVE_SPEED * camera_right;
            }
            case 4: { // Up
                camera_position += CAMERA_MOVE_SPEED * CAMERA_UP;
            }
            case 5: { // Down
                camera_position -= CAMERA_MOVE_SPEED * CAMERA_UP;
            }
            default: {}
        }
    }
    
    fn rotateCamera(xoffset: f32, yoffset: f32) {
        yaw += xoffset * MOUSE_SENSITIVITY;
        pitch += yoffset * MOUSE_SENSITIVITY;
        
        // Constrain pitch
        pitch = clamp(pitch, -89.0, 89.0);
        
        updateCameraVectors();
    }
    
    fn getViewMatrix() -> mat4x4<f32> {
        let target = camera_position + camera_front;
        return lookAt(camera_position, target, camera_up);
    }
    
    fn lookAt(eye: vec3<f32>, target: vec3<f32>, up: vec3<f32>) -> mat4x4<f32> {
        let f = normalize(target - eye);
        let r = normalize(cross(f, up));
        let u = cross(r, f);
        
        return mat4x4<f32>(
            vec4<f32>(r.x, u.x, -f.x, 0.0),
            vec4<f32>(r.y, u.y, -f.y, 0.0),
            vec4<f32>(r.z, u.z, -f.z, 0.0),
            vec4<f32>(-dot(r, eye), -dot(u, eye), dot(f, eye), 1.0)
        );
    }
    
    fn perspectiveMatrix() -> mat4x4<f32> {
        let fovRad = radians(FIELD_OF_VIEW);
        let f = 1.0 / tan(fovRad / 2.0);
        
        return mat4x4<f32>(
            vec4<f32>(f / ASPECT_RATIO, 0.0, 0.0, 0.0),
            vec4<f32>(0.0, f, 0.0, 0.0),
            vec4<f32>(0.0, 0.0, (FAR_PLANE + NEAR_PLANE) / (NEAR_PLANE - FAR_PLANE), -1.0),
            vec4<f32>(0.0, 0.0, (2.0 * FAR_PLANE * NEAR_PLANE) / (NEAR_PLANE - FAR_PLANE), 0.0)
        );
    }
    
    fn worldToScreenPerspective(worldPos: vec3<f32>) -> vec2<f32> {
        let viewMatrix = getViewMatrix();
        let projMatrix = perspectiveMatrix();
        let viewProj = projMatrix * viewMatrix;
        
        // Transform to clip space
        let clipPos = viewProj * vec4<f32>(worldPos, 1.0);
        
        // Perspective division
        let ndcPos = clipPos.xyz / clipPos.w;
        
        // Convert to screen coordinates [0,1]
        return vec2<f32>(
            (ndcPos.x + 1.0) * 0.5,
            (ndcPos.y + 1.0) * 0.5
        );
    }
    `;
}

/**
 * @file WebGPU ray casting utilities for WGSL shaders
 * Provides helper functions for ray-based rendering techniques
 */

/**
 * WGSL code for 2D vector rotation
 * @type {string}
 */
const wgsl_rotate = `fn rotate(v: vec2<f32>, a: f32) -> vec2<f32> {
    let s = sin(a);
    let c = cos(a);
    return vec2<f32>(c * v.x - s * v.y, s * v.x + c * v.y);
    }`;

/**
 * WGSL code for rotating a vector around the Y axis
 * @type {string}
 */
const wgsl_rotate_y = `fn rotate_y(vec: vec3<f32>, angle: f32) -> vec3<f32> {
      let cos_theta = cos(angle);
      let sin_theta = sin(angle);
      return vec3<f32>(
          vec.x * cos_theta + vec.z * sin_theta,
          vec.y,
          -vec.x * sin_theta + vec.z * cos_theta
      );
  }`;

/**
 * WGSL struct definitions for ray casting
 * @type {string}
 */
const wgsl_rayStruct = `
  struct hit {
    dist: f32,
    index: i32,
  };

  struct Ray {
    ro: vec3<f32>,
    rd: vec3<f32>,
  };`;

/**
 * Default camera code for ray generation
 * @type {string}
 */
let cameraCode = `
  let theta = 0.0;
  let camPos = vec3<f32>(0.0, 0.0, 1000.0);
`;

/**
 * Creates a WGSL function for ray generation
 * @param {Object} [options] - Options for ray generation
 * @param {string} [options.customCameraCode] - Custom camera setup code
 * @param {number} [options.width] - Canvas width
 * @param {number} [options.height] - Canvas height
 * @returns {string} WGSL function for ray generation
 */
function createGetRayFunction(options = {}) {
    const customCameraCode = options.customCameraCode || cameraCode;
    const width = options.width || globalThis.width || 1000;
    const height = options.height || globalThis.height || 1000;

    return `
fn getRay(x: i32, y: i32) -> Ray {
    ${customCameraCode}
    camPos = rotate_y(camPos, theta);
    let lookAt = vec3<f32>(0.0, 0.0, 0.0);
    let forward = normalize(lookAt - camPos);

    // Calculate right vector (perpendicular to forward and world up)
    let worldUp = vec3<f32>(0.0, 1.0, 0.0);
    let right = normalize(cross(forward, worldUp));

    // Calculate camera's up vector
    let up = normalize(cross(right, forward));

    // Screen coordinates relative to center
    let screenX = f32(x) / 2 - ${width / 4};
    let screenY = f32(y) / 2 - ${height / 4};

    // Scale factors to control orthographic view size
    let orthoScale = 1.0; // Adjust as needed

    // For orthographic, we offset the ray origin in the plane perpendicular to viewing direction
    let ro = camPos + (right * screenX * orthoScale) + (up * screenY * orthoScale);

    // All rays have the same direction (parallel)
    let rd = forward;

    return Ray(ro, rd);
  }
`;
}

/**
 * Sets custom camera code for ray generation
 * @param {string} code - WGSL camera initialization code
 */
function setCameraCode(code) {
    if (typeof code !== 'string') {
        throw new Error('setCameraCode: Camera code must be a string');
    }
    cameraCode = code;
}

/**
 * WGSL code for ray-sphere intersection tests
 * @type {string}
 */
const wgsl_rayToSphere = `
fn rayToSphere(ro: vec3<f32>, rd: vec3<f32>, sph: sphere) -> f32 {
    let oc = ro - sph.pos;
    // Since rd is typically normalized, a = dot(rd,rd) = 1.0
    
    let b = dot(oc, rd);
    let c = dot(oc, oc) - sph.r * sph.r;
    let discriminant = b * b - c;
    
    if (discriminant < 0.0) {
        return -1.0;
    }

    let t1 = -b - sqrt(discriminant);
    let t2 = -b + sqrt(discriminant);

    if (t1 > 0.0) {
      return t1;
    }
    if (t2 > 0.0) {
      return t2;
    } else {
      return -1.0;
    }
}
fn isInSphere(pos: vec3<f32>, sph: sphere) -> bool {
  return length(pos - sph.pos) <= sph.r;
}
`;

/**
 * WGSL code for ray-plane intersection tests
 * @type {string}
 */
const wgsl_rayToPlane = `
struct Plane {
  normal: vec3<f32>,
  distance: f32,
};

fn rayToPlane(ro: vec3<f32>, rd: vec3<f32>, plane: Plane) -> f32 {
  let denom = dot(plane.normal, rd);
  
  // Check if ray is parallel to the plane
  if (abs(denom) < 0.0001) {
    return -1.0;
  }
  
  let t = -(dot(ro, plane.normal) + plane.distance) / denom;
  
  // Only return positive intersection distance (in front of the ray)
  if (t < 0.0) {
    return -1.0;
  }
  
  return t;
}
`;

/**
 * WGSL code for ray-box intersection tests
 * @type {string}
 */
const wgsl_rayToBox = `
struct Box {
  min: vec3<f32>,
  max: vec3<f32>,
};

fn rayToBox(ro: vec3<f32>, rd: vec3<f32>, box: Box) -> f32 {
  let tMin = (box.min - ro) / rd;
  let tMax = (box.max - ro) / rd;
  
  let t1 = min(tMin, tMax);
  let t2 = max(tMin, tMax);
  
  let tNear = max(max(t1.x, t1.y), t1.z);
  let tFar = min(min(t2.x, t2.y), t2.z);
  
  // Box is behind the ray or ray misses box
  if (tNear > tFar || tFar < 0.0) {
    return -1.0;
  }
  
  // Return nearest positive hit
  return tNear > 0.0 ? tNear : tFar;
}

fn isInBox(pos: vec3<f32>, box: Box) -> bool {
  return all(pos >= box.min) && all(pos <= box.max);
}
`;

/**
 * WGSL material definition for use with ray tracing
 * @type {string}
 */
const wgsl_material = `
struct Material {
  albedo: vec3<f32>,
  roughness: f32,
  metallic: f32,
  emission: vec3<f32>,
  ior: f32,
};

fn defaultMaterial() -> Material {
  return Material(
    vec3<f32>(0.8, 0.8, 0.8), // albedo (diffuse color)
    0.5,                       // roughness
    0.0,                       // metallic
    vec3<f32>(0.0, 0.0, 0.0), // emission
    1.45                       // index of refraction
  );
}
`;

/**
 * WGSL code for calculating surface normals
 * @type {string}
 */
const wgsl_normals = `
fn sphereNormal(hitPos: vec3<f32>, sphere: sphere) -> vec3<f32> {
  return normalize(hitPos - sphere.pos);
}

fn planeNormal(plane: Plane) -> vec3<f32> {
  return plane.normal;
}

fn boxNormal(hitPos: vec3<f32>, box: Box) -> vec3<f32> {
  // Find the face that was hit by checking which component is closest to the respective face
  let center = (box.min + box.max) * 0.5;
  let d = hitPos - center;
  let s = (box.max - box.min) * 0.5;
  
  let bias = 0.0001; // Small bias to avoid precision errors
  let nx = d.x / (s.x + bias);
  let ny = d.y / (s.y + bias);
  let nz = d.z / (s.z + bias);
  
  // Return normal for the face with largest value (closest to surface)
  if (abs(nx) > abs(ny) && abs(nx) > abs(nz)) {
    return vec3<f32>(sign(nx), 0.0, 0.0);
  } else if (abs(ny) > abs(nz)) {
    return vec3<f32>(0.0, sign(ny), 0.0);
  } else {
    return vec3<f32>(0.0, 0.0, sign(nz));
  }
}
`;

// wgsl.js - WGSL template literal with builder pattern

class WGSLParser {
  constructor(code) {
    this.code = code;
    this.position = 0;
    this.functions = [];
    this.body = [];
  }

  peek(offset = 0) {
    return this.code[this.position + offset] || '';
  }

  advance() {
    return this.code[this.position++] || '';
  }

  skipWhitespace() {
    while (this.position < this.code.length && /\s/.test(this.peek())) {
      this.advance();
    }
  }

  skipComment() {
    if (this.peek() === '/' && this.peek(1) === '/') {
      // Skip single line comment
      while (this.position < this.code.length && this.peek() !== '\n') {
        this.advance();
      }
      return true;
    }
    if (this.peek() === '/' && this.peek(1) === '*') {
      // Skip block comment
      this.advance(); // skip '/'
      this.advance(); // skip '*'
      while (this.position < this.code.length - 1) {
        if (this.peek() === '*' && this.peek(1) === '/') {
          this.advance(); // skip '*'
          this.advance(); // skip '/'
          break;
        }
        this.advance();
      }
      return true;
    }
    return false;
  }

  skipWhitespaceAndComments() {
    let skipped = true;
    while (skipped) {
      const before = this.position;
      this.skipWhitespace();
      this.skipComment();
      skipped = this.position > before;
    }
  }

  readIdentifier() {
    let result = '';
    while (this.position < this.code.length && /[a-zA-Z0-9_]/.test(this.peek())) {
      result += this.advance();
    }
    return result;
  }

  matchKeyword(keyword) {
    const start = this.position;
    this.skipWhitespaceAndComments();
    
    for (let i = 0; i < keyword.length; i++) {
      if (this.peek() !== keyword[i]) {
        this.position = start;
        return false;
      }
      this.advance();
    }
    
    // Make sure it's not part of a longer identifier
    if (/[a-zA-Z0-9_]/.test(this.peek())) {
      this.position = start;
      return false;
    }
    
    return true;
  }

  findMatchingBrace() {
    if (this.peek() !== '{') return -1;
    
    this.position;
    this.advance(); // skip opening brace
    
    let braceCount = 1;
    while (this.position < this.code.length && braceCount > 0) {
      this.skipWhitespaceAndComments();
      
      if (this.peek() === '{') {
        braceCount++;
        this.advance();
      } else if (this.peek() === '}') {
        braceCount--;
        this.advance();
      } else if (this.peek() === '"') {
        // Skip string literals
        this.advance(); // skip opening quote
        while (this.position < this.code.length && this.peek() !== '"') {
          if (this.peek() === '\\') {
            this.advance(); // skip escape character
          }
          this.advance();
        }
        if (this.peek() === '"') this.advance(); // skip closing quote
      } else {
        this.advance();
      }
    }
    
    return braceCount === 0 ? this.position : -1;
  }

  parseFunction() {
    const start = this.position;
    
    // Skip 'fn'
    if (!this.matchKeyword('fn')) return null;
    
    this.skipWhitespaceAndComments();
    
    // Read function name
    const name = this.readIdentifier();
    if (!name) {
      this.position = start;
      return null;
    }
    
    this.skipWhitespaceAndComments();
    
    // Find parameters
    if (this.peek() !== '(') {
      this.position = start;
      return null;
    }
    
    // Skip to after parameters
    let parenCount = 1;
    this.advance(); // skip opening paren
    while (this.position < this.code.length && parenCount > 0) {
      if (this.peek() === '(') parenCount++;
      else if (this.peek() === ')') parenCount--;
      this.advance();
    }
    
    this.skipWhitespaceAndComments();
    
    // Skip return type if present
    if (this.peek() === '-' && this.peek(1) === '>') {
      this.advance(); // skip '-'
      this.advance(); // skip '>'
      this.skipWhitespaceAndComments();
      
      // Skip return type (could be complex like vec4<f32>)
      while (this.position < this.code.length && 
             this.peek() !== '{' && 
             !/\s/.test(this.peek())) {
        if (this.peek() === '<') {
          // Skip generic parameters
          let angleCount = 1;
          this.advance();
          while (this.position < this.code.length && angleCount > 0) {
            if (this.peek() === '<') angleCount++;
            else if (this.peek() === '>') angleCount--;
            this.advance();
          }
        } else {
          this.advance();
        }
      }
    }
    
    this.skipWhitespaceAndComments();
    
    // Find function body
    const bodyEnd = this.findMatchingBrace();
    if (bodyEnd === -1) {
      this.position = start;
      return null;
    }
    
    const functionCode = this.code.slice(start, bodyEnd).trim();
    return functionCode;
  }

  parse() {
    while (this.position < this.code.length) {
      this.skipWhitespaceAndComments();
      
      if (this.position >= this.code.length) break;
      
      const fnCode = this.parseFunction();
      if (fnCode) {
        this.functions.push(fnCode);
      } else {
        // Not a function, add to body
        const lineStart = this.position;
        while (this.position < this.code.length && this.peek() !== '\n') {
          this.advance();
        }
        if (this.peek() === '\n') this.advance();
        
        const line = this.code.slice(lineStart, this.position).trim();
        if (line) {
          this.body.push(line);
        }
      }
    }
    
    return {
      functions: this.functions,
      body: this.body.join('\n')
    };
  }
}

function extractFunctionsAndBody(code) {
  try {
    const parser = new WGSLParser(code);
    return parser.parse();
  } catch (error) {
    console.warn('Parser failed, falling back to simple approach:', error);
    
    // Fallback: simple splitting approach
    const lines = code.split('\n').map(line => line.trim()).filter(line => line);
    const functions = [];
    const body = [];
    
    let inFunction = false;
    let braceCount = 0;
    let currentFunction = [];
    
    for (const line of lines) {
      if (line.startsWith('fn ')) {
        inFunction = true;
        currentFunction = [line];
        braceCount = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      } else if (inFunction) {
        currentFunction.push(line);
        braceCount += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
        
        if (braceCount === 0) {
          functions.push(currentFunction.join('\n'));
          inFunction = false;
          currentFunction = [];
        }
      } else {
        body.push(line);
      }
    }
    
    return {
      functions,
      body: body.join('\n')
    };
  }
}

class WGSLBuilder {
  constructor() {
    this.functions = [];
    this.bindings = [];
    this.structs = [];
  }

  fn(name, params, returnType, body) {
    const fnCode = `fn ${name}(${params}) -> ${returnType} {\n${body}\n}`;
    this.functions.push(fnCode);
    return this; // for chaining
  }

  binding(group, binding, type, name) {
    this.bindings.push(`@group(${group}) @binding(${binding}) var ${name}: ${type};`);
    return this;
  }

  struct(name, body) {
    this.structs.push(`struct ${name} {\n${body}\n}`);
    return this;
  }

  get main() {
    // Return a template literal function
    return (strings, ...values) => {
      // Build the complete code
      let code = '';
      
      // Add bindings
      if (this.bindings.length > 0) {
        code += this.bindings.join('\n') + '\n\n';
      }
      
      // Add structs
      if (this.structs.length > 0) {
        code += this.structs.join('\n\n') + '\n\n';
      }
      
      // Add functions
      if (this.functions.length > 0) {
        code += this.functions.join('\n\n') + '\n\n';
      }
      
      // Add main body from template literal
      const mainBody = String.raw({ raw: strings }, ...values);
      code += mainBody;
      
      // Check if main function already exists
      if (/fn\s+main\s*\(/.test(code)) {
        return code;
      }
      
      // Use existing parser to separate any remaining functions from body
      const { functions: parsedFunctions, body } = extractFunctionsAndBody(code);
      
      // Build final result
      let result = '';
      
      if (parsedFunctions.length > 0) {
        result += parsedFunctions.join('\n\n') + '\n\n';
      }
      
      result += '@compute @workgroup_size(1)\n';
      result += 'fn main(@builtin(global_invocation_id) id: vec3<u32>) {\n';
      
      if (body) {
        const indentedBody = body.split('\n')
          .map(line => line.trim() ? '  ' + line : line)
          .join('\n');
        result += indentedBody + '\n';
      }
      
      result += '}';
      
      return result;
    };
  }
}

// Original template literal function
function wgsl(strings, ...values) {
  let code = String.raw({ raw: strings }, ...values);

  // Replace width and height placeholders
  code = code.replace(/\bwidth\b/g, width.toFixed(2));
  code = code.replace(/\bheight\b/g, height.toFixed(2));

  // If code uses noise or noise2, inject the noise function implementation
  if (/\bnoise2?\s*\(/.test(code)) {
    // Only add if not already present
    if (!/fn\s+noise\s*\(/.test(code)) {
      code = getNoiseCode() + '\n\n' + code;
    }
  }

  // Remove leading/trailing whitespace but preserve internal structure
  code = code.trim();
  
  // If user already wrote main function, return as-is
  if (/fn\s+main\s*\(/.test(code)) {
    return code;
  }
  
  // Extract helper functions and body
  const { functions, body } = extractFunctionsAndBody(code);
  
  // Build the final WGSL code
  let result = '';
  
  // Add functions first
  if (functions.length > 0) {
    result += functions.join('\n\n') + '\n\n';
  }
  
  // Add main function with body
  result += '@compute @workgroup_size(1)\n';
  result += 'fn main(@builtin(global_invocation_id) id: vec3<u32>) {\n';
  
  if (body) {
    // Indent the body
    const indentedBody = body.split('\n')
      .map(line => line.trim() ? '  ' + line : line)
      .join('\n');
    result += indentedBody + '\n';
  }
  
  result += '}';
  
  return result;
}

// Add compute builder to wgsl
wgsl.compute = () => new WGSLBuilder();
// Allow setting width for parsing stage
wgsl.setWidth = (value) => { wgsl.width = value; };

/**
 * WebGPU Utils - A utility library for WebGPU development
 * @module webgpu-utils
 */


/**
 * Library version
 * @type {string}
 */
const VERSION = '0.1.0';

export { Buffer, ComputePass, RenderPass, Struct, Texture, VERSION, basicRenderCode, cameraCode, canvas, canvasPresentationFormat, choose, clearPass, createClearPass, createFirstPersonCamera, createGetRayFunction, createMatchPass, createMouseBuffer, createRenderPass, createStaticCamera, createTextures, createTimeBuffer, ctx, device, domReady, extractFunctionsAndBody, feedbackTxtr, getCamStuff, getNoiseCode, getTimeBuffer, height, init, initCanvas, isWebGPUSupported, map, matchPass, mouseBuffer, noiseBuffer, random, renderPass, renderTxtr, runPasses, setBackgroundColor, setCameraCode, timeBuffer, timeout, type_color, type_f32, type_vec2, type_vec3, type_vec4, wgsl, wgslFBM, wgslNoise, wgslNoise2, wgslNoise3, wgslVoronoi, wgsl_material, wgsl_normals, wgsl_rayStruct, wgsl_rayToBox, wgsl_rayToPlane, wgsl_rayToSphere, wgsl_rotate, wgsl_rotate_y, width };
//# sourceMappingURL=webgpu-utils.esm.js.map
