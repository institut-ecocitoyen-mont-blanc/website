import { getDocuments } from "outstatic/server";
import { NewsCard } from "@/components/NewsCard";

export default async function NewsPage() {
  const { news } = await getData();
  return (
    <main className="flex-grow">
      <section className="py-16 pt-32 bg-gray-100">
        <div className="container mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-center">Actualités</h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {news.map((item) => (
              <NewsCard key={item.slug} item={item} />
            ))}
          </div>
        </div>
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
  ]) as unknown as {
    title: string;
    description: string;
    image: string;
    slug: string;
    publishedAt: Date;
  }[];

  return { news };
}
