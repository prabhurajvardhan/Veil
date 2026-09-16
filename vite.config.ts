import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';

function copyAssets() {
  return {
    name: 'copy-extension-assets',
    writeBundle() {
      fs.copyFileSync(
        resolve(__dirname, 'manifest.json'),
        resolve(__dirname, 'dist/manifest.json')
      );
      if (fs.existsSync(resolve(__dirname, 'test-target.html'))) {
        fs.copyFileSync(
          resolve(__dirname, 'test-target.html'),
          resolve(__dirname, 'dist/test-target.html')
        );
      }
    }
  };
}

export default defineConfig({
  plugins: [react(), copyAssets()],
  define: {
    'process.env.GROQ_API_KEY': JSON.stringify(process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || ''),
    'process.env.GROQ_MODEL': JSON.stringify(process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'),
    'process.env.LLM_ENDPOINT': JSON.stringify(process.env.LLM_ENDPOINT || ''),
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: 'all'
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        background: resolve(__dirname, 'src/m01-core/background.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    }
  }
});

