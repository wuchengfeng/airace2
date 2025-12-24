import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/tal-ai': {
        target: 'http://ai-service.tal.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tal-ai/, ''),
      },
    },
  },
})
