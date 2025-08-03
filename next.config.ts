import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    '@wallcrawler/stagehand',
    'playwright',
    'playwright-core'
  ],
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Don't bundle these packages on the server
      config.externals.push({
        '@wallcrawler/stagehand': '@wallcrawler/stagehand',
        'playwright': 'playwright',
        'playwright-core': 'playwright-core',
      });
    }
    return config;
  },
};

export default nextConfig;
