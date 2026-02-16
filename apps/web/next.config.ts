import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@autoclaw/shared'],
  reactStrictMode: true,
  async redirects() {
    return [
      { source: '/dashboard', destination: '/overview', permanent: true },
      { source: '/timeline', destination: '/fx-agent?tab=timeline', permanent: true },
      { source: '/settings', destination: '/fx-agent?tab=settings', permanent: true },
    ];
  },
  webpack: (config) => {
    // Suppress pino-pretty warning from WalletConnect → pino
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'pino-pretty': false,
    };
    return config;
  },
};

export default nextConfig;
