import { getSingletonBySlug } from "outstatic/server";
import { formatFrenchDate } from "@/lib/date";
import { createPageMetadata } from "@/lib/seo";
import { markdownToHtml } from "@/lib/markdown";

export const metadata = createPageMetadata({
  title: "Politique de confidentialité",
  description:
    "Politique de confidentialité et traitement des données personnelles sur le site de l’Institut Ecocitoyen.",
  path: "/politique-de-confidentialite",
});

export default async function MentionsLegalesPage() {
  const { content, publishedAt } = await getData();

  return (
    <main className="flex-grow">
      <section className="py-16 pt-32 bg-gray-50">
        <div className="container mx-auto px-4">
          <div
            className="markdown"
            dangerouslySetInnerHTML={{ __html: content }}
          />

          <div className="max-w-3xl mx-auto mt-8 text-center text-gray-600 text-sm">
            <p>
              Dernière mise à jour :{" "}
              <time dateTime={publishedAt.toISOString()}>
                {formatFrenchDate(publishedAt)}
              </time>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

async function getData() {
  const page = getSingletonBySlug("politique-de-confidentialite", [
    "content",
    "publishedAt",
  ])!;

  const content = await markdownToHtml(page.content || "");

  return {
    content,
    publishedAt: new Date(page.publishedAt),
  };
}
