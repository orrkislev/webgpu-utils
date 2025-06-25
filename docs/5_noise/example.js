import { init, wgsl, renderPass, ComputePass, runPasses, Struct, type_f32 } from '../../dist/webgpu-utils.esm.js'
import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.20/+esm';

export async function run() {
    await init({
        containerId: 'content',
    })

    const controlsStruct = new Struct('Controls', [
        { name: 'noiseScale', type: type_f32 },
        { name: 'threshold', type: type_f32 },
        { name: 'useThreshold', type: type_f32 },
    ])
    const controls = controlsStruct.object()
    controls.noiseScale = 10.0;
    controls.threshold = 0.5;
    controls.useThreshold = 0.0;
    const controlsBuffer = controlsStruct.createBuffer('controls', controls)

    const code = wgsl`
        let pos = vec2<u32>(id.x, id.y);
        var v = noise2(vec2<f32>(f32(pos.x) / controls.noiseScale, f32(pos.y) / controls.noiseScale));
        v = (v + 1.0) * 0.5;
        if (controls.useThreshold == 1.0){
            if (v < controls.threshold) {
                v = 0.0;
            } else {
                v = 1.0;
            }
        }
        let color = vec4<f32>(v, v, v, 1.0);
        textureStore(renderTxtr, pos, color);
    `

    const pass = ComputePass.texture(code, [controlsBuffer])
    runPasses([pass, renderPass])
    
    const gui = new GUI();
    gui.add(controls, 'noiseScale', 1, 100).step(1);
    gui.add(controls, 'threshold', 0, 1).step(0.01);
    gui.add(controls, 'useThreshold', 0, 1).step(1).name('Use Threshold');

    gui.onChange(_ => {
        controlsBuffer.update([controls.noiseScale, controls.threshold, controls.useThreshold ? 1.0 : 0.0]);
        runPasses([pass, renderPass]);
    });
}
run()