import { ComputePass, height, random, Struct, timeBuffer, type_vec2, width } from "../../dist/webgpu-utils.esm.js"
import { damping, gravity, numParticles, pressureGravity } from "./main.js"

export let p_struct, p_data, p_count


export async function makeParticlePass() {
    p_count = numParticles
    createData(p_count)

    const shaderCode = `
      fn sdRoundedBox( p: vec2f, b:vec2f, r: f32) -> f32{
        let q = abs(p)-b+r;
        return min(max(q.x,q.y),0.0) + length(max(q,vec2(0.0,0.0))) - r;
        }

      @compute @workgroup_size(1) 
      fn main( @builtin(global_invocation_id) id: vec3<u32> ) {
        let i = id.x;

        var center = vec2<f32>(${width / 2}, ${height * .5});
        center.y += sin(time * 3.3) * 600.0;
        let dir = normalize(particles[i].pos - center);

        // force to center
        // particles[i].vel -= dir * .9;

        // rotate around center, add velocity to rotate
        // if (length(particles[i].pos - center) < 300.0) {
        //     let dir = normalize(particles[i].pos - center);
        //     let newDir = vec2<f32>(dir.y, -dir.x);
        //     let force = 1. -length(particles[i].pos - center) / 30.0;
        //     particles[i].vel += newDir * force * 10.0;
        // }

        if (length(particles[i].vel) > 20.0) {
            particles[i].vel *= 20.0 / length(particles[i].vel);
        }
        particles[i].vel *= ${damping.toFixed(1)};
        particles[i].vel.y -= particles[i].pressure.x * ${pressureGravity.toFixed(1)};
        particles[i].vel.y += ${gravity.toFixed(1)};

        // particles[i].vel.y -= particles[i].temp.x;
        // if (particles[i].pos.y > ${height * .7}) {
        //     particles[i].temp.x += 0.01;
        // } else {
        //     particles[i].temp.x -= 0.001;
        // }


        particles[i].pos += particles[i].vel;

        let circleOffset = sin(time*.3) * 0.0;
        if (length(particles[i].pos - vec2<f32>(${width / 2}, ${height / 2} + circleOffset)) > 700.0) {
            var dir = normalize(particles[i].pos - vec2<f32>(${width / 2}, ${height / 2} + circleOffset));
            dir = vec2<f32>(dir.y, -dir.x);
            // particles[i].vel += dir * 40.0;
            particles[i].pos -= particles[i].vel * 1.5;
            particles[i].vel *= -.3;
            if (particles[i].pos.x > ${width / 2}) {
                // particles[i].pos.x -= .1;
                particles[i].vel.x -= .1;
            } else {
                // particles[i].pos.x += .1;
                particles[i].vel.x += .1;
            }
        }

        // if (particles[i].pos.x < ${width / 2}-600.0 || particles[i].pos.x > ${width / 2}+600.0) {
        //     particles[i].pos -= particles[i].vel * 2.0;
        //     particles[i].vel.x *= -.3;
        // }

        // if (particles[i].pos.y < ${height / 2}-600.0 || particles[i].pos.y > ${height / 2}+600.0) {
        //     particles[i].pos -= particles[i].vel * 2.0;
        //     particles[i].vel.y *= -.3;
        // }
      }
    `

    const pass = new ComputePass(shaderCode, [p_data, timeBuffer], p_count)
    return pass
}




function createData(count) {
    p_struct = new Struct('particle', [
        { name: 'pos', type: type_vec2 },
        { name: 'vel', type: type_vec2 },
        { name: 'pressure', type: type_vec2 },
        { name: 'temp', type: type_vec2 }
    ])

    p_data = Array(count).fill(0).map((_, i) => newParticle(i))
    p_data = p_struct.createBuffer('particles', p_data)
}

function newParticle(i) {
    const obj = p_struct.object()
    obj.pos = {
        x: random(width * .4, width * .6),
        y: random(height * .4, height * .6)
    }
    obj.vel = { x: 0, y: 0 }
    obj.temp = { x: random() < .5 ? 1 : 1, y: 0 }
    return obj
}