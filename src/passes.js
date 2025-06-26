// RenderPass and ComputePass classes extracted from render.js

import { device, ctx, canvasPresentationFormat, width, height } from './canvas.js';
import { noiseBuffer } from './noise.js';
import { renderTxtr, feedbackTxtr } from './render_passes.js';
import { mouseBuffer, timeBuffer } from './utilities.js';

export class RenderPass {
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


export class ComputePass {
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

        if (/\bnoise\s*\(|\bnoise2\s*\(|\bnoise3\s*\(/.test(code)) {
            if (noiseBuffer) bindings.push(noiseBuffer)
        }


        if (bindings.some(b => Array.isArray(b))) {
            const multipleBuffer = bindings.find(b => Array.isArray(b))
            const multipleBufferIndex = bindings.findIndex(b => Array.isArray(b))
            return multipleBuffer.map((buffer, i) => {
                const newBindings = bindings.slice()
                newBindings[multipleBufferIndex] = buffer
                return new ComputePass(code, newBindings, buffer.count, entryPoint)
            })
        }

        let bindingsCode = ''
        bindings.forEach((binding, i) => {
            bindingsCode += binding.getBindingCode(i) + '\n';
        })
        code = bindingsCode + code;

        bindings.forEach(binding => {
            if (binding.struct) code = binding.struct.code + '\n' + code;
        })

        this.code = code

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
export function runPasses(passes, repeats = 1) {
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