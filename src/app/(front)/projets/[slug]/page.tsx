import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Clock, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  getDocumentBySlug,
  getDocuments,
  getDocumentSlugs,
} from "outstatic/server";
import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { ActualiteCategory, ProjectCategory } from "@/lib/types";
import { categoryStyles, categoryFilters } from "@/components/ProjectCard";
import { cn } from "@/lib/utils";
import { NewsCard } from "@/components/NewsCard";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { projet, relatedNews } = (await getData(await params)) || {};

  if (!projet || !relatedNews) {
    return <div>Projet non trouvé</div>;
  }

  return (
    <main className="grow py-16 pt-32">
      <div className="container min-h-screen mx-auto px-4">
        <Link
          href="/projets"
          className="inline-flex items-center text-blue-iec hover:underline mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour aux projets
        </Link>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <h1 className="text-3xl font-bold mb-4">{projet.title}</h1>
            <Badge
              variant="outline"
              className={`mb-4 ${
                projet.etat === "En cours"
                  ? "border-green-iec text-green-iec"
                  : "border-blue-iec text-blue-iec"
              }`}
            >
              {projet.etat === "En cours" ? (
                <Clock className="w-3 h-3 mr-1" />
              ) : (
                <CheckCircle2 className="w-3 h-3 mr-1" />
              )}
              {projet.etat}
            </Badge>
            <p
              className="text-gray-600 mb-6 markdown"
              dangerouslySetInnerHTML={{ __html: projet.content }}
            />
            {/* Related News Section */}
            {relatedNews.length > 0 && (
              <div className="mt-10 border-t border-gray-200 py-8">
                <h2 className="text-2xl font-semibold mb-6">
                  Actualités liées à ce projet
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {relatedNews.map((newsItem) => (
                    <NewsCard key={newsItem.slug} item={newsItem} />
                  ))}
                </div>
              </div>
            )}
            {/* <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Période du projet</h2>
              <p>
                {projet.startDate} - {project.endDate}
              </p>
            </div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Partenaires</h2>
              <ul className="list-disc list-inside">
                {project.partners.map((partner, index) => (
                  <li key={index}>{partner}</li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-2">
                Principales découvertes
              </h2>
              <ul className="list-disc list-inside">
                {project.keyFindings.map((finding, index) => (
                  <li key={index} className="mb-2">
                    {finding}
                  </li>
                ))}
              </ul>
            </div> */}
          </div>
          <div>
            <div className="sticky top-24">
              <Image
                src={projet.image || "/logo.png"}
                alt={projet.title}
                width={600}
                height={400}
                className="rounded-lg shadow-md mb-6"
              />
              <div className="absolute top-4 left-4 flex flex-wrap gap-2 max-w-[calc(100%-120px)]">
                {projet.categories.map((category) => {
                  const styles = categoryStyles[category];
                  return (
                    <Badge
                      key={category}
                      variant="secondary"
                      className={cn(
                        "transition-colors",
                        styles.lightBg,
                        styles.lightText
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
              {projet.lienScienceParticipative ? (
                <div className="bg-gray-100 p-4 rounded-lg">
                  <h2 className="text-xl font-semibold mb-2">
                    Contribuer à ce projet
                  </h2>
                  <p className="mb-4">
                    Votre soutien est essentiel pour la réussite de ce projet.
                    Découvrez comment vous pouvez agir.
                  </p>
                  <Link
                    href={projet.lienScienceParticipative}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-blue-iec text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-300"
                  >
                    Être Acteur
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeStringify);

async function getData(params: { slug: string }) {
  const result = getDocumentBySlug("projets", params.slug, [
    "title",
    "description",
    "etat",
    "image",
    "slug",
    "content",
    "categories",
    "lienScienceParticipative",
  ]);

  if (!result) {
    return null;
  }

  const content = await processor.process(result.content || "");

  const projet = {
    ...result,
    // @ts-expect-error bla bla bla
    etat: result.etat[0].value,
    content: content.value,
    categories:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (result.categories as any)?.map((y: { value: string }) => y.value) ?? [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any as {
    title: string;
    description: string;
    etat: string;
    image: string;
    slug: string;
    content: string;
    categories: ProjectCategory[];
    lienScienceParticipative?: string;
  };

  const relatedNews = getDocuments("actualites", [
    "title",
    "description",
    "image",
    "slug",
    "publishedAt",
    "categories",
    "dateEvenement",
    "slugProjet",
  ]) // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((x: any) => ({
      ...x,
      publishedAt: new Date(x.publishedAt),
      dateEvenement: x.dateEvenement ? new Date(x.dateEvenement) : null,
      categories: x.categories?.map((y: { value: string }) => y.value) ?? [],
    }))
    .filter((x) => x.slugProjet === params.slug) as unknown as {
    title: string;
    description: string;
    image: string;
    slug: string;
    publishedAt: Date;
    dateEvenement: Date | null;
    categories: ActualiteCategory[];
    slugProjet?: string;
  }[];

  return { projet, relatedNews };
}

export async function generateStaticParams() {
  const posts = getDocumentSlugs("projets");
  return posts.map((slug) => ({ slug }));
}
