"use client";

import {
  categoryFilters,
  categoryStyles,
  NewsCard,
} from "@/components/NewsCard";
import { Search, X } from "lucide-react";
import { act, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ActualiteCategory } from "@/lib/types";
import { useRouter, useSearchParams } from "next/navigation";

export function NewsList({
  items,
}: {
  items: {
    title: string;
    description: string;
    image: string;
    slug: string;
    publishedAt: Date;
    dateEvenement: Date | null;
    categories: ActualiteCategory[];
  }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeFilters, setActiveFilters] = useState<ActualiteCategory[]>(
    () => {
      const categoriesParam = searchParams.get("categories");
      return categoriesParam
        ? (categoriesParam.split(",") as ActualiteCategory[])
        : [];
    }
  );
  const [searchQuery, setSearchQuery] = useState(
    () => searchParams.get("q") || ""
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
    router.push(`/actualites${newUrl}`, { scroll: false });
  }, [activeFilters, searchQuery, router]);

  const toggleFilter = (filter: ActualiteCategory) => {
    setActiveFilters((current) =>
      current.includes(filter)
        ? current.filter((f) => f !== filter)
        : [...current, filter]
    );
  };

  const resetFilters = () => {
    setActiveFilters([]);
    setSearchQuery("");
  };

  const filteredNews = useMemo(() => {
    const result = items.filter((item) => {
      // Category filter
      const matchesCategory =
        activeFilters.length === 0 ||
        activeFilters.some((filter) => item.categories.includes(filter));

      // Search filter
      const searchTerm = searchQuery.toLowerCase();
      const matchesSearch =
        searchTerm === "" ||
        item.title.toLowerCase().includes(searchTerm) ||
        item.description.toLowerCase().includes(searchTerm);

      return matchesCategory && matchesSearch;
    });

    if (activeFilters.includes("Événement")) {
      return result.sort((a, b) => {
        if (a.dateEvenement && b.dateEvenement) {
          return a.dateEvenement.getTime() - b.dateEvenement.getTime();
        }
        return 0;
      });
    }

    return result;
  }, [activeFilters, searchQuery, items]);

  return (
    <div className="container mx-auto">
      <h1 className="text-4xl font-bold mb-8 text-center">Actualités</h1>

      {/* Search Bar */}
      <div className="max-w-2xl mx-auto mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Rechercher une actualité..."
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
                    : `border-2 ${styles.border} ${styles.text} hover:${styles.lightBg}`
                )}
              >
                {filter.icon}
                {filter.label}
                {isActive && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "ml-2 bg-white/20 text-white",
                      "dark:bg-white/20 dark:text-white"
                    )}
                  >
                    {
                      filteredNews.filter((p) =>
                        p.categories.includes(filter.id)
                      ).length
                    }
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {filteredNews.map((item) => (
          <NewsCard key={item.slug} item={item} />
        ))}
      </div>

      {/* No Results Message */}
      {filteredNews.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg mb-8 mt-8">
            Aucune actualité ne correspond à votre recherche.
          </p>
          <Button onClick={resetFilters} variant="outline" className="mt-4">
            Réinitialiser les filtres
          </Button>
        </div>
      )}
    </div>
  );
}
