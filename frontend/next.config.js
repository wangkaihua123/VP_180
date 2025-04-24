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
    ],
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