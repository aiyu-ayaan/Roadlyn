const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@roadlyn/types', '@roadlyn/ui'],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, './src'),
      '@ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@types': path.resolve(__dirname, '../../packages/types/src'),
    };
    return config;
  },
};

module.exports = nextConfig;
