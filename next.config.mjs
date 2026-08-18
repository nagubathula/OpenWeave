import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'dist',
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
    config.resolve.alias = {
      ...config.resolve.alias,
      '@acemir/cssom$': path.resolve(process.cwd(), 'src/vendor/cssom.js')
    }
    
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

import { withSerwist } from '@serwist/turbopack'

export default withSerwist(nextConfig)
