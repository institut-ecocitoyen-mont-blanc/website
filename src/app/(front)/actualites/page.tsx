import { NewsList } from "@/components/NewsList";
import { Suspense } from "react";
import { getNewsItems } from "@/lib/news";

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
  return { news: getNewsItems() };
}
