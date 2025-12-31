"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { type PollutionSite } from "@/lib/google-sheets";

const HomeMap = dynamic(() => import("@/components/HomeMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] flex items-center justify-center bg-gray-200">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-iec mx-auto mb-4" />
        <p className="text-gray-600">Chargement de la carte...</p>
      </div>
    </div>
  ),
});

interface HomeMapSectionProps {
  sites: PollutionSite[];
}

export default function HomeMapSection({ sites }: HomeMapSectionProps) {
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-8">
          <h2 className="text-3xl font-bold mb-4 text-black">
            Carte des Sites de Pollution
          </h2>
          <p className="text-lg text-black/70">
            Découvrez les sources de pollution identifiées dans le Pays du Mont Blanc
          </p>
        </div>
        <div className="rounded-lg overflow-hidden shadow-lg">
          <HomeMap sites={sites} />
        </div>
        <div className="text-center mt-8">
          <Link
            href="/carte"
            className="inline-flex items-center px-6 py-3 rounded-full bg-blue-iec text-white font-medium hover:bg-blue-700 transition-colors"
          >
            Voir la carte complète
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </div>
    </section>
  );
}
