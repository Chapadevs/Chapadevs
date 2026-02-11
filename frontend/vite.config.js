import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/utils/
export default defineConfig({
  // Using '/' for custom domain (www.chapadevs.com)
  // This is required when using a custom domain on GitHub Pages
  base: '/',
  plugins: [react()],
  server: {
    port: 8080,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
})

