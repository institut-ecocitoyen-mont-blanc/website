import { getDocuments } from "outstatic/server";
import { ActualiteCategory, NewsItem } from "@/lib/types";

type OutstaticTag = {
  value: string;
};

type ActualiteDocument = {
  title: string;
  description?: string;
  image?: string;
  slug: string;
  publishedAt: string;
  categories?: OutstaticTag[];
  dateEvenement?: string;
  slugProjet?: string;
};

type EvenementDocument = ActualiteDocument;

type PresseDocument = {
  title: string;
  description?: string;
  image?: string;
  slug: string;
  publishedAt: string;
  lien?: string;
  slugProjet?: string;
};

const newsFields = [
  "title",
  "description",
  "image",
  "slug",
  "publishedAt",
  "categories",
  "dateEvenement",
  "slugProjet",
];

const presseFields = [
  "title",
  "description",
  "image",
  "slug",
  "publishedAt",
  "lien",
  "slugProjet",
];

export function normalizeCategories(
  categories?: OutstaticTag[],
): ActualiteCategory[] {
  const categoryMap: Record<string, ActualiteCategory> = {
    air: "Air",
    Air: "Air",
    eau: "Eau",
    Eau: "Eau",
    sol: "Sol",
    Sol: "Sol",
    "santé": "Santé",
    "Santé": "Santé",
    "événement": "Événement",
    "Événement": "Événement",
  };

  return (
    categories
      ?.map((category) => categoryMap[category.value])
      .filter((category): category is ActualiteCategory => Boolean(category)) ??
    []
  );
}

export function getNewsItems(limit?: number): NewsItem[] {
  const evenements = (
    getDocuments("evenements", newsFields) as EvenementDocument[]
  ).map(
    (item): NewsItem => ({
      ...item,
      kind: "evenement",
      publishedAt: new Date(item.publishedAt),
      dateEvenement: new Date(item.publishedAt),
      categories: Array.from(
        new Set<ActualiteCategory>([
          "Événement",
          ...normalizeCategories(item.categories),
        ]),
      ),
    }),
  );

  const actualitesDocuments = getDocuments(
    "actualites",
    newsFields,
  ) as ActualiteDocument[];
  const actualites = actualitesDocuments
    .filter((item) => {
      const categories = normalizeCategories(item.categories);
      return evenements.length === 0 || !categories.includes("Événement");
    })
    .map(
      (item): NewsItem => ({
        ...item,
        kind: "actualite",
        publishedAt: new Date(item.publishedAt),
        dateEvenement: item.dateEvenement ? new Date(item.dateEvenement) : null,
        categories: normalizeCategories(item.categories),
      }),
    );

  const presse = (getDocuments("presse", presseFields) as PresseDocument[]).map(
    (item): NewsItem => ({
      ...item,
      kind: "presse",
      publishedAt: new Date(item.publishedAt),
      dateEvenement: null,
      categories: [],
    }),
  );

  const items = [...actualites, ...evenements, ...presse].sort(
    (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime(),
  );

  return typeof limit === "number" ? items.slice(0, limit) : items;
}
