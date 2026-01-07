import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  // Load env vars from .env files and process.env
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [vue()],
    define: {
      // Explicitly pass sync server URL to ensure Cloudflare Pages picks it up
      'import.meta.env.VITE_SYNC_SERVER_URL': JSON.stringify(env.VITE_SYNC_SERVER_URL || process.env.VITE_SYNC_SERVER_URL || ''),
    },
  }
})
