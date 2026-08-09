import process from 'node:process'

import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import IconsResolver from 'unplugin-icons/resolver'
import Icons from 'unplugin-icons/vite'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'

import packageJson from './package.json'
import { createOpenWeaveAliases } from './vite/aliases'
import { localAutomationToken, openWeaveAutomationPlugin } from './vite/automation'
import { copyCanvasKitAssetsPlugin } from './vite/canvaskit-assets'
import { openWeavePwaPlugin } from './vite/pwa'
import { rawMarkdownPlugin } from './vite/raw-markdown'
import { createDevServerOptions } from './vite/server'

const host = process.env.TAURI_DEV_HOST

export default defineConfig(async ({ command }) => ({
  resolve: {
    alias: createOpenWeaveAliases(__dirname)
  },
  define: {
    __OPENWEAVE_APP_VERSION__: JSON.stringify(packageJson.version),
    __OPENWEAVE_LOCAL_AUTOMATION_TOKEN__: JSON.stringify(localAutomationToken(command))
  },
  plugins: [
    rawMarkdownPlugin(),
    copyCanvasKitAssetsPlugin(),
    tailwindcss(),
    Icons({ compiler: 'vue3' }),
    Components({ resolvers: [IconsResolver({ prefix: 'icon' })] }),
    openWeaveAutomationPlugin(command, host),
    vue(),
    openWeavePwaPlugin()
  ],
  clearScreen: false,
  build: {
    chunkSizeWarningLimit: 2500
  },
  server: createDevServerOptions(host)
}))
