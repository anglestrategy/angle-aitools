import type { NextConfig } from "next";

// STATIC_EXPORT=1 produces a fully static build (used by the GitHub Pages
// deploy). PAGES_BASE_PATH lets the workflow set the repo sub-path.
const isStaticExport = process.env.STATIC_EXPORT === "1";
const basePath = process.env.PAGES_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  ...(isStaticExport
    ? {
        output: "export" as const,
        basePath,
        assetPrefix: basePath || undefined,
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
