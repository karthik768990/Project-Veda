import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/health': 'http://localhost:3000',
      '/chandas': 'http://localhost:3000',
      '/auth': 'http://localhost:3000',
      '/generate-and-verify': 'http://localhost:3000'
    }
  }
})