import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Client-side Router Cache windows. Next 15/16 defaults `dynamic` to 0, so
  // every navigation to a dynamic (ƒ) route re-fetches its RSC payload and
  // re-runs the layout's auth check. Caching it briefly makes back-navigation
  // instant; page data still refreshes per React Query's own staleTime.
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  async rewrites() {
    return [
      {
        source: "/storybook",
        destination: "/storybook/index.html",
      },
    ];
  },
};

export default nextConfig;
