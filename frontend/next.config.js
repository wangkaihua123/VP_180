/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: {
    buildActivity: false,
    buildActivityPosition: 'none'
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5000',
        pathname: '/api/files/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5000',
        pathname: '/api/files/**',
      },

      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/data/img/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/data/screenshots/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/api/**',
      },
    ],
    domains: ['localhost', 'localhost'],
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/data/img/:path*',
        destination: 'http://localhost:5000/api/files/images/:path*',
      },
      {
        source: '/data/img/operation_img/:path*',
        destination: 'http://localhost:5000/api/files/operation_img/:path*',
      },
      {
        source: '/data/img/display_img/:path*',
        destination: 'http://localhost:5000/api/files/display_img/:path*',
      },
      {
        source: '/data/screenshots/:path*',
        destination: 'http://localhost:5000/api/files/screenshots/:path*',
      },
      {
        source: '/api/files/images/:path*',
        destination: 'http://localhost:5000/api/files/images/:path*',
      },
      {
        source: '/api/files/operation_img/:path*',
        destination: 'http://localhost:5000/api/files/operation_img/:path*',
      },
      {
        source: '/api/files/display_img/:path*',
        destination: 'http://localhost:5000/api/files/display_img/:path*',
      },
      {
        source: '/api/files/screenshots/:path*',
        destination: 'http://localhost:5000/api/files/screenshots/:path*',
      },
      {
        source: '/img/upload/:path*',
        destination: 'http://localhost:5000/api/files/upload/:path*',
      },
    ];
  },
  env: {
    // 从环境变量动态构建URL，统一管理IP配置
    NEXT_PUBLIC_BACKEND_HOST: process.env.NEXT_PUBLIC_BACKEND_HOST,
    NEXT_PUBLIC_BACKEND_PORT: process.env.NEXT_PUBLIC_BACKEND_PORT,
    NEXT_PUBLIC_FRONTEND_HOST: process.env.NEXT_PUBLIC_FRONTEND_HOST,
    NEXT_PUBLIC_FRONTEND_PORT: process.env.NEXT_PUBLIC_FRONTEND_PORT,
    // 自动构建的API URLs
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || `http://${process.env.NEXT_PUBLIC_BACKEND_HOST}:${process.env.NEXT_PUBLIC_BACKEND_PORT}`,
    NEXT_PUBLIC_FIXED_API_URL: process.env.NEXT_PUBLIC_FIXED_API_URL || `http://${process.env.NEXT_PUBLIC_BACKEND_HOST}:${process.env.NEXT_PUBLIC_BACKEND_PORT}`,
  },
}

module.exports = {
  output: 'standalone',
}