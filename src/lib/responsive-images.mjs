export const RESPONSIVE_DEVICE_SIZES = [
  320,
  480,
  640,
  768,
  960,
  1200,
  1600,
  1920,
  2400,
];

export const RESPONSIVE_IMAGE_SIZES = [32, 48, 64, 96, 128, 256];

export const RESPONSIVE_IMAGE_WIDTHS = [
  ...new Set([...RESPONSIVE_IMAGE_SIZES, ...RESPONSIVE_DEVICE_SIZES]),
].sort((left, right) => left - right);

export const CONTENT_IMAGE_SIZES =
  "(min-width: 1280px) 800px, (min-width: 768px) 66vw, 100vw";

const LOCAL_RASTER_PATTERN = /\.(?:avif|jpe?g|png|webp)$/i;

export function supportsResponsiveImage(source) {
  if (typeof source !== "string") return false;

  const pathname = source.split(/[?#]/, 1)[0];
  return (
    pathname.startsWith("/") &&
    !pathname.startsWith("//") &&
    LOCAL_RASTER_PATTERN.test(pathname)
  );
}

export function getResponsiveImagePath(source, width) {
  if (!supportsResponsiveImage(source)) return source;

  const pathname = source.split(/[?#]/, 1)[0];
  const relativeStem = pathname
    .replace(/^\/+/, "")
    .replace(/\.(?:avif|jpe?g|png|webp)$/i, "");

  return `/_responsive/${relativeStem}-${width}w.webp`;
}

export function getResponsiveSourceSet(source) {
  if (!supportsResponsiveImage(source)) return undefined;

  return RESPONSIVE_DEVICE_SIZES.map(
    (width) => `${getResponsiveImagePath(source, width)} ${width}w`,
  ).join(", ");
}
