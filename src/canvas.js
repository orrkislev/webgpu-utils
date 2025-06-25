/**
 * @file WebGPU canvas initialization and rendering utilities
 * Provides functions to initialize a WebGPU canvas, set up the rendering context,
 * and handle basic rendering operations.
 */

import { createMatchPass, createRenderPass } from "./render_passes";
import { createMouseBuffer, createTimeBuffer } from "./utilities";

export let width, height, device;
export let canvas, canvasPresentationFormat, ctx;

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
export async function initCanvas(options = {}) {
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
        width *= 2
        height *= 2
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
export function isWebGPUSupported() {
    return typeof navigator !== 'undefined' && navigator && ('gpu' in navigator);
}

// Utility to create a promise that resolves when the DOM is loaded
export function domReady() {
    return new Promise(resolve => {
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            resolve();
        } else {
            document.addEventListener('DOMContentLoaded', () => resolve());
        }
    });
}

// Initialize the library and canvas in one call
export async function init(options = {}) {
    await domReady();
    await initCanvas(options);
    if (options.mouse) createMouseBuffer();
    if (options.time) createTimeBuffer();
    createRenderPass();
    if (options.feedback) createMatchPass();
}