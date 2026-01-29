import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Calendar } from "lucide-react";
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

export default async function ActualitePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const newsItem = await getData(await params);

  if (!newsItem) {
    return <div>Article non trouvé</div>;
  }

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
              <Calendar className="w-4 h-4 mr-2" />
              <span>{newsItem.publishedAt.toDateString()}</span>
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

async function getData(params: { slug: string }) {
  const projet = getDocumentBySlug("actualites", params.slug, [
    "title",
    "description",
    "image",
    "slug",
    "content",
    "publishedAt",
    "categories",
    "dateEvenement",
    "slugProjet",
  ]);

  if (!projet) {
    return null;
  }

  const content = await processor.process(projet.content || "");

  return {
    ...projet,
    publishedAt: new Date(projet.publishedAt),
    dateEvenement: projet.dateEvenement
      ? new Date(projet.dateEvenement as string)
      : null,
    categories:
      (projet.categories?.map((y) => y.value) as ActualiteCategory[]) ?? [],
    content: content.value,
  };
}

export async function generateStaticParams() {
  const posts = getDocumentSlugs("actualites");
  return posts.map((slug) => ({ slug }));
}
