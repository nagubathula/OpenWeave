import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'dist',
  // The canvas owns an imperative CanvasKit/WebGL surface and render loop whose
  // subscription is torn down on unmount. React StrictMode's dev-only
  // mount→unmount→remount pauses that render loop without re-subscribing, and
  // also races the async surface init — leaving the canvas blank in dev. Disable
  // it so dev matches production behavior (StrictMode never runs in prod).
  reactStrictMode: false,
  serverExternalPackages: ['@acemir/cssom', 'parse5', 'canvaskit-wasm'],
  images: {
    unoptimized: true
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false
    }
    // @acemir/cssom's "browser" field remaps its main to a global-var script
    // with no module exports; route through a shim that pulls the named exports
    // from explicit subpaths instead (see src/vendor/cssom.js).
    config.resolve.alias = {
      ...config.resolve.alias,
      '@acemir/cssom$': path.resolve(process.cwd(), 'src/vendor/cssom.js')
    }
    
    // Webpack loaders for markdown and kiwi schema files
    config.module.rules.push({
      test: /\.(md|kiwi)$/,
      type: 'asset/source'
    })
    
    return config
  },
  turbopack: {
    resolveAlias: {
      fs: './src/empty.js',
      path: './src/empty.js',
      '@acemir/cssom': './src/vendor/cssom.js'
    },
    rules: {
      // Import markdown and kiwi schema as raw source text. Turbopack has no
      // built-in handler for these, so route them through raw-loader.
      '*.md': {
        loaders: [require.resolve('raw-loader')],
        as: '*.js'
      },
      '*.kiwi': {
        loaders: [require.resolve('raw-loader')],
        as: '*.js'
      }
    }
  }
}

import withSerwistInit from '@serwist/next'

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
})

export default withSerwist(nextConfig)
