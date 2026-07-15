import path from "node:path";
import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
};

const withMDX = createMDX({});

export default withMDX(nextConfig);
