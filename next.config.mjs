/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'dist',
  images: {
    unoptimized: true
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false
    }
    return config
  },
  turbopack: {
    resolveAlias: {
      fs: './src/empty.js',
      path: './src/empty.js',
      '@acemir/cssom': '@acemir/cssom/lib/index.js'
    }
  }
}

export default nextConfig
