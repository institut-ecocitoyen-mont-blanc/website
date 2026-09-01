import Link from "next/link";
import {
  ArrowRight,
  FolderKanban,
  Home,
  Newspaper,
  SearchX,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createNotFoundMetadata } from "@/lib/seo";

export const metadata = createNotFoundMetadata("Page introuvable");

const recoveryLinks = [
  {
    href: "/actualites",
    label: "Voir les actualités",
    description: "Les dernières nouvelles et les prochains rendez-vous",
    icon: Newspaper,
  },
  {
    href: "/projets",
    label: "Découvrir les projets",
    description: "Nos travaux de recherche et de sciences participatives",
    icon: FolderKanban,
  },
];

export default function GlobalNotFound() {
  return (
    <main className="relative isolate flex min-h-[78vh] items-center overflow-hidden bg-slate-50 px-4 pb-16 pt-32">
      <div
        aria-hidden="true"
        className="absolute -left-24 top-28 h-72 w-72 rounded-full bg-blue-iec/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -right-24 bottom-8 h-72 w-72 rounded-full bg-green-iec/10 blur-3xl"
      />

      <div className="container relative mx-auto grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">
        <div className="max-w-2xl">
          <p className="mb-5 inline-flex items-center rounded-full border border-blue-iec/20 bg-white px-3 py-1 text-sm font-semibold text-blue-iec shadow-sm">
            Erreur 404
          </p>
          <h1 className="text-balance text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            Page introuvable
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
            Cette page n’existe plus ou son adresse a changé. Vous pouvez
            revenir à l’accueil ou poursuivre votre visite ci-dessous.
          </p>

          <div className="mt-8">
            <Link
              href="/"
              className={cn(
                buttonVariants({ size: "lg" }),
                "bg-blue-iec text-white hover:bg-blue-700",
              )}
            >
              <Home aria-hidden="true" />
              Retour à l’accueil
            </Link>
          </div>

          <nav
            aria-label="Poursuivre la navigation"
            className="mt-10 grid gap-3 sm:grid-cols-2"
          >
            {recoveryLinks.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-iec/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-iec focus-visible:ring-offset-2"
                >
                  <span className="flex items-center gap-3 font-semibold text-slate-950">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-blue-iec/10 text-blue-iec">
                      <Icon aria-hidden="true" className="size-4" />
                    </span>
                    {item.label}
                    <ArrowRight
                      aria-hidden="true"
                      className="ml-auto size-4 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-blue-iec"
                    />
                  </span>
                  <span className="mt-3 block text-sm leading-6 text-slate-600">
                    {item.description}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div
          aria-hidden="true"
          className="relative mx-auto hidden aspect-square w-full max-w-sm items-center justify-center rounded-[2.5rem] border border-white bg-white/70 shadow-[0_30px_80px_-35px_rgba(15,23,42,0.35)] backdrop-blur sm:flex"
        >
          <div className="absolute inset-5 rounded-[2rem] border border-dashed border-blue-iec/20" />
          <div className="text-center">
            <SearchX className="mx-auto mb-5 size-14 text-green-iec" />
            <p className="bg-gradient-to-br from-blue-iec to-green-iec bg-clip-text text-8xl font-black tracking-tighter text-transparent">
              404
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
