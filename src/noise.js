/**
 * @file WebGPU shader noise utilities
 * Provides noise functions for WGSL shaders
 */

import { Buffer } from './core.js';

export let noiseBuffer;

/**
 * Get WGSL code for noise functions
 * @returns {string} WGSL noise functions code
 */
export function getNoiseCode() {
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
export const wgslNoise = `
fn rand(n: f32) -> f32 { return fract(sin(438.347 * n / 10000)); }
fn noise1(p: f32) -> f32 {
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
export const wgslNoise2 =
  `fn mod289(x: vec2<f32>) -> vec2<f32> {return x - floor(x * (1. / 289.)) * 289.;}
fn mod289_3(x: vec3<f32>) -> vec3<f32> {return x - floor(x * (1. / 289.)) * 289.;}
fn permute3(x: vec3<f32>) -> vec3<f32> {return mod289_3(((x * 34.) + 1.) * x);}
fn noise2(v: vec2<f32>) -> f32 {
  let v2 = v + noiseOffset.xy;
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
 * FBM (Fractal Brownian Motion) noise for WGSL
 * @type {string}
 */
export const wgslFBM = `
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
export const wgslVoronoi = `
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

export default {
  getNoiseCode,
  wgslNoise,
  wgslNoise2,
  wgslNoise3,
  wgslFBM,
  wgslVoronoi,
  noiseBuffer
};
