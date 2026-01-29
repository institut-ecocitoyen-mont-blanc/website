import { getDocuments } from "outstatic/server";
import { ActualiteCategory } from "@/lib/types";
import { NewsList } from "@/components/NewsList";
import { Suspense } from "react";

export default async function NewsPage() {
  const { news } = await getData();
  return (
    <main className="grow">
      <section className="py-16 pt-32 bg-gray-100 min-h-screen">
        <Suspense>
          <NewsList items={news} />
        </Suspense>
      </section>
    </main>
  );
}

async function getData() {
  const news = getDocuments("actualites", [
    "title",
    "description",
    "image",
    "slug",
    "publishedAt",
    "categories",
    "dateEvenement",
  ]).map((x) => ({
    ...x,
    publishedAt: new Date(x.publishedAt),
    dateEvenement: x.dateEvenement ? new Date(x.dateEvenement) : null,
    categories:
      (x.categories?.map((y) => y.value) as ActualiteCategory[]) ?? [],
  }));

  return { news };
}
