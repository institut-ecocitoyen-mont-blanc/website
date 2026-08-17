import type { NextConfig } from "next";
import { withOutstatic } from "outstatic/next-plugin";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
};

export default withOutstatic(nextConfig);
