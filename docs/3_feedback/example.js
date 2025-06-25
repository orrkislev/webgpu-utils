import { init, wgsl, matchPass, renderPass, ComputePass, runPasses } from '../../dist/webgpu-utils.esm.js'

let pass
export async function run() {

    await init({
        containerId: 'content',
        mouse: true,
        time: true,
        feedback: true,
    })

    const code = wgsl`
        let pos = vec2<u32>(id.x, id.y);

        var color = textureLoad(feedbackTxtr, pos, 0);
        color -= 0.01;
        
        let toMouse = mouse.pos - vec2<f32>(f32(id.x), f32(id.y));
        let r = sin(time * 2) * 30.0 + 60.0;
        if (length(toMouse) < r) {
            color += (1.0-length(toMouse) / r) * 0.1;
        }

        textureStore(renderTxtr, pos, color);
    `

    pass = ComputePass.texture(code, [])
    animate()
}

async function animate() {
    runPasses([matchPass, pass, renderPass])

    requestAnimationFrame(animate)
}

run()