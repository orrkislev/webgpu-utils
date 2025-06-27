# WebGPU Utils - CDN Starter

<div align="center">
  <img src="https://orrkislev.github.io/webgpu-utils/docs/logo.png" alt="WebGPU Utils Logo" width="200" />
</div>

This is a simple starter template that demonstrates how to use **@orrkislev/webgpu-utils** via CDN without any build tools.

## 🚀 Quick Start

1. **Copy the files**: Copy this entire `CDN` folder to your project
2. **Update the import path**: Edit the import path in `index.html` to point to your `webgpu-utils.esm.js` file
3. **Serve the files**: Use a local server to serve the files (required for ES modules)

### Option 1: Using Python (if you have Python installed)
```bash
# Navigate to the CDN folder
cd path/to/your/CDN/folder

# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

### Option 2: Using Node.js (if you have Node.js installed)
```bash
# Install a simple server globally
npm install -g http-server

# Navigate to the CDN folder and serve
cd path/to/your/CDN/folder
http-server
```

### Option 3: Using VS Code Live Server Extension
1. Install the "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"

## 📁 File Structure

```
CDN/
├── index.html          # Main HTML file with the example
└── README.md          # This file
```

## 🔧 Customization

### Updating the Import Path

In `index.html`, update this line to point to your library:

```javascript
import { 
    init, 
    wgsl, 
    ComputePass, 
    renderPass, 
    runPasses,
    Struct 
} from '../../dist/webgpu-utils.esm.js'  // Update this path
```

### Example Scenarios

**If using from npm CDN:**
```javascript
import { init, wgsl, ComputePass, renderPass, runPasses } from 'https://unpkg.com/@orrkislev/webgpu-utils/dist/webgpu-utils.esm.js'
```

**If hosting locally:**
```javascript
import { init, wgsl, ComputePass, renderPass, runPasses } from './js/webgpu-utils.esm.js'
```

**If using from your own server:**
```javascript
import { init, wgsl, ComputePass, renderPass, runPasses } from '/assets/js/webgpu-utils.esm.js'
```

## 🎨 What This Example Does

The included example creates a beautiful animated gradient using:

- **WebGPU Compute Shaders**: For GPU-accelerated graphics
- **Real-time Animation**: Smooth 60fps animations
- **Gradient Effects**: Mathematical wave functions for visual appeal
- **Responsive Design**: Works on different screen sizes

## 🔍 Code Breakdown

### 1. Initialization
```javascript
await init({
    containerId: 'canvas-container',
    width: 800,
    height: 600
})
```

### 2. Shader Creation
```javascript
const animationCode = wgsl`
    // Your WGSL shader code here
    let pos = vec2<u32>(id.x, id.y);
    // ... gradient calculations
    textureStore(renderTxtr, pos, color);
`
```

### 3. Animation Loop
```javascript
function animate() {
    uniformStruct.time = performance.now()
    runPasses([animationPass, renderPass])
    requestAnimationFrame(animate)
}
```

## 🌟 Next Steps

1. **Modify the shader**: Change the `animationCode` to create your own visual effects
2. **Add interaction**: Use mouse events to control the animation
3. **Add more passes**: Create multiple compute passes for complex effects
4. **Experiment with data**: Use the `Struct` system to pass different data to shaders

## 📚 Learn More

- [Main Documentation](../../docs/)
- [More Examples](../../docs/examples/)
- [GitHub Repository](https://github.com/orrkislev/webgpu-utils)

## ⚠️ Requirements

- Modern browser with WebGPU support (Chrome 113+, Edge 113+)
- Local server (due to ES modules CORS restrictions)
- Graphics card with WebGPU support

## 🐛 Troubleshooting

**"WebGPU is not supported"**: 
- Make sure you're using a compatible browser
- Enable WebGPU in browser flags if needed

**"Failed to fetch module"**: 
- Ensure you're serving the files via HTTP/HTTPS, not opening directly in browser
- Check that the import path is correct

**Blank canvas**: 
- Check browser console for error messages
- Verify WebGPU is properly initialized
