import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
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
        sourcemap: false,
        // Ignore TypeScript errors during build
        rollupOptions: {
            onwarn(warning, warn) {
                // Skip certain warnings
                if (warning.code === 'UNUSED_EXTERNAL_IMPORT') return;
                warn(warning);
            }
        }
    }
});
