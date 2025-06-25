import { Buffer } from './core.js';
import { Struct, type_f32, type_vec2 } from './struct.js';
import { canvas, height, width } from './canvas.js';

/**
 * Generates a random number between two values
 * @param {number} [a=1] - Upper bound (if only one argument is provided) or range
 * @param {number} [b=0] - Lower bound
 * @returns {number} Random number between a and b
 */
export const random = (a = 1, b = 0) => Math.random() * (a - b) + b;

/**
 * Selects a random element from an array
 * @param {Array} arr - The array to select from
 * @returns {*} Random element from the array
 * @throws {Error} If the array is empty or not an array
 */
export const choose = (arr) => {
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
export const timeout = async (ms = 10) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Maps a value from one range to another
 * @param {number} val - The value to map
 * @param {number} inMin - Input range minimum
 * @param {number} inMax - Input range maximum
 * @param {number} outMin - Output range minimum
 * @param {number} outMax - Output range maximum
 * @returns {number} Mapped value
 */
export const map = (val, inMin, inMax, outMin, outMax) =>
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
export let mouseBuffer = null;
export function createMouseBuffer() {
    if (!canvas) {
        throw new Error('createMouseBuffer: Canvas is not defined');
    }
    const mouseStruct = new Struct('mouseStruct', [
        { name: 'pos', type: type_vec2 },
        { name: 'button', type: type_f32 }
    ])
    mouseBuffer = mouseStruct.createBuffer('mouse', mouseStruct.object())
    const mouseEvent = (e) => {
        const rect = canvas.getBoundingClientRect()
        const mouseIsDown = e.buttons == 1 ? 0 : 1
        // mouseBuffer.update(mouseStruct.toFloat32Array([newMouseData]))
        mouseBuffer.update(new Float32Array([
            width * (e.clientX - rect.left) / rect.width,
            height * (e.clientY - rect.top) / rect.height,
            mouseIsDown
        ]))
    }
    canvas.addEventListener('mousemove', mouseEvent)
    canvas.addEventListener('mousedown', mouseEvent)
    canvas.addEventListener('mouseup', mouseEvent)
}


/** * Creates a time buffer that updates with the current time in seconds
 * @returns {Buffer} Time buffer that updates with the current time
 * @example
 * createTimeBuffer();
 * // This will create a buffer that updates with the current time in seconds
 */
export let timeBuffer = null;
export function getTimeBuffer() {
    if (!timeBuffer) {
        throw new Error('getTimeBuffer: Time buffer has not been created yet');
    }
    return timeBuffer;
}
export function createTimeBuffer() {
    timeBuffer = new Buffer('time', new Float32Array([0]))
    setInterval(() => {
        timeBuffer.update(new Float32Array([performance.now() / 1000]))
    }, 1000 / 60) // Update at 60 FPS
    return timeBuffer
}