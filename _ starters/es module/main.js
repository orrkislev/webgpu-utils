import { init, wgsl, ComputePass, renderPass, runPasses } from 'https://cdn.jsdelivr.net/npm/@orrkislev/webgpu-utils@0.1.1/+esm'

async function main() {
    // Initialize canvas and WebGPU
    await init({
        containerId: 'canvas-container'
    })

    // Create a simple gradient shader
    const gradientShader = wgsl`
                    let pos = vec2<u32>(id.x, id.y);
                    let uv = vec2<f32>(f32(pos.x) / width, f32(pos.y) / height);
                    
                    let color = vec4<f32>(uv.x, uv.y, 0.50, 1.0);
                    textureStore(renderTxtr, pos, color);
                `

    // Create and run the compute pass
    const gradientPass = ComputePass.texture(gradientShader, [])
    runPasses([gradientPass, renderPass])
}

// Run the example
main()