import type { NextConfig } from "next";
import { withOutstatic } from "outstatic/next-plugin";
import {
  RESPONSIVE_DEVICE_SIZES,
  RESPONSIVE_IMAGE_SIZES,
} from "./src/lib/responsive-images.mjs";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
    deviceSizes: RESPONSIVE_DEVICE_SIZES,
    imageSizes: RESPONSIVE_IMAGE_SIZES,
  },
};

export default withOutstatic(nextConfig);
