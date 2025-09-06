import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  const config = {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['lucide-react'],
      include: ['three', '@react-three/fiber', '@react-three/drei'],
    },
    build: {
      outDir: 'dist',
      chunkSizeWarningLimit: 5000, // Much higher limit for large models
      rollupOptions: {
        output: {
          manualChunks: {
            three: ['three'],
          },
        },
      },
    },
    server: {
      port: 3092, // Ensure port is set to 3092
      hmr: {
        overlay: false,
      },
      watch: {
        usePolling: false,
        ignored: ['**/node_modules/**', '**/dist/**'],
      },
      fs: {
        strict: false,
      },
      maxFileSize: 100 * 1024 * 1024,
      force: true,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    },
    assetsInclude: ['**/*.glb'], // Explicitly include GLB files as assets
    base: '/', // Default for development
  };

  // Only set GitHub Pages base path for production builds
  if (command === 'build') {
    config.base = '/threejs-visualizer-/';
  }

  return config;
});
