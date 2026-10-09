import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages serves the site under /founder-mode/; dev stays at the root.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/founder-mode/' : '/',
  plugins: [react()],
}))
