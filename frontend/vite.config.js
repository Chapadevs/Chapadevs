import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // IMPORTANT: this must match the GitHub Pages project path, e.g. https://<user>.github.io/Chapadevs/
  // If your repo name is different, update '/Chapadevs/' accordingly.
  base: '/Chapadevs/',
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

