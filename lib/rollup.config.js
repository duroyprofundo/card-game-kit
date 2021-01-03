import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import css from 'rollup-plugin-css-porter';

export default {
  input: './src/index.js',
  output: [
    {
      file: 'dist/card-game-kit.js',
      format: 'umd',
      name: 'CardGameKit'
    },
    {
      file: 'dist/card-game-kit.min.js',
      format: 'umd',
      name: 'CardGameKit',
      plugins: [terser()]
    }
  ],
  plugins: [
    nodeResolve(),
    commonjs(),
    css({
      raw: 'dist/style.css',
      minified: 'dist/style.min.css',
    })
  ],
};