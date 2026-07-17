import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const proxy = {
  '/api': process.env.VITE_API_PROXY_TARGET ?? 'http://127.0.0.1:8180',
}

export default defineConfig({
  plugins: [react()],
  // Pre-bundle React and the assistant-ui runtime together in one optimize pass so
  // the lazily-loaded /assistant route can't pull a second React instance (which
  // surfaces as "Invalid hook call / useRef of null" only on a full page reload).
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      '@assistant-ui/react',
    ],
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5173,
    proxy,
  },
  preview: { port: 5173, proxy },
})
