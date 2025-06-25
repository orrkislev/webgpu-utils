import { init, wgsl, renderPass, ComputePass, clearPass, runPasses, Struct, random, width, height, type_vec2, createClearPass } from '../../dist/webgpu-utils.esm.js'

let particlePass
export async function run() {

    await init({
        containerId: 'content',
    })

    const particleStruct = new Struct('Particle', [
        { name: 'pos', type: type_vec2 },
        { name: 'vel', type: type_vec2 },
    ])

    const totalParticles = 100000
    const particles = []
    for (let i = 0; i < totalParticles; i++) {
        const newParticle = particleStruct.object()
        newParticle.pos = {x:random(width * .4, width * .6), y:random(height * .4, height * .6)}
        newParticle.vel = {x:random(-100, 100), y:random(-100, 100)}
        particles.push(newParticle)
    }
    const particlesBuffer = particleStruct.createBuffer('particles', particles)

    const particlePassCode = wgsl`
        var p = particles[id.x];
        p.pos += p.vel * 0.1;
        if (p.pos.x > width || p.pos.x < 0.0) {
            p.vel.x *= -1.0;
        }
        if (p.pos.y > height || p.pos.y < 0.0) {
            p.vel.y *= -1.0;
        }
        particles[id.x] = p;

        textureStore(renderTxtr, vec2<u32>(u32(p.pos.x), u32(p.pos.y)), vec4f(1.0));

    `
    particlePass = new ComputePass(particlePassCode, [particlesBuffer], totalParticles)
    animate()
}

async function animate() {
    runPasses([clearPass, particlePass, renderPass])

    requestAnimationFrame(animate)
}

run()