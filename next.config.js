/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true, // 仅保留这一处
  compress: true,
  
  webpack: (config, { isServer }) => {
      if (!isServer) {
          config.resolve.fallback = {
              ...config.resolve.fallback,
              fs: false,
              path: require.resolve('path-browserify'),
          };
      }
      return config;
  },

  images: {
      remotePatterns: [
          {
              protocol: 'http',
              hostname: 'localhost',
              port: process.env.NODE_ENV === 'development' ? '3000' : undefined,
          }
      ],
      formats: ['image/avif', 'image/webp'],
      deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
      imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
      minimumCacheTTL: 3600,
      dangerouslyAllowSVG: true,
      contentSecurityPolicy: "img-src * blob: data; connect-src *;",
  },
  
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
      turbo: {}, // 保留 turbo 实验特性
  },
};

module.exports = nextConfig;
