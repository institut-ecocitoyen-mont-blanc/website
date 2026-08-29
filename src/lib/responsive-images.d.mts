export const RESPONSIVE_DEVICE_SIZES: number[];
export const RESPONSIVE_IMAGE_SIZES: number[];
export const RESPONSIVE_IMAGE_WIDTHS: number[];
export const CONTENT_IMAGE_SIZES: string;

export function supportsResponsiveImage(source: unknown): source is string;
export function getResponsiveImagePath(source: string, width: number): string;
export function getResponsiveSourceSet(source: string): string | undefined;
