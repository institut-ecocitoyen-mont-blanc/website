import { getDocuments } from "outstatic/server";
import { ActualiteCategory } from "@/lib/types";
import { NewsList } from "@/components/NewsList";

export default async function NewsPage() {
  const { news } = await getData();
  return (
    <main className="flex-grow">
      <section className="py-16 pt-32 bg-gray-100">
        <NewsList items={news} />
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
  ]) // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((x: any) => ({
      ...x,
      categories: x.categories?.map((y: { value: string }) => y.value) ?? [],
    })) as unknown as {
    title: string;
    description: string;
    image: string;
    slug: string;
    publishedAt: Date;
    categories: ActualiteCategory[];
  }[];

  return { news };
}
