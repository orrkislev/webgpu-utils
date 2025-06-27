async function main() {
    // Initialize Canvas and WebGPU
    await webgpuUtils.init({
        containerId: 'canvas-container'
    })

    // Create a simple gradient shader
    const gradientShader = webgpuUtils.wgsl`
                    let pos = vec2<u32>(id.x, id.y);
                    let uv = vec2<f32>(f32(pos.x) / width, f32(pos.y) / height);
                    
                    let color = vec4<f32>(uv.x, uv.y, 0.50, 1.0);
                    textureStore(renderTxtr, pos, color);
                `

    // Create and run the compute pass
    const gradientPass = webgpuUtils.ComputePass.texture(gradientShader, [])
    webgpuUtils.runPasses([gradientPass, webgpuUtils.renderPass])
}

// Run the example
main()