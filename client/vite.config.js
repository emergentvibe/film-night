import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001', // Explicitly use 127.0.0.1
        changeOrigin: true,
        // rewrite: (path) => path.replace(/^\/api/, '') // Optional: if you don't want /api in backend routes
      }
    }
  }
})
