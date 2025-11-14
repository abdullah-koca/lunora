import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'lucide-react': 'lucide-react/dist/esm/lucide-react.js',
    },
  },
  server: {
    host: true, // ağdaki cihazlardan erişim için
    port: 5173,
    strictPort: true,
  },
});
