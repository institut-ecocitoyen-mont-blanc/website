import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Calendar, CalendarDays } from "lucide-react";
import { getDocumentBySlug, getDocumentSlugs } from "outstatic/server";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import { ActualiteCategory } from "@/lib/types";
import { categoryFilters, categoryStyles } from "@/components/NewsCard";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { normalizeCategories } from "@/lib/news";
import { formatFrenchDate } from "@/lib/date";

export default async function ActualitePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const newsItem = await getData(await params);

  if (!newsItem) {
    return <div>Article non trouvé</div>;
  }

  const isEvent = newsItem.categories.includes("Événement");
  const displayDate = isEvent
    ? newsItem.dateEvenement || newsItem.publishedAt
    : newsItem.publishedAt;

  return (
    <main className="grow py-16 pt-32">
      <article className="container min-h-screen mx-auto px-4">
        <Link
          href="/actualites"
          className="inline-flex items-center text-blue-iec hover:underline mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour aux actualités
        </Link>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <h1 className="text-3xl font-bold mb-4">{newsItem.title}</h1>
            <div className="flex items-center text-gray-600 mb-6">
              {isEvent ? (
                <CalendarDays className="w-4 h-4 mr-2" />
              ) : (
                <Calendar className="w-4 h-4 mr-2" />
              )}
              <time dateTime={displayDate.toISOString()}>
                {formatFrenchDate(displayDate)}
              </time>
            </div>
            <div
              className="prose max-w-none mb-8 markdown"
              dangerouslySetInnerHTML={{ __html: newsItem.content }}
            />
          </div>
          <div className="sticky top-24">
            <Image
              src={newsItem.image || "/logo.png"}
              alt={newsItem.title}
              width={600}
              height={400}
              className="rounded-lg shadow-md mb-6"
            />
            <div className="flex flex-wrap gap-2 mb-3">
              {newsItem.categories
                .filter((x) => x !== "Événement")
                .map((category) => {
                  const styles = categoryStyles[category];
                  return (
                    <Badge
                      key={category}
                      variant="secondary"
                      className={cn(
                        "transition-colors",
                        styles?.lightBg,
                        styles?.lightText,
                      )}
                    >
                      {categoryFilters.find((f) => f.id === category)?.icon}
                      <span className="ml-1">
                        {categoryFilters.find((f) => f.id === category)?.label}
                      </span>
                    </Badge>
                  );
                })}
            </div>
            {newsItem.slugProjet ? (
              <div className="bg-gray-100 p-4 rounded-lg">
                <Link
                  href={`/projets/${newsItem.slugProjet}`}
                  className="inline-block bg-blue-iec text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-300"
                >
                  Voir le projet associé
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </article>
    </main>
  );
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeStringify);

type DetailDocument = {
  title: string;
  description?: string;
  image?: string;
  slug: string;
  content?: string;
  publishedAt: string;
  categories?: { value: string }[];
  dateEvenement?: string;
  slugProjet?: string;
};

async function getData(params: { slug: string }) {
  const fields = [
    "title",
    "description",
    "image",
    "slug",
    "content",
    "publishedAt",
    "categories",
    "dateEvenement",
    "slugProjet",
  ];

  const evenement = getDocumentBySlug(
    "evenements",
    params.slug,
    fields,
  ) as DetailDocument | null;
  const actualite = getDocumentBySlug(
    "actualites",
    params.slug,
    fields,
  ) as DetailDocument | null;
  const newsItem = evenement || actualite;

  if (!newsItem) {
    return null;
  }

  const content = await processor.process(newsItem.content || "");
  const categories = normalizeCategories(newsItem.categories);
  const isEvent = Boolean(evenement) || categories.includes("Événement");

  return {
    ...newsItem,
    publishedAt: new Date(newsItem.publishedAt),
    dateEvenement: newsItem.dateEvenement
      ? new Date(newsItem.dateEvenement as string)
      : isEvent
        ? new Date(newsItem.publishedAt)
        : null,
    categories: isEvent
      ? Array.from(new Set<ActualiteCategory>(["Événement", ...categories]))
      : categories,
    content: String(content.value),
  };
}

export async function generateStaticParams() {
  const posts = Array.from(
    new Set([
      ...getDocumentSlugs("actualites"),
      ...getDocumentSlugs("evenements"),
    ]),
  );
  return posts.map((slug) => ({ slug }));
}
