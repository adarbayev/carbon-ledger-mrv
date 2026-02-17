import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  base: '/carbon-ledger-mrv/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'cbam-defaults': ['./src/data/cbamDefaultValues.js'],
          'charts': ['recharts'],
          'vendor': ['react', 'react-dom', 'framer-motion'],
        }
      }
    }
  }
})
