import type { ImageLoaderProps } from "next/image";
import {
  getResponsiveImagePath,
  supportsResponsiveImage,
} from "@/lib/responsive-images.mjs";

export default function imageLoader({ src, width }: ImageLoaderProps) {
  return supportsResponsiveImage(src)
    ? getResponsiveImagePath(src, width)
    : src;
}
