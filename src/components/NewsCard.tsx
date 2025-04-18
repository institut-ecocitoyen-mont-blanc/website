import Image from "next/image";
import {
  ArrowRight,
  Calendar,
  CalendarDays,
  Droplet,
  Heart,
  Mountain,
  Wind,
} from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import Link from "next/link";
import { ActualiteCategory } from "@/lib/types";
import { cn } from "@/lib/utils";
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
    background: "bg-purple-600",
    hover: "hover:bg-purple-700",
    border: "border-purple-600",
    text: "text-purple-600",
    lightBg: "bg-purple-50",
    lightText: "text-purple-900",
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
  item: {
    slug: string;
    image: string;
    title: string;
    description: string;
    publishedAt: Date;
    dateEvenement: Date | null;
    categories: ActualiteCategory[];
  };
}) {
  const isEvent = item.categories.includes("Événement");

  return (
    <Card key={item.slug} className="group bg-white/80">
      <div
        className={cn(
          "relative h-48 overflow-hidden rounded-t-lg",
          isEvent && "border-l-4 border-r-4 border-purple-500"
        )}
      >
        <Image
          src={item.image || "/logo.png"}
          alt={item.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {isEvent && (
          <div className="absolute top-0 left-0 w-full bg-purple-500 text-white py-2 px-4 text-center font-semibold z-10">
            <CalendarDays className="w-4 h-4 inline-block mr-2 -mt-1.5" />
            Événement
          </div>
        )}
        {isEvent && (
          <div className="absolute bottom-0 left-0 w-full bg-black/50 backdrop-blur-sm text-white p-3">
            <div className="text-center">
              <span className="block text-xl font-bold">
                {(item.dateEvenement || item.publishedAt).toDateString()}
              </span>
            </div>
          </div>
        )}
      </div>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-3">
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
                    styles?.lightText
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
        {!isEvent && (
          <div className="flex items-center text-gray-600 mb-2">
            <Calendar className="w-4 h-4 mr-2" />
            <span>{item.publishedAt.toDateString()}</span>
          </div>
        )}
        <p className="text-black/70 mb-4">{item.description}</p>
      </CardContent>
      <CardFooter className="p-6 pt-0">
        <Link
          href={`/actualites/${item.slug}`}
          className="inline-flex items-center text-sm text-black/80 hover:text-black transition-colors"
        >
          En savoir plus
          <ArrowRight className="w-4 h-4 ml-2" />
        </Link>
      </CardFooter>
    </Card>
  );
}
