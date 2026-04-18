import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  logging: {
    browserToTerminal: 'warn'
  },
  reactCompiler: true,
  output: process.env.VERCEL ? undefined : 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.google.com',
        pathname: '/s2/favicons'
      }
    ]
  },
  serverExternalPackages: ['@napi-rs/canvas', 'pdf-parse', 'pdfjs-dist'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'radix-ui']
  },
  async rewrites() {
    return [
      {
        source: '/api/rag/:path*',
        destination: 'http://127.0.0.1:8000/api/v1/:path*'
      }
    ]
  }
}

export default nextConfig
