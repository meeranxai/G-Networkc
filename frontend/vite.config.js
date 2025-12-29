import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Bundle optimization
    rollupOptions: {
      output: {
        // Code splitting for better caching
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          socket: ['socket.io-client']
        },
        // Optimize chunk sizes
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/\.(css)$/.test(assetInfo.name)) {
            return `assets/css/[name]-[hash].${ext}`;
          }
          return `assets/[name]-[hash].${ext}`;
        }
      }
    },
    // Optimize bundle size
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      }
    },
    // Reduce chunk size warnings
    chunkSizeWarningLimit: 1000
  },
  // Development optimizations
  server: {
    port: 5174,
    host: true,
    hmr: {
      overlay: false
    }
  },
  // CSS optimizations for production
  css: {
    devSourcemap: false,
    postcss: false,
    // Ensure CSS is properly bundled for Vercel
    preprocessorOptions: {
      css: {
        charset: false
      }
    }
  },
  // Ensure proper asset handling
  assetsInclude: ['**/*.css']
})
