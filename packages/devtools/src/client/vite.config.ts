import { join, resolve } from 'node:path'
import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'
import Router from 'unplugin-vue-router/vite'
import Components from 'unplugin-vue-components/vite'
import Unocss from 'unocss/vite'

export default defineConfig({
  base: './',

  resolve: {
    alias: {
      '~/': __dirname,
    },
  },

  plugins: [
    {
      name: 'local-object-transform',
      transform: {
        order: 'post',
        async handler(code) {
          return `${code}\n/* Injected with object hook! */`
        },
      },
    },
    {
      name: 'generate-error',
      load(id) {
        if (id === '/__LOAD_ERROR')
          throw new Error('Load error')
        if (id === '/__TRANSFORM_ERROR')
          return 'transform'
      },
      transform(code, id) {
        if (id === '/__TRANSFORM_ERROR')
          throw new SyntaxError('Transform error')
      },
    },

    {
      name: 'no-change',
      transform: {
        order: 'post',
        async handler(code) {
          return code
        },
      },
    },

    Vue({
      script: {
        defineModel: true,
      },
    }),

    Router({
      routesFolder: ['pages'],
      dts: join(__dirname, 'typed-routes.d.ts'),
    }),

    Components({
      dirs: ['components'],
      dts: join(__dirname, 'components.d.ts'),
    }),
    Unocss(),
  ],

  optimizeDeps: {
    exclude: [
      'vite-hot-client',
    ],
  },

  build: {
    target: 'esnext',
    outDir: resolve(__dirname, '../../dist/client'),
    minify: false, // 'esbuild',
    emptyOutDir: true,
  },
})
