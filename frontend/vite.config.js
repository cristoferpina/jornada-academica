import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Needed for Docker to expose the port
    port: 5173,
    strictPort: true, // Prevents using 5174 if 5173 is occupied
    watch: {
      usePolling: true, // Needed for HMR in some Docker setups (Windows/Mac)
    },
  },
})
