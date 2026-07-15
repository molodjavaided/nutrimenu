import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [320, 420, 640, 768, 1024],
    imageSizes: [64, 128, 256],
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },
};

// The Sentry build wrapper is applied ONLY when SENTRY_DSN is set, so the build
// pipeline is byte-for-byte unchanged until Sentry is explicitly switched on.
// Source maps upload only when SENTRY_AUTH_TOKEN (+ org/project) are present.
export default process.env.SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      silent: true,
      disableLogger: true,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
    })
  : nextConfig;
