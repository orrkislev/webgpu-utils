import { ComputePass, height, Texture, width } from "../../dist/webgpu-utils.esm.js"
import { p_count, p_data } from "./passParticle.js"
import { densityRadius, targetDensity } from "./main.js"

export let hashTxtr
export async function makeResetHashGridPass() {
  hashTxtr = new Texture('hashTxtr', width, height, 'rgba16sint')

  const shaderCode = `
    @compute @workgroup_size(1)
    fn main( @builtin(global_invocation_id) id: vec3<u32> ) {
      let x : i32 = i32(id.x);
      let y : i32 = i32(id.y);
      textureStore(hashTxtr, vec2<i32>(x, y), vec4<i32>(-1, -1, -1, -1));
    }
  `
  const pass = new ComputePass(shaderCode, [hashTxtr.write()], [width, height])
  return pass
}

export async function makeFillHashGridPass() {
  const shaderCode = `
      @compute @workgroup_size(1)
      fn main( @builtin(global_invocation_id) id: vec3<u32> ) {
        let i = i32(id.x);
        let p = particles[i];
        let x = i32(p.pos.x);
        let y = i32(p.pos.y);
        textureStore(hashTxtr, vec2<i32>(x, y), vec4<i32>(i, -1, -1, -1));
      }
    `
  const pass = new ComputePass(shaderCode, [p_data, hashTxtr.write()], p_count)
  return pass
}


export async function makePressurePass() {
  const shaderCode = `
    @compute @workgroup_size(1)
    fn main( @builtin(global_invocation_id) id: vec3<u32> ) {
      let i = i32(id.x);
      let p = particles[i];
      let x = i32(p.pos.x);
      let y = i32(p.pos.y);

      var density = 0.0;
      var dir = vec2<f32>(0.0, 0.0);

      let r = ${densityRadius};
      for (var dx = i32(-r); dx <= r; dx++) {
        for (var dy = i32(-r); dy <= r; dy++) {
          if (dx * dx + dy * dy > r * r) {
            continue;
          }

          let hash = vec2<i32>(x + dx, y + dy);
          let index = textureLoad(hashTxtr, hash).x;
          if (index != -1) {
            let offset = vec2<f32>(f32(dx),f32(dy));
            let dist = length(offset);
            var weight = max(0.0, 1.0 - dist / f32(r));
            // if (particles[i].temp.x != particles[index].temp.x) {
              // weight *= .5;
            // }
            density += weight;
            dir += offset * weight;
          }
        }
      }

      density /= f32(r);
      let targetDensity = ${targetDensity.toFixed(1)};
      let pressure = -(density - targetDensity) * .1;

      particles[i].pressure.x = pressure;
      particles[i].pressure.y = mix(particles[i].pressure.y, particles[i].pressure.x, .001);

      particles[i].vel += dir * pressure * .5;
    }
  `

  const pass = new ComputePass(shaderCode, [p_data, hashTxtr.read()], p_count)
  return pass
}

export async function createMousePass() {
  const shaderCode = `
    @compute @workgroup_size(1)
    fn main( @builtin(global_invocation_id) id: vec3<u32> ) {
      let i = i32(id.x);
      let p = particles[i];
      if (length(p.pos - mouse.pos) < 300.0) {
        particles[i].vel += f32(mouse.button * 2.0 - 1.0) * (p.pos - mouse.pos) / 50.0;
        // particles[i].vel *= 0.0;
      }
    }
  `

  const pass = new ComputePass(shaderCode, [p_data], p_count)
  return pass
}