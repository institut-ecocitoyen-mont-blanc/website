"use client";

import {
  categoryFilters,
  categoryStyles,
  ProjectCard,
} from "@/components/ProjectCard";
import { Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ProjectCategory } from "@/lib/types";
import { useRouter, useSearchParams } from "next/navigation";

export function ProjectList({
  projects,
}: {
  projects: {
    title: string;
    description?: string;
    etat: string;
    image?: string;
    slug: string;
    categories: ProjectCategory[];
  }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeFilters, setActiveFilters] = useState<ProjectCategory[]>(() => {
    const categoriesParam = searchParams.get("categories");
    return categoriesParam
      ? (categoriesParam.split(",") as ProjectCategory[])
      : [];
  });
  const [searchQuery, setSearchQuery] = useState(
    () => searchParams.get("q") || "",
  );

  // Update URL when filters or search query changes
  useEffect(() => {
    const params = new URLSearchParams();

    if (activeFilters.length > 0) {
      params.set("categories", activeFilters.join(","));
    }

    if (searchQuery) {
      params.set("q", searchQuery);
    }

    const newUrl = params.toString() ? `?${params.toString()}` : "";
    router.push(`/projets${newUrl}`, { scroll: false });
  }, [activeFilters, searchQuery, router]);

  const toggleFilter = (filter: ProjectCategory) => {
    setActiveFilters((current) =>
      current.includes(filter)
        ? current.filter((f) => f !== filter)
        : [...current, filter],
    );
  };

  const resetFilters = () => {
    setActiveFilters([]);
    setSearchQuery("");
  };

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      // Category filter
      const matchesCategory =
        activeFilters.length === 0 ||
        activeFilters.some((filter) => project.categories.includes(filter));

      // Search filter
      const searchTerm = searchQuery.toLowerCase();
      const matchesSearch =
        searchTerm === "" ||
        project.title.toLowerCase().includes(searchTerm) ||
        project.description?.toLowerCase().includes(searchTerm);

      return matchesCategory && matchesSearch;
    });
  }, [activeFilters, searchQuery, projects]);

  return (
    <div className="container mx-auto">
      <h1 className="text-4xl font-bold mb-8 text-center">Nos Projets</h1>

      {/* Search Bar */}
      <div className="max-w-2xl mx-auto mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Rechercher un projet..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-8">
        <div className="flex flex-wrap justify-center gap-4">
          {categoryFilters.map((filter) => {
            const isActive = activeFilters.includes(filter.id);
            const styles = categoryStyles[filter.id];

            return (
              <Button
                key={filter.id}
                onClick={() => toggleFilter(filter.id)}
                variant={isActive ? "default" : "outline"}
                className={cn(
                  "gap-2 transition-colors",
                  isActive
                    ? `${styles.background} ${styles.hover} border-transparent`
                    : `border-2 ${styles.border} ${styles.text} hover:${styles.lightBg}`,
                )}
              >
                {filter.icon}
                {filter.label}
                {isActive && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "ml-2 bg-white/20 text-white",
                      "dark:bg-white/20 dark:text-white",
                    )}
                  >
                    {
                      filteredProjects.filter((p) =>
                        p.categories.includes(filter.id),
                      ).length
                    }
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {filteredProjects.map((project) => (
          <ProjectCard key={project.slug} project={project} />
        ))}
      </div>

      {/* No Results Message */}
      {filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg mb-8 mt-8">
            Aucun projet ne correspond à votre recherche.
          </p>
          <Button onClick={resetFilters} variant="outline" className="mt-4">
            Réinitialiser les filtres
          </Button>
        </div>
      )}
    </div>
  );
}
