import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import Link from "next/link";

export function NewsCard({
  item,
}: {
  item: { slug: string; image: string; title: string; description: string };
}) {
  return (
    <Card key={item.slug} className="group bg-white/80">
      <div className="relative h-48 overflow-hidden rounded-t-lg">
        <Image
          src={item.image || "/placeholder.svg"}
          alt={item.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>
      <CardContent className="p-6">
        <h3 className="text-xl font-semibold mb-2 text-black">{item.title}</h3>
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
