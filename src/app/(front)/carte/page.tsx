import { Suspense } from "react";
import { fetchAllPollutionSites } from "@/lib/google-sheets";
import CarteClient from "./CarteClient";

export const revalidate = 3600; // Revalidate every hour

export default async function CartePage() {
  const { sites, unmappedSites } = await fetchAllPollutionSites();

  return (
    <Suspense>
      <CarteClient sites={sites} unmappedSites={unmappedSites} />
    </Suspense>
  );
}
