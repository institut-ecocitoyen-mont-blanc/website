import { getDocuments } from "outstatic/server";
import { ProjectCategory } from "@/lib/types";
import { ProjectList } from "@/components/ProjectList";

export default async function ProjectsPage() {
  const { projects } = await getData();

  return (
    <main className="flex-grow min-h-screen bg-gray-100">
      <section className="py-16 pt-32">
        <ProjectList projects={projects} />
      </section>
    </main>
  );
}

async function getData() {
  const projects = (
    getDocuments("projets", [
      "title",
      "description",
      "etat",
      "image",
      "slug",
      "categories",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ]) as any
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

  return { projects };
}
