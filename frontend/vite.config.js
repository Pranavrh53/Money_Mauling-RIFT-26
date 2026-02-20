import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Money_Muling/',  // GitHub repo name for GitHub Pages
  server: {
    port: 3000,
    proxy: {
      '/upload': 'http://localhost:8000',
      '/graph-data': 'http://localhost:8000'
    }
  }
})
