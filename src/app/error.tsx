"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CircleAlert, Home, RotateCcw } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ErrorPageProps = {
  error: Error & { digest?: string };
  unstable_retry: () => void;
};

export default function ErrorPage({
  error,
  unstable_retry,
}: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

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

      <div className="container relative mx-auto">
        <div className="mx-auto max-w-2xl rounded-[2rem] border border-white bg-white/80 px-6 py-12 text-center shadow-[0_30px_80px_-35px_rgba(15,23,42,0.35)] backdrop-blur sm:px-12 sm:py-16">
          <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-blue-iec/10 text-blue-iec">
            <CircleAlert aria-hidden="true" className="size-8" />
          </span>
          <p className="mt-6 text-sm font-semibold text-blue-iec">
            Erreur inattendue
          </p>
          <h1 className="mt-3 text-balance text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            Une erreur est survenue
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-lg leading-8 text-slate-600">
            Nous n’avons pas pu afficher cette page. Vous pouvez réessayer ou
            revenir à l’accueil pour poursuivre votre visite.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={unstable_retry}
              className={cn(
                buttonVariants({ size: "lg" }),
                "bg-blue-iec text-white hover:bg-blue-700",
              )}
            >
              <RotateCcw aria-hidden="true" />
              Réessayer
            </button>
            <Link
              href="/"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "border-blue-iec/20 bg-white text-blue-iec hover:bg-blue-iec/5 hover:text-blue-iec",
              )}
            >
              <Home aria-hidden="true" />
              Retour à l’accueil
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
