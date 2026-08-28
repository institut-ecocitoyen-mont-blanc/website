import type { MetadataRoute } from "next";
import { getDocuments } from "outstatic/server";
import { absoluteUrl } from "@/lib/seo";

export const dynamic = "force-static";

type SitemapDocument = {
  slug: string;
  publishedAt?: string;
};

function getContentRoutes(
  collection: "actualites" | "evenements" | "projets",
  prefix: "/actualites" | "/projets",
): MetadataRoute.Sitemap {
  const documents = getDocuments(collection, [
    "slug",
    "publishedAt",
  ]) as SitemapDocument[];

  return documents.map((document) => ({
    url: absoluteUrl(`${prefix}/${document.slug}`),
    lastModified: document.publishedAt,
  }));
}

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), priority: 1 },
    { url: absoluteUrl("/actualites"), priority: 0.9 },
    { url: absoluteUrl("/projets"), priority: 0.9 },
    { url: absoluteUrl("/carte"), priority: 0.8 },
    { url: absoluteUrl("/a-propos"), priority: 0.7 },
    { url: absoluteUrl("/etre-acteur"), priority: 0.7 },
    { url: absoluteUrl("/mentions-legales"), priority: 0.2 },
    { url: absoluteUrl("/politique-de-confidentialite"), priority: 0.2 },
  ];

  return [
    ...staticRoutes,
    ...getContentRoutes("actualites", "/actualites"),
    ...getContentRoutes("evenements", "/actualites"),
    ...getContentRoutes("projets", "/projets"),
  ];
}
