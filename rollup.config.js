import { terser } from 'rollup-plugin-terser';

export default {
  input: 'src/index.js',
  output: [
    {
      file: 'dist/webgpu-utils.js',
      format: 'umd',
      name: 'webgpuUtils',
      sourcemap: true
    },
    {
      file: 'dist/webgpu-utils.min.js',
      format: 'umd',
      name: 'webgpuUtils',
      plugins: [terser()],
      sourcemap: true
    },
    {
      file: 'dist/webgpu-utils.esm.js',
      format: 'es',
      sourcemap: true
    }
  ]
};
