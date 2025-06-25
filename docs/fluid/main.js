import { createClearPass, init, renderPass, runPasses} from "../../dist/webgpu-utils.esm.js"
import { makeParticlePass } from "./passParticle.js"
import { createTexturePass } from "./passTexture.js"
import { createMousePass, makeFillHashGridPass, makePressurePass, makeResetHashGridPass } from "./passHashGrid.js"

export const numParticles = 500000

export const pressureGravity = 10.0
export const gravity = 1.0

export const damping = .98

export const densityRadius = 10
export const targetDensity = 6

export const renderParams = {
    bgColor: [0, 0, 0]
}

let particlePass, texturePass, clearPass, resetHashGridPass, fillHashGridPass, pressurePass, mousePass
export async function main() {
    await init({
        containerId: 'bg',
        mouse: true,
        time: true,
    })

    particlePass = await makeParticlePass()
    texturePass = await createTexturePass()
    clearPass = await createClearPass()
    resetHashGridPass = await makeResetHashGridPass()
    fillHashGridPass = await makeFillHashGridPass()
    pressurePass = await makePressurePass()
    mousePass = await createMousePass()
    
    animate()
}

function animate(){
    runPasses([particlePass,
        resetHashGridPass,
        fillHashGridPass,
        pressurePass,
        mousePass,
    ])

    runPasses([clearPass, texturePass, renderPass])

    requestAnimationFrame(animate)
}
main()