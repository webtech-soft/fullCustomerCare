import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3001,
    host: '0.0.0.0',
    proxy: {
      '/api/hits': {
        target: 'https://www.aasys-portal.com',
        changeOrigin: true,
        secure: false, // Disable strict SSL verification for dev environment
        rewrite: (path) => path.replace(/^\/api\/hits/, '/hits/Posv1/HitsAPI'),
        configure: (proxy, _options) => {
          proxy.on('error', (err, req, res) => {
            console.error('Proxy error:', err.message)
          })
        },
      },
      '/api/inspections': {
        target: 'https://hitsdigital-portal.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/inspections/, '/apps/app-function.php'),
        configure: (proxy, _options) => {
          proxy.on('error', (err, req, res) => {
            console.error('Inspections proxy error:', err.message)
          })
        },
      },
      '/chat': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})

