// Jest setup file
// Mock WebGPU API for tests

// Mock for WebGPU features
global.GPUBufferUsage = {
  STORAGE: 0x0080,
  COPY_DST: 0x0008,
  TEXTURE_BINDING: 0x0020
};

global.GPUTextureUsage = {
  COPY_DST: 0x0002,
  STORAGE_BINDING: 0x0080,
  TEXTURE_BINDING: 0x0004
};

// Mock for canvas size in tests
global.width = 1000;
global.height = 800;

// Suppress console errors during tests
const originalConsoleError = console.error;
console.error = (...args) => {
  if (args[0] && args[0].includes && args[0].includes('WebGPU')) {
    return;
  }
  originalConsoleError(...args);
};
