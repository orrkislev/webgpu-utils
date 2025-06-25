# WebGPU Utils

A comprehensive utility library for WebGPU development with a focus on generative art and creative coding.

## Installation

```bash
npm install webgpu-utils
```

## Features

- **Rendering Utilities**: Easily create render and compute passes
- **Shader Helpers**: Noise functions, camera utilities, and ray casting
- **Data Structures**: Typed struct system for efficient GPU buffer management
- **Math Utilities**: Helper functions for 2D/3D graphics and random number generation

## Basic Usage

```javascript
import { initCanvas, RenderPass, Texture, runPasses } from 'webgpu-utils';

// Initialize WebGPU canvas
await initCanvas();

// Create a texture
const texture = new Texture('myTexture', width, height);

// Create a render pass with a shader
const renderPass = new RenderPass(texture, `
  // Your WGSL shader code here
  @vertex fn vs(@builtin(vertex_index) vertexIndex : u32) -> @builtin(position) vec4f {
    // ...
  }
  
  @fragment fn fs() -> @location(0) vec4f {
    // ...
  }
`);

// Run the render pass
runPasses([renderPass]);
```

## Core Components

### Canvas and Device Setup

- `initCanvas()`: Initialize WebGPU canvas and device

### Pass Types

- `RenderPass`: For rendering to the canvas or textures
- `ComputePass`: For GPGPU computations

### Textures and Buffers

- `Texture`: Create and manage WebGPU textures
- `Buffer`: Create and manage WebGPU buffers
- `Struct`: Typed data structure for GPU buffers

### Shader Utilities

- Noise functions (2D and 3D)
- Camera utilities
- Ray casting helpers

## Examples

### Creating a Simple Shader

```javascript
import { initCanvas, runPasses, RenderPass, Texture } from 'webgpu-utils';

await initCanvas();

// Create a texture
const texture = new Texture('output', width, height);

// Create a simple render pass that fills the screen with a gradient
const renderPass = new RenderPass(texture, `
  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
  };

  @vertex fn vs(@builtin(vertex_index) vertexIndex : u32) -> VertexOutput {
    let pos = array(
      vec2f(-1.0, -1.0), vec2f(1.0, -1.0),
      vec2f(-1.0, 1.0), vec2f(-1.0, 1.0),
      vec2f(1.0, -1.0), vec2f(1.0, 1.0),
    );

    var output: VertexOutput;
    let xy = pos[vertexIndex];
    output.position = vec4f(xy, 0.0, 1.0);
    output.uv = vec2f((xy.x + 1.0) / 2.0, 1.0-(xy.y + 1.0) / 2.0);
    return output;
  }

  @fragment fn fs(input: VertexOutput) -> @location(0) vec4f {
    return vec4f(input.uv, 0.5, 1.0);
  }
`);

// Run the render pass
runPasses([renderPass]);
```

## License

MIT
