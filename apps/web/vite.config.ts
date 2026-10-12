import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { yamlAsJson } from './build/yamlAsJson'

// GitHub Pages serves the site under /founder-mode/; dev stays at the root.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/founder-mode/' : '/',
  plugins: [yamlAsJson(fileURLToPath(new URL('./src/yamlShim.ts', import.meta.url))), react()],
}))
