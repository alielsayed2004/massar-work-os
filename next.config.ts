import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Pages retired in the redesign; old notifications and bookmarks still point here.
  async redirects() {
    return [
      { source: '/my-team', destination: '/team', permanent: false },
      { source: '/overview', destination: '/spaces', permanent: false },
      { source: '/projects', destination: '/spaces', permanent: false },
      { source: '/deliverables', destination: '/today', permanent: false },
      { source: '/crm', destination: '/today', permanent: false },
    ]
  },
};

export default nextConfig;
