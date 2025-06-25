import { ComputePass, renderTxtr } from "../../dist/webgpu-utils.esm.js"
import { p_count, p_data } from "./passParticle.js"

export async function createTexturePass() {
  const code = `
    @compute @workgroup_size(1)
      fn main( @builtin(global_invocation_id) id: vec3<u32> ) {
        let i = id.x;

        let pos = particles[i].pos;

        // let v = length(particles[i].vel) * .1;
        // let v = particles[i].pressure.x * 10.0;
        let v = (normalize(particles[i].vel).y + 1.0) / 2.0;
        // let clr = mix(vec4<f32>(.9, .3, .1, 1.0), vec4<f32>(0.5, 0.1, 0.08, 1.0), v);
        let clr = mix(vec4<f32>(1.0, 1.0, 1.0, 1.0), vec4<f32>(0.0, 0.0, 0.0, 1.0), v);

        // let clr = vec4<f32>(1.0,1.0,1.0, 1.0);

        // var clr = vec4<f32>(0.1, .2, .8, 1.0);
        // if (particles[i].temp.x == .5){
          // clr = vec4<f32>(.8, 0.1, 0.2, 1.0);
        // }

        textureStore(renderTxtr, vec2<i32>(i32(pos.x), i32(pos.y)), clr);

        // // let r = i32(-4 * particles[i].pressure.y);
        // // let r = i32(3 * abs(particles[i].pressure.y));
        // // let r = 0;
        // for (var x = -r; x <= r; x++) {
        //   for (var y = -r; y <= r; y++) {
        //     if (x * x + y * y <= r*r) {
        //       textureStore(tex_out, vec2<i32>(i32(pos.x) + x, i32(pos.y) + y), clr);
        //     }
        //   }
        // }
    }`

  const pass = new ComputePass(code, [p_data, renderTxtr.write()], p_count)
  return pass
}