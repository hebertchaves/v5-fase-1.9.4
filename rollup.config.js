// Modifique o arquivo rollup.config.js
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';
import copy from 'rollup-plugin-copy'; // Você pode precisar instalar este pacote: npm install rollup-plugin-copy --save-dev

export default {
  input: 'src/code.ts',
  output: {
    file: 'dist/code.js',
    format: 'iife',
    name: 'quasarToFigmaConverter'
  },
  plugins: [
    resolve(),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.json',
      sourceMap: false
    }),
    // Adicione este plugin para copiar o arquivo HTML
    copy({
      targets: [
        { src: 'src/ui.html', dest: 'dist' }
      ]
    }),
    process.env.NODE_ENV === 'production' && terser()
  ]
};