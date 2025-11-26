import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/planora/',
  define: {
    'global': 'globalThis',
  },
  resolve: {
    alias: {
      'process': 'process/browser',
      'buffer': 'buffer',
    },
  },
  optimizeDeps: {
    include: ['buffer', 'process'],
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'chart-vendor': ['recharts'],
          'three-vendor': ['three'],
        }
      }
    }
  }
})
