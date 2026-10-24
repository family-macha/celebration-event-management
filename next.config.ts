import type { NextConfig } from 'next';

import { STATIC_SECURITY_HEADERS } from './src/lib/security/headers';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Do not advertise the framework in a response header.
  poweredByHeader: false,
  headers() {
    return Promise.resolve([
      {
        source: '/:path*',
        headers: STATIC_SECURITY_HEADERS.map(({ key, value }) => ({ key, value })),
      },
    ]);
  },
};

export default nextConfig;
