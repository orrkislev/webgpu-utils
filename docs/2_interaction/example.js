import { init, wgsl, renderPass, ComputePass, runPasses } from '../../dist/webgpu-utils.esm.js'

let pass
export async function run() {

    await init({
        containerId: 'content',
        mouse: true,
    })

    const code = wgsl`
        let pos = vec2<u32>(id.x, id.y);

        let toMouse = mouse.pos - vec2<f32>(f32(id.x), f32(id.y));
        if (length(toMouse) < 20.0) {
            var color = vec4<f32>(f32(pos.x) / width, f32(pos.y) / height, .5, 1.0);
            if (mouse.button == 0) {
                color = vec4<f32>(0.0, 0.0, 0.0, 1.0);
            }
            textureStore(renderTxtr, pos, color);
        }
    `

    pass = ComputePass.texture(code, [])

    animate()
}

function animate() {
    runPasses([pass, renderPass])
    requestAnimationFrame(animate)
}

run()