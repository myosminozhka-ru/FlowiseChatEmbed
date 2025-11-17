import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import { babel } from '@rollup/plugin-babel';
import json from '@rollup/plugin-json';
import postcss from 'rollup-plugin-postcss';
import autoprefixer from 'autoprefixer';
import tailwindcss from 'tailwindcss';
import typescript from '@rollup/plugin-typescript';
import { typescriptPaths } from 'rollup-plugin-typescript-paths';
import commonjs from '@rollup/plugin-commonjs';
import serve from 'rollup-plugin-serve';
import livereload from 'rollup-plugin-livereload';

const isDev = process.env.NODE_ENV === 'development';

const extensions = ['.ts', '.tsx'];

const plugins = [
  // typescriptPaths должен быть ПЕРВЫМ, чтобы разрешать пути до компиляции
  typescriptPaths({
    preserveExtensions: false,
    tsConfigPath: './tsconfig.json',
  }),
  resolve({ extensions, browser: true }),
  commonjs(),
  json(),
  typescript({
    tsconfig: './tsconfig.json',
  }),
  babel({
    babelHelpers: 'bundled',
    exclude: 'node_modules/**',
    presets: ['solid', '@babel/preset-typescript'],
    extensions,
  }),
  postcss({
    plugins: [autoprefixer(), tailwindcss()],
    extract: false,
    modules: false,
    autoModules: false,
    minimize: !isDev,
    inject: false,
  }),
];

// Добавляем минификацию только в production
if (!isDev) {
  plugins.push(terser({ output: { comments: false } }));
}

// Добавляем dev сервер и livereload только в development
if (isDev) {
  plugins.push(
    serve({
      open: true,
      contentBase: ['dist', 'public'],
      host: 'localhost',
      port: 5678,
    }),
    livereload({
      watch: ['dist', 'public'],
    }),
  );
}

const indexConfig = {
  context: 'this',
  plugins,
};

const configs = [
  {
    ...indexConfig,
    input: './src/web.ts',
    output: {
      file: 'dist/web.js',
      format: 'es',
    },
  },
  {
    ...indexConfig,
    input: './src/web.ts',
    output: {
      file: 'dist/web.umd.js',
      format: 'umd',
      name: 'OsmiAIEmbed',
    },
  },
];

export default configs;
