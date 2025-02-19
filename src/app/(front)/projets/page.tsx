import { getDocuments } from "outstatic/server";
import { ProjectCard } from "@/components/ProjectCard";

export default async function ProjectsPage() {
  const { projects } = await getData();

  return (
    <main className="flex-grow">
      <section className="py-16 pt-32 bg-gray-100">
        <div className="container mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-center">Nos Projets</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {projects.map((project) => (
              <ProjectCard key={project.slug} project={project} />
            ))}
          </div>
        </div>
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ]) as any
  )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((x: any) => ({ ...x, etat: x.etat[0].value })) as {
    title: string;
    description: string;
    etat: string;
    image: string;
    slug: string;
  }[];

  return { projects };
}
