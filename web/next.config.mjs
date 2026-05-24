/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @repo/db nutzt Prisma — transpilieren, damit Next es korrekt bündelt.
  transpilePackages: ["@repo/db"],
  // Server Actions haben default 1 MB Body-Limit — für Bild-Uploads zu klein.
  experimental: {
    serverActions: {
      bodySizeLimit: "16mb",
    },
  },
};

export default nextConfig;
