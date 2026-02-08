import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@autoclaw/shared'],
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
};

export default nextConfig;
