import { init, wgsl, renderPass, ComputePass, runPasses } from '../../dist/webgpu-utils.esm.js'

export async function run() {

    await init({
        containerId: 'content',
    })

    const code = wgsl`
        let pos = vec2<u32>(id.x, id.y);
        let color = vec4<f32>(f32(pos.x) / width, f32(pos.y) / height, .5, 1.0);
        textureStore(renderTxtr, pos, color);
    `

    const pass = ComputePass.texture(code, [])
    runPasses([pass, renderPass])
}
run()