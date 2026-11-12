import { defineConfig } from 'vite';
export default defineConfig({ root: 'app', base: './', build: { outDir: '../dist', emptyOutDir: true, target: 'es2022', rollupOptions: {input: {main:'app/index.html',compare:'app/compare.html'}} } });
