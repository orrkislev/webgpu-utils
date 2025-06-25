/**
 * WebGPU Core Module
 * Provides basic WebGPU functionality including buffer and texture creation.
 * This module is designed to be used with the WebGPU API and requires a compatible browser.
 */

import { device } from './canvas.js';

/**
 * Create WebGPU buffer
 * @class
 */
export class Buffer {
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
        const newdata = [...new Float32Array(copyArrayBuffer)]

        // Don't forget to unmap the buffer
        readBuffer.unmap();
        return newdata
    }
}

/**
 * WebGPU Texture wrapper
 * @class
 */
export class Texture {
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
    this.resource = texture.resource
    this.name = texture.name;

    this.getBindingCode = (bindingIndex) => {
        if (this.readOrWrite === 'read' && this.texture.format == 'rgba8unorm') {
            return `@group(0) @binding(${bindingIndex}) var ${this.texture.name}: texture_2d<f32>;`
        }
        return `@group(0) @binding(${bindingIndex}) var ${this.texture.name}: texture_storage_2d<${this.texture.format}, ${this.readOrWrite}>;`
    }
}
