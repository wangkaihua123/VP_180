/** @type {import('next').NextConfig} */
const nextConfig = {
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
        port: '3000',
        pathname: '/api/images/**',
      },
      {
        protocol: 'http',
        hostname: '10.0.18.132',
        port: '3000',
        pathname: '/api/images/**',
      },
      {
        protocol: 'http',
        hostname: '10.0.18.132',
        port: '3000',
        pathname: '/api/files/images/**',
      },
      {
        protocol: 'http',
        hostname: '10.0.18.132',
        port: '3000',
        pathname: '/api/files/screenshots/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/api/files/images/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/api/files/screenshots/**',
      },
      {
        protocol: 'http',
        hostname: '10.0.18.132',
        port: '3000',
        pathname: '/data/img/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/data/img/**',
      },
      {
        protocol: 'http',
        hostname: '10.0.18.132',
        port: '3000',
        pathname: '/data/screenshots/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/data/screenshots/**',
      },
    ],
    domains: ['localhost', '10.0.18.132'],
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/data/img/:path*',
        destination: '/api/files/images/:path*',
      },
      {
        source: '/data/screenshots/:path*',
        destination: '/api/files/screenshots/:path*',
      },
    ];
  },
  env: {
    // API地址配置
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://10.0.18.132:5000/',
    // 前端服务器配置
    FRONTEND_HOST: process.env.FRONTEND_HOST || '10.0.18.132',
    FRONTEND_PORT: process.env.FRONTEND_PORT || '3000',
  },
}

module.exports = nextConfig 