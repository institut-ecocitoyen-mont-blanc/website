import type { Metadata } from "next";

export const SITE_NAME = "Institut Ecocitoyen du Pays du Mont Blanc";
export const SITE_URL = "https://institut-ecocitoyen-pmb.fr";
export const DEFAULT_DESCRIPTION =
  "Développer et partager une connaissance scientifique indépendante des pollutions et de leurs effets sur la santé.";

type PageMetadataOptions = {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: "website" | "article";
  publishedTime?: string;
};

export function absoluteUrl(path: string) {
  return new URL(path, SITE_URL).toString();
}

export function normalizeDescription(
  description: string | undefined,
  fallback: string,
) {
  const normalized = (description || fallback).replace(/\s+/g, " ").trim();
  return normalized.length <= 160
    ? normalized
    : `${normalized.slice(0, 157).trimEnd()}…`;
}

export function createPageMetadata({
  title,
  description,
  path,
  image = "/images/Varan.jpg",
  type = "website",
  publishedTime,
}: PageMetadataOptions): Metadata {
  const openGraph: Metadata["openGraph"] =
    type === "article"
      ? {
          type: "article",
          title,
          description,
          url: path,
          siteName: SITE_NAME,
          locale: "fr_FR",
          publishedTime,
          images: [{ url: image, alt: title }],
        }
      : {
          type: "website",
          title,
          description,
          url: path,
          siteName: SITE_NAME,
          locale: "fr_FR",
          images: [{ url: image, alt: title }],
        };

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph,
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export function createNotFoundMetadata(title: string): Metadata {
  return {
    title,
    robots: { index: false, follow: false },
  };
}
