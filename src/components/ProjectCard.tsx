import Image from "next/image";
import { Clock, CheckCircle2, ArrowRight } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export function ProjectCard({
  project,
}: {
  project: {
    title: string;
    description: string;
    etat: string;
    image: string;
    slug: string;
  };
}) {
  return (
    <Card key={project.slug} className="group bg-white/80">
      <div className="relative h-48 overflow-hidden rounded-t-lg">
        <Image
          src={project.image || "/placeholder.svg"}
          alt={project.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <Badge
          className={`absolute top-4 right-4 ${
            project.etat === "En cours"
              ? "border-green-400 text-green-400"
              : "border-blue-400 text-blue-400"
          }`}
        >
          {project.etat === "En cours" ? (
            <Clock className="w-3 h-3 mr-1" />
          ) : (
            <CheckCircle2 className="w-3 h-3 mr-1" />
          )}
          {project.etat}
        </Badge>
      </div>
      <CardContent className="p-6">
        <h3 className="text-xl font-semibold mb-2 text-black">
          {project.title}
        </h3>
        <p className="text-black/70 mb-4">{project.description}</p>
      </CardContent>
      <CardFooter className="p-6 pt-0">
        <Link
          href={`/projets/${project.slug}`}
          className="inline-flex items-center text-sm text-black/80 hover:text-black transition-colors"
        >
          En savoir plus
          <ArrowRight className="w-4 h-4 ml-2" />
        </Link>
      </CardFooter>
    </Card>
  );
}
