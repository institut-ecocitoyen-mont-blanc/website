import { getDocuments } from "outstatic/server";
import { ProjectCategory } from "@/lib/types";
import { ProjectList } from "@/components/ProjectList";
import { Suspense } from "react";

export default async function ProjectsPage() {
  const { projects } = await getData();

  return (
    <main className="grow min-h-screen bg-gray-100">
      <section className="py-16 pt-32 min-h-screen">
        <Suspense>
          <ProjectList projects={projects} />
        </Suspense>
      </section>
    </main>
  );
}

async function getData() {
  const projects = getDocuments("projets", [
    "title",
    "description",
    "etat",
    "image",
    "slug",
    "categories",
  ]).map((x) => ({
    ...x,
    etat: x.etat[0].value,
    categories: (x.categories?.map((y) => y.value) as ProjectCategory[]) ?? [],
  }));

  return { projects };
}
