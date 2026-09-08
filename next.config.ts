import type { NextConfig } from "next";
import { withOutstatic } from "outstatic/next-plugin";
import {
  RESPONSIVE_DEVICE_SIZES,
  RESPONSIVE_IMAGE_SIZES,
} from "./src/lib/responsive-images.mjs";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    // Responsive variants are generated in out/ after the production export.
    // Serve public originals in dev, including on a fresh checkout.
    unoptimized: process.env.NODE_ENV === "development",
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
    deviceSizes: RESPONSIVE_DEVICE_SIZES,
    imageSizes: RESPONSIVE_IMAGE_SIZES,
  },
};

export default withOutstatic(nextConfig);
