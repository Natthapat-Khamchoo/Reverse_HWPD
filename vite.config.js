import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/longdo': {
        target: 'https://api.longdo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/longdo/, ''),
        headers: {
          'Referer': 'https://reverse-hwpd.vercel.app/'
        }
      }
    }
  }
})