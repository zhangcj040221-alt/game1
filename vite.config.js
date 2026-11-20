import { defineConfig } from 'vite';
export default defineConfig({ root: 'app', base: './', build: { outDir: '../dist', emptyOutDir: true, target: 'es2022', rollupOptions: {input: {main:'app/index.html',duet:'app/duet.html',cameraRig:'app/camera-rig.html',breeze:'app/breeze.html',compare:'app/compare.html',reference:'app/reference.html'}} } });
