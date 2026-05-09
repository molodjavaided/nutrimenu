import type { NextConfig } from "next";

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

export default nextConfig;
