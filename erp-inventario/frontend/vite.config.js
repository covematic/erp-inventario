import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Las llamadas a /api se envían al backend Express
    proxy: { '/api': 'http://localhost:4000' },
  },
});
