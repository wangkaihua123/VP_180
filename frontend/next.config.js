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
        hostname: '192.168.241.1',
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
        hostname: '192.168.241.1',
        port: '3000',
        pathname: '/api/**',
      },
    ],
    domains: ['localhost', '192.168.241.1'],
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
    ];
  },
  env: {
    // 使用环境变量，不要写死默认值
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://10.0.18.133:5000',
    NEXT_PUBLIC_FIXED_API_URL: process.env.NEXT_PUBLIC_FIXED_API_URL || 'http://10.0.18.133:5000',
    FRONTEND_HOST: process.env.FRONTEND_HOST || '10.0.18.133',
    FRONTEND_PORT: process.env.FRONTEND_PORT || '3000',
  },
}

module.exports = nextConfig 