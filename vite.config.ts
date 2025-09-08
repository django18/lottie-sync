/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor libraries
          'vendor-react': ['react', 'react-dom'],
          'vendor-xstate': ['xstate', '@xstate/react'],
          'vendor-lottie': ['lottie-web'],
          'vendor-dotlottie': ['@lottiefiles/dotlottie-web', '@lottiefiles/dotlottie-react'],
          'vendor-utils': ['react-dropzone', 'fflate', 'canvaskit-wasm'],

          // App chunks
          'app-machines': [
            './src/machines/syncMachine',
            './src/machines/enhancedApplicationMachine',
            './src/machines/playerMachine',
            './src/machines/syncCoordinatorMachine',
            './src/machines/fileManagerMachine',
          ],
          'app-services': [
            './src/services/playerService',
            './src/services/syncService',
            './src/services/retryService',
            './src/services/lottieParser',
            './src/services/animationPreprocessor',
            './src/services/assetBlobCache',
            './src/services/simplePlayerPool',
          ],
        },
      },
    },
    // Warn for chunks larger than 600kb instead of 500kb
    chunkSizeWarningLimit: 600,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
