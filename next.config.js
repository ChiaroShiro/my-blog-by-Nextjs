/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  compress: true,
  
  webpack: (config, { isServer }) => ({
    ...config,
    resolve: {
      ...config.resolve,
      fallback: isServer ? {} : { 
        ...config.resolve.fallback,
        fs: false,
        path: require.resolve('path-browserify') // 更安全的polyfill方案
      }
    }
  }),

  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: process.env.NODE_ENV === 'development' ? '3000' : '',
      }
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 3600,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: `
      img-src * blob: data:;
      connect-src *;
    `.replace(/\s+/g, ' '),
  },
  
  // 添加类型安全检查
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  devIndicators: {
    autoPrerender: false,
  },
  experimental: {
    turbo: {},
    swcMinify: true
  }
}

module.exports = nextConfig