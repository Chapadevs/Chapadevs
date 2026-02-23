import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from "path"

export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 8080,
    open: false,
    // To stop "GET http://localhost:8080/ net::ERR_CONNECTION_REFUSED" when the dev server is stopped, set hmr: false (disables hot reload).
    // hmr: false,
  },
  build: { outDir: 'dist', sourcemap: false }
})
