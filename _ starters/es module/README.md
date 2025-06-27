# WebGPU Utils - ES Module Starter

<div align="center">
  <img src="https://orrkislev.github.io/webgpu-utils/docs/logo.png" alt="WebGPU Utils Logo" width="200" />
</div>

This is a simple starter template that demonstrates how to use **@orrkislev/webgpu-utils** directly as an ES module from CDN without any build tools or npm installation.

## 🚀 Quick Start

1. **Copy the files**: Copy this entire folder to your project
2. **Serve the files**: Use a local server to serve the files (required for ES modules)
3. **Open in browser**: Navigate to `index.html` in your local server

### Option 1: Using Python (if you have Python installed)
```bash
# Navigate to the es module folder
cd path/to/your/es-module/folder

# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

### Option 2: Using Node.js (if you have Node.js installed)
```bash
# Install a simple server globally
npm install -g http-server

# Navigate to the folder and serve
cd path/to/your/es-module/folder
http-server
```

### Option 3: Using VS Code Live Server Extension
1. Install the "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"

## 📁 File Structure

```
es module/
├── index.html          # Main HTML file with the example
├── main.js             # JavaScript with ES module imports
├── style.css           # Basic styling
└── README.md          # This file
```

## 🔧 How It Works

This example loads the WebGPU utils library directly from CDN using ES modules:

```javascript
import { 
    init, 
    wgsl, 
    ComputePass, 
    renderPass, 
    runPasses 
} from 'https://cdn.jsdelivr.net/npm/@orrkislev/webgpu-utils@0.1.1/+esm'
```

### Benefits of ES Module Approach

✅ **No Build Step Required**: Just serve and run  
✅ **No npm Installation**: Works without Node.js/npm  
✅ **Always Up-to-Date**: Loads latest version from CDN  
✅ **Fast Setup**: Copy files and serve immediately  
✅ **No Dependencies**: Minimal project setup  

### Alternative CDN Options

**JSDelivr (current):**
```javascript
import { init, wgsl, ComputePass, renderPass, runPasses } from 'https://cdn.jsdelivr.net/npm/@orrkislev/webgpu-utils@0.1.1/+esm'
```

**Unpkg:**
```javascript
import { init, wgsl, ComputePass, renderPass, runPasses } from 'https://unpkg.com/@orrkislev/webgpu-utils@latest/dist/index.esm.js'
```

**Skypack:**
```javascript
import { init, wgsl, ComputePass, renderPass, runPasses } from 'https://cdn.skypack.dev/@orrkislev/webgpu-utils'
```

## 🎨 What This Example Does

The included example creates a simple gradient using WebGPU compute shaders:

- **Direct ES Module Import**: No build tools required
- **GPU-Accelerated Graphics**: Uses WebGPU compute shaders
- **Simple Gradient Effect**: Mathematical color interpolation
- **Minimal Setup**: Just three files to get started

## 🔍 Code Breakdown

### 1. ES Module Import
```javascript
import { 
    init, 
    wgsl, 
    ComputePass, 
    renderPass, 
    runPasses 
} from 'https://cdn.jsdelivr.net/npm/@orrkislev/webgpu-utils@0.1.1/+esm'
```

### 2. WebGPU Initialization
```javascript
await init({
    containerId: 'canvas-container'
})
```

### 3. Shader Creation
```javascript
const gradientShader = wgsl`
    let pos = vec2<u32>(id.x, id.y);
    let uv = vec2<f32>(f32(pos.x) / width, f32(pos.y) / height);
    let color = vec4<f32>(uv.x, uv.y, 0.50, 1.0);
    textureStore(renderTxtr, pos, color);
`
```

### 4. Pass Execution
```javascript
const gradientPass = ComputePass.texture(gradientShader, [])
runPasses([gradientPass, renderPass])
```

## 🌟 Next Steps

1. **Modify the shader**: Change the gradient calculation in the WGSL code
2. **Add animation**: Use `performance.now()` for time-based effects
3. **Add interaction**: Include mouse events to control the shader
4. **Experiment with patterns**: Try different mathematical functions

## 📚 Learn More About @orrkislev/webgpu-utils

The WebGPU utils library provides:

- **Easy Setup**: Simple WebGPU initialization
- **Shader Management**: WGSL template literals
- **Pass System**: Compute and render pass abstractions
- **Data Structures**: Structured buffer management
- **Utilities**: Camera, noise, and helper functions

## ⚠️ Requirements

- **Modern Browser**: Chrome 113+, Edge 113+, or Firefox with WebGPU enabled
- **Local Server**: Required for ES modules (CORS restrictions)
- **WebGPU Support**: Graphics card with WebGPU driver support

## 🐛 Troubleshooting

**"WebGPU is not supported"**: 
- Use a compatible browser version
- Enable WebGPU in browser experimental features

**"Failed to fetch module"**: 
- Serve files via HTTP/HTTPS, don't open files directly
- Check your local server is running

**"CORS error"**: 
- Use a local server instead of opening HTML files directly
- Ensure CDN resources are accessible

**Blank canvas**: 
- Check browser console for WebGPU errors
- Verify your graphics card supports WebGPU

## 🚀 When to Use This Approach

**Perfect for:**
- Quick prototypes and experiments
- Learning WebGPU concepts
- Simple demos and tutorials
- Projects without build pipelines

**Consider Vite/Build Tools when:**
- Building larger applications
- Need TypeScript support
- Want hot module replacement
- Require bundle optimization
