# WebGPU Utils - Vite Starter

<div align="center">
  <img src="https://orrkislev.github.io/webgpu-utils/docs/logo.png" alt="WebGPU Utils Logo" width="200" />
</div>

A modern Vite-based starter project for WebGPU development using the `@orrkislev/webgpu-utils` library.

## 🚀 Quick Start

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn
- A modern browser with WebGPU support (Chrome 113+, Edge 113+, or Firefox with WebGPU enabled)

### Installation

1. Clone or download this starter project
2. Navigate to the project directory:
   ```bash
   cd webgpu-vite-starter
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

### Running the Project

#### Development Server
Start the development server with hot reload:
```bash
npm run dev
```
This will start a local server at `http://localhost:3000`

#### Build for Production
Create an optimized production build:
```bash
npm run build
```
The built files will be in the `dist` directory.

#### Preview Production Build
Preview the production build locally:
```bash
npm run preview
```

## 📦 About @orrkislev/webgpu-utils

The `@orrkislev/webgpu-utils` library is a powerful utility package that simplifies WebGPU development by providing:

### Key Features

- **Easy Initialization**: Simple setup for WebGPU canvas and context
- **Shader Management**: Convenient WGSL shader creation and compilation
- **Compute Passes**: Streamlined compute shader execution
- **Render Passes**: Simplified rendering pipeline setup
- **Pass Orchestration**: Easy chaining and execution of multiple passes
- **Buffer Management**: Simplified buffer creation and data handling
- **Texture Operations**: Easy texture creation and manipulation

### Core Components

- `init()` - Initialize WebGPU context and canvas
- `wgsl` - Template literal for WGSL shader code
- `ComputePass` - Create and manage compute shaders
- `renderPass` - Built-in render pass for displaying results
- `runPasses()` - Execute multiple passes in sequence
- `Struct` - Manage structured data for shaders
- `Camera` - 3D camera controls and utilities

### Example Usage

```javascript
import { init, wgsl, ComputePass, renderPass, runPasses } from '@orrkislev/webgpu-utils'

async function main() {
    // Initialize WebGPU
    await init({
        containerId: 'canvas-container'
    })

    // Create a compute shader
    const shader = wgsl`
        let pos = vec2<u32>(id.x, id.y);
        let uv = vec2<f32>(f32(pos.x) / width, f32(pos.y) / height);
        let color = vec4<f32>(uv.x, uv.y, 0.5, 1.0);
        textureStore(renderTxtr, pos, color);
    `

    // Create and run passes
    const computePass = ComputePass.texture(shader, [])
    runPasses([computePass, renderPass])
}

main()
```

## 🏗️ Project Structure

```
src/
├── index.html      # Main HTML file
├── main.js         # Entry point with WebGPU example
└── style.css       # Styling for the canvas
vite.config.js      # Vite configuration
package.json        # Project dependencies and scripts
```

## 🔧 Configuration

The project is configured with:

- **Vite**: Modern build tool with fast HMR
- **ES Modules**: Modern JavaScript module system
- **WebGPU Utils**: Simplified WebGPU development

### Vite Configuration

The `vite.config.js` file is configured to:
- Use `src` as the root directory
- Output builds to `dist` directory
- Serve on port 3000 with host access enabled

## 🌐 Browser Support

WebGPU is supported in:
- Chrome 113+ (stable)
- Edge 113+ (stable)
- Firefox (experimental, requires enabling in about:config)
- Safari (experimental support)

## 📚 Learning Resources

- [WebGPU Fundamentals](https://webgpufundamentals.org/)
- [WebGPU Spec](https://www.w3.org/TR/webgpu/)
- [WGSL Spec](https://www.w3.org/TR/WGSL/)
- [@orrkislev/webgpu-utils Documentation](https://github.com/orrkislev/webgpu-utils)

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

## 📄 License

MIT License