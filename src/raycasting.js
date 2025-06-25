/**
 * @file WebGPU ray casting utilities for WGSL shaders
 * Provides helper functions for ray-based rendering techniques
 */

/**
 * WGSL code for 2D vector rotation
 * @type {string}
 */
export const wgsl_rotate = `fn rotate(v: vec2<f32>, a: f32) -> vec2<f32> {
    let s = sin(a);
    let c = cos(a);
    return vec2<f32>(c * v.x - s * v.y, s * v.x + c * v.y);
    }`;

/**
 * WGSL code for rotating a vector around the Y axis
 * @type {string}
 */
export const wgsl_rotate_y = `fn rotate_y(vec: vec3<f32>, angle: f32) -> vec3<f32> {
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
export const wgsl_rayStruct = `
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
export let cameraCode = `
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
export function createGetRayFunction(options = {}) {
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
export function setCameraCode(code) {
    if (typeof code !== 'string') {
        throw new Error('setCameraCode: Camera code must be a string');
    }
    cameraCode = code;
}

/**
 * WGSL code for ray-sphere intersection tests
 * @type {string}
 */
export const wgsl_rayToSphere = `
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
export const wgsl_rayToPlane = `
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
export const wgsl_rayToBox = `
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
export const wgsl_material = `
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
export const wgsl_normals = `
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

export default {
    wgsl_rotate,
    wgsl_rotate_y,
    wgsl_rayStruct,
    cameraCode,
    createGetRayFunction,
    setCameraCode,
    wgsl_rayToSphere,
    wgsl_rayToPlane,
    wgsl_rayToBox,
    wgsl_material,
    wgsl_normals
};
