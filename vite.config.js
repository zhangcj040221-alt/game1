import { cp } from 'node:fs/promises';
import { defineConfig } from 'vite';
export default defineConfig({ root: 'app', plugins: [{name:'standalone-adventure',writeBundle:()=>cp('adventure','dist/adventure',{recursive:true})}], base: './', build: { outDir: '../dist', emptyOutDir: true, target: 'es2022', rollupOptions: {input: {main:'app/index.html',compare:'app/compare.html',reference:'app/reference.html'}} } });
