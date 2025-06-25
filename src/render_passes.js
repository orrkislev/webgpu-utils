/**
 * @file WebGPU render passes for common operations
 * Provides specialized render passes for common rendering tasks
 */

import { RenderPass, ComputePass, runPasses } from './passes.js';
import { Texture } from './core.js';
import { width, height } from './canvas.js';

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
export let renderTxtr, feedbackTxtr
export let renderPass, matchPass, clearPass;

/**
 * Creates a standard render pass for displaying to screen
 * @async
 * @param {Object} [options] - Render pass options
 * @param {Array<number>} [options.bgColor] - Background color [r, g, b] (0-255)
 * @returns {Promise<RenderPass>} The configured render pass
 */
export async function createRenderPass(options = {}) {
    if (options.bgColor) {
        renderParams.bgColor = options.bgColor;
    }

    await createTextures();

    createClearPass()

    renderPass = new RenderPass(renderTxtr, basicRenderCode);
    return renderPass;
}

/**
 * Creates textures for rendering
 * @async
 * @returns {Promise<void>}
 */
export async function createTextures() {
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
export const basicRenderCode = `
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
export async function createMatchPass() {
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
export async function createClearPass() {
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
export function setBackgroundColor(color) {
    if (!Array.isArray(color) || color.length < 3) {
        throw new Error('setBackgroundColor: Expected an array of at least 3 RGB values [0-255]');
    }

    renderParams.bgColor = color.map(v => Math.max(0, Math.min(255, v)));
}

export default {
    renderParams,
    createRenderPass,
    createTextures,
    basicRenderCode,
    createMatchPass,
    createClearPass,
    setBackgroundColor
};
