import Image from "next/image";
import {
  ArrowRight,
  Calendar,
  CalendarDays,
  Droplet,
  ExternalLink,
  Heart,
  Mountain,
  Newspaper,
  Wind,
} from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import Link from "next/link";
import { ActualiteCategory, NewsItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatFrenchDate } from "@/lib/date";
import { Badge } from "./ui/badge";

export const categoryStyles: Record<
  ActualiteCategory,
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
  Événement: {
    background: "bg-[#7e22ce]",
    hover: "hover:bg-[#6b21a8]",
    border: "border-[#7e22ce]",
    text: "text-[#7e22ce]",
    lightBg: "bg-[#faf5ff]",
    lightText: "text-[#581c87]",
  },
};

export const categoryFilters: {
  id: ActualiteCategory;
  label: string;
  icon: React.ReactNode;
}[] = [
  { id: "Air", label: "Air", icon: <Wind className="w-4 h-4" /> },
  { id: "Eau", label: "Eau", icon: <Droplet className="w-4 h-4" /> },
  { id: "Sol", label: "Sol", icon: <Mountain className="w-4 h-4" /> },
  { id: "Santé", label: "Santé", icon: <Heart className="w-4 h-4" /> },
  {
    id: "Événement",
    label: "Événement",
    icon: <CalendarDays className="w-4 h-4" />,
  },
];

export function NewsCard({
  item,
}: {
  item: NewsItem;
}) {
  const isEvent = item.categories.includes("Événement");
  const isPresse = item.kind === "presse";
  const displayDate = isEvent
    ? item.dateEvenement || item.publishedAt
    : item.publishedAt;

  return (
    <Card
      key={item.slug}
      className={cn(
        "group bg-white/80",
        isEvent && "border-[#c084fc] bg-[#faf5ff]",
        isPresse && "border-[#a6dca6] bg-[#f1faf1]",
      )}
    >
      <div
        className={cn(
          "relative h-48 overflow-hidden rounded-t-lg",
          isEvent && "border-l-4 border-r-4 border-[#a855f7]",
          isPresse && "border-l-4 border-r-4 border-[#3aab3b]",
        )}
      >
        <Image
          src={item.image || "/logo.png"}
          alt={item.title}
          fill
          sizes="(min-width: 768px) 33vw, 100vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {isEvent && (
          <div className="absolute top-0 left-0 z-10 flex items-center gap-2 bg-[#7e22ce] px-4 py-2 text-sm font-semibold text-white">
            <CalendarDays className="h-4 w-4" />
            Événement
          </div>
        )}
        {isPresse && (
          <div className="absolute top-0 left-0 z-10 flex items-center gap-2 bg-[#3aab3b] px-4 py-2 text-sm font-semibold text-white">
            <Newspaper className="h-4 w-4" />
            Presse
          </div>
        )}
      </div>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-3">
          {isEvent && (
            <Badge
              variant="secondary"
              className="bg-[#f3e8ff] text-[#581c87]"
            >
              <CalendarDays className="h-3 w-3" />
              Événement
            </Badge>
          )}
          {isPresse && (
            <Badge
              variant="secondary"
              className="bg-[#e8f6e8] text-[#2f8a30]"
            >
              <Newspaper className="h-3 w-3" />
              Presse
            </Badge>
          )}
          {item.categories
            .filter((x) => x !== "Événement")
            .map((category) => {
              const styles = categoryStyles[category];
              return (
                <Badge
                  key={category}
                  variant="secondary"
                  className={cn(
                    "transition-colors",
                    styles?.lightBg,
                    styles?.lightText,
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
        <h3 className="text-xl font-semibold mb-2 text-black">{item.title}</h3>
        <div
          className={cn(
            "flex items-center mb-2",
            isEvent ? "text-[#6b21a8]" : "text-gray-600",
          )}
        >
          {isEvent ? (
            <CalendarDays className="w-4 h-4 mr-2" />
          ) : (
            <Calendar className="w-4 h-4 mr-2" />
          )}
          <time dateTime={displayDate.toISOString()}>
            {formatFrenchDate(displayDate)}
          </time>
        </div>
        <p className="text-black/70 mb-4">{item.description}</p>
      </CardContent>
      <CardFooter className="p-6 pt-0">
        {isPresse && item.lien ? (
          <a
            href={item.lien}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm font-medium text-[#2f8a30] hover:text-[#276f28] transition-colors"
          >
            Lire l&apos;article
            <ExternalLink className="w-4 h-4 ml-2" />
          </a>
        ) : (
          <Link
            href={`/actualites/${item.slug}`}
            className="inline-flex items-center text-sm text-black/80 hover:text-black transition-colors"
          >
            En savoir plus
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}
