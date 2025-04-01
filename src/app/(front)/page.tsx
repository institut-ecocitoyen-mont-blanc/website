import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getDocumentBySlug, getDocuments, load } from "outstatic/server";
import Link from "next/link";
import { ProjectCard } from "@/components/ProjectCard";
import { NewsCard } from "@/components/NewsCard";
import { ActualiteCategory, ProjectCategory } from "@/lib/types";

export default async function Home() {
  const { projects, news, objectifs, page } = await getData();
  const content = page.content
    .split("---")
    .map((x) => x.trim())
    .filter(Boolean);

  return (
    <main className="grow">
      <section className="relative h-[500px] flex items-center justify-center">
        <Image
          src="/images/Varan.jpg"
          alt="Environmental research"
          fill
          className="object-cover absolute z-0"
        />
        <div className="relative z-10 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">{content[0]}</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">{content[1]}</p>
          <a
            href="/etre-acteur"
            className="bg-green-iec text-white px-6 py-3 rounded-lg text-lg font-semibold hover:bg-green-600 transition duration-300"
          >
            Être Acteur
          </a>
        </div>
      </section>
      <section
        id="missions"
        className="py-16 bg-linear-to-b from-white to-gray-50"
      >
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center">Nos Missions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {objectifs.map((objectif, index) => (
              <Card
                key={index}
                className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
              >
                <CardContent className="p-6">
                  <div className="flex items-start">
                    <div className="shrink-0 mr-4">
                      <div
                        className="p-3 rounded-full bg-gray-100"
                        style={{ color: objectif.color }}
                        dangerouslySetInnerHTML={{ __html: objectif.icon }}
                      />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">
                        {objectif.title}
                      </h3>
                      <p className="text-gray-600">{objectif.content}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
      <section className="py-24 bg-blue-iec/10">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 text-black">Nos Projets</h2>
            <p className="text-lg text-black/70 mb-8">{content[2]}</p>
            <Link
              href="/projets"
              className="inline-flex items-center px-6 py-3 rounded-full bg-white text-black font-medium hover:bg-white/90 transition-colors"
            >
              Voir tous nos projets
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {projects.map((project) => (
              <ProjectCard key={project.slug} project={project} />
            ))}
          </div>
        </div>
      </section>

      <section id="actualites" className="py-16 bg-gray-100">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center">Actualités</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {news.map((item) => (
              <NewsCard key={item.slug} item={item} />
            ))}
          </div>
          <div className="max-w-3xl mx-auto text-center">
            <Link
              href="/actualites"
              className="inline-flex items-center px-6 py-3 rounded-full bg-white text-black font-medium hover:bg-white/90 transition-colors"
            >
              Voir toutes les actualités
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">{content[3]}</h2>
          <p className="mb-8">{content[4]}</p>
          <Link
            href="/etre-acteur"
            className="bg-green-iec text-white px-6 py-3 rounded-lg text-lg font-semibold hover:bg-green-700 transition duration-300"
          >
            Découvrir comment agir
          </Link>
        </div>
      </section>
    </main>
  );
}

async function getData() {
  const db = await load();
  const projects = (
    await db
      .find({ collection: "projets" }, [
        "title",
        "description",
        "etat",
        "image",
        "slug",
        "categories",
      ])
      .sort({ publishedAt: -1 })
      .limit(4)
      .toArray()
  )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((x: any) => ({
      ...x,
      etat: x.etat[0].value,
      categories: x.categories?.map((y: { value: string }) => y.value) ?? [],
    })) as {
    title: string;
    description: string;
    etat: string;
    image: string;
    slug: string;
    categories: ProjectCategory[];
  }[];

  const news = (
    await db
      .find({ collection: "actualites" }, [
        "title",
        "description",
        "publishedAt",
        "image",
        "slug",
        "categories",
        "dateEvenement",
      ])
      .sort({ publishedAt: -1 })
      .limit(3)
      .toArray()
  ) // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((x: any) => ({
      ...x,
      publishedAt: new Date(x.publishedAt),
      dateEvenement: x.dateEvenement ? new Date(x.dateEvenement) : null,
      categories: x.categories?.map((y: { value: string }) => y.value) ?? [],
    })) as unknown as {
    title: string;
    description: string;
    image: string;
    slug: string;
    publishedAt: Date;
    dateEvenement: Date | null;
    categories: ActualiteCategory[];
  }[];

  const objectifs = getDocuments("objectifs", [
    "title",
    "description",
    "icon",
    "color",
    "content",
  ]).reverse() as unknown as {
    title: string;
    description: string;
    icon: string;
    color: string;
    content: string;
  }[];

  const page = getDocumentBySlug("static-pages", "page-d-accueil", [
    "content",
  ]) as { content: string };

  return { projects, news, objectifs, page };
}
