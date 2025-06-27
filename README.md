# WebGPU Utils

A comprehensive utility library for WebGPU development with a focus on generative art and creative coding.

## Installation

```bash
npm install webgpu-utils
```

## Getting Started

To help you get started quickly, we provide several starter templates:

- **[CDN Starter](https://orrkislev.github.io/webgpu-utils/_%20starters/cdn)** - Simple HTML file with CDN imports
- **[ES Module Starter](https://orrkislev.github.io/webgpu-utils/_%20starters/es%20module)** - Modern ES module setup
- **[Vite Starter](https://orrkislev.github.io/webgpu-utils/_%20starters/vite)** - Basic development environment with Vite

## Features

- **Rendering Utilities**: Easily create render and compute passes
- **Data Structures**: Typed struct system for efficient GPU buffer management
- **Math Utilities**: Helper functions for 2D/3D graphics and random number generation
- **Shader Helpers**: Noise functions, camera utilities, and ray casting

## Basic Usage

```javascript
import { init, wgsl, renderPass, ComputePass, runPasses } from '../../dist/webgpu-utils.esm.js'

await init()

const code = wgsl`
    let pos = vec2<u32>(id.x, id.y);
    let color = vec4<f32>(f32(pos.x) / width, f32(pos.y) / height, .5, 1.0);
    textureStore(renderTxtr, pos, color);
`

const pass = ComputePass.texture(code, [])
runPasses([pass, renderPass])
```

## Core Components

### Canvas and Device Setup

- `await init()`: Initialize WebGPU canvas and device

### Pass Types

- `RenderPass`: For rendering to the canvas or textures
- `ComputePass`: For GPGPU computations

### Textures and Buffers

- `Texture`: Create and manage WebGPU textures
- `Buffer`: Create and manage WebGPU buffers
- `Struct`: Typed data structure for GPU buffers

### Named Buffers and Textures

- `renderTxtr`: The main texture used for rendering the scene.
- `feedbackTxtr`: A texture used for feedback in the rendering process.
- `mouse`: A Buffer that stores mouse position data.
- `time`: A Buffer that stores time data for animations.

### Named Passes

- `renderPass`: The main render pass that outputs to the canvas.
- `clearPass`: A pass that clears the render texture.
- `matchPass`: A pass that draws the current frame to the feedback texture.

### Shader Utilities

- Noise functions (2D and 3D)
- Camera utilities
- Ray casting helpers

## Examples



## License

MIT
