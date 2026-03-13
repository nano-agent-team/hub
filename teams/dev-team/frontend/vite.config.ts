import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import federation from '@originjs/vite-plugin-federation'

/**
 * Plugin frontend — Module Federation REMOTE
 *
 * Exposes TicketsView as a federation module.
 * Core dashboard (host) imports it at runtime:
 *   const TicketsView = defineAsyncComponent(() => import('devTeamPlugin/TicketsView'))
 *
 * Build output: dist/assets/remoteEntry.js
 * Served by core Express at: /plugins/dev-team/assets/remoteEntry.js
 */
export default defineConfig({
  plugins: [
    vue(),
    federation({
      name: 'devTeamPlugin',
      filename: 'remoteEntry.js',
      exposes: {
        './TicketsView': './src/TicketsView.vue',
      },
      shared: {
        vue: {
          // Use singleton Vue from host to avoid duplicate instances
          singleton: true,
          requiredVersion: '^3.4.0',
        },
        marked: {
          singleton: true,
        },
      },
    }),
  ],
  build: {
    outDir: 'dist',
    // Module federation requires target: esnext
    target: 'esnext',
    minify: false,
    rollupOptions: {
      // Federation remote has no HTML entry point — use entry.ts as input
      input: './src/entry.ts',
    },
  },
})
