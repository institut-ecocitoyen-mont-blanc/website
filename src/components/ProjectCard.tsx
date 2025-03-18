import Image from "next/image";
import {
  Clock,
  CheckCircle2,
  ArrowRight,
  Droplet,
  Heart,
  Mountain,
  Wind,
  Users,
} from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ProjectCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

export const categoryStyles: Record<
  ProjectCategory,
  {
    background: string;
    hover: string;
    border: string;
    text: string;
    lightBg: string;
    lightText: string;
  }
> = {
  Air: {
    background: "bg-sky-600",
    hover: "hover:bg-sky-700",
    border: "border-sky-600",
    text: "text-sky-600",
    lightBg: "bg-sky-50",
    lightText: "text-sky-900",
  },
  Eau: {
    background: "bg-blue-600",
    hover: "hover:bg-blue-700",
    border: "border-blue-600",
    text: "text-blue-600",
    lightBg: "bg-blue-50",
    lightText: "text-blue-900",
  },
  Sol: {
    background: "bg-amber-700",
    hover: "hover:bg-amber-800",
    border: "border-amber-700",
    text: "text-amber-700",
    lightBg: "bg-amber-50",
    lightText: "text-amber-900",
  },
  Santé: {
    background: "bg-red-600",
    hover: "hover:bg-red-700",
    border: "border-red-600",
    text: "text-red-600",
    lightBg: "bg-red-50",
    lightText: "text-red-900",
  },
  "Science Participative": {
    background: "bg-emerald-600",
    hover: "hover:bg-emerald-700",
    border: "border-emerald-600",
    text: "text-emerald-600",
    lightBg: "bg-emerald-50",
    lightText: "text-emerald-900",
  },
};

export const categoryFilters: {
  id: ProjectCategory;
  label: string;
  icon: React.ReactNode;
}[] = [
  { id: "Air", label: "Air", icon: <Wind className="w-4 h-4" /> },
  { id: "Eau", label: "Eau", icon: <Droplet className="w-4 h-4" /> },
  { id: "Sol", label: "Sol", icon: <Mountain className="w-4 h-4" /> },
  { id: "Santé", label: "Santé", icon: <Heart className="w-4 h-4" /> },
  {
    id: "Science Participative",
    label: "Science Participative",
    icon: <Users className="w-4 h-4" />,
  },
];

export function ProjectCard({
  project,
}: {
  project: {
    title: string;
    description: string;
    etat: string;
    image: string;
    slug: string;
    categories: ProjectCategory[];
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
        <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
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
        <div className="absolute top-4 left-4 flex flex-wrap gap-2 max-w-[calc(100%-120px)]">
          {project.categories.map((category) => {
            const styles = categoryStyles[category];
            return (
              <Badge
                key={category}
                variant="secondary"
                className={cn(
                  "transition-colors",
                  styles.lightBg,
                  styles.lightText
                )}
              >
                {categoryFilters.find((f) => f.id === category)?.icon}
                <span className="ml-1">
                  {categoryFilters.find((f) => f.id === category)?.label}
                </span>
              </Badge>
            );
          })}
        </div>
      </div>
      <CardContent>
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
