import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // @orbit/shared is a workspace package outside this folder: compile it and let Turbopack see the repo root.
  transpilePackages: ["@orbit/shared"],
  turbopack: {
    root: path.join(import.meta.dirname, ".."),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
