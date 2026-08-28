import { Suspense } from "react";
import {
  fetchAllPollutionSites,
  type PollutionSite,
  type UnmappedPollutionSite,
} from "@/lib/google-sheets";
import CarteClient from "./CarteClient";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Carte participative des sources de pollution",
  description:
    "Consultez la carte participative des sources potentielles de pollution recensées dans la vallée de l’Arve.",
  path: "/carte",
});

export const revalidate = 3600; // Revalidate every hour

export default async function CartePage() {
  let sites: PollutionSite[] = [];
  let unmappedSites: UnmappedPollutionSite[] = [];
  let lastUpdated: string | null = null;
  let dataError = false;

  try {
    const result = await fetchAllPollutionSites();
    sites = result.sites;
    unmappedSites = result.unmappedSites;
    lastUpdated = result.lastUpdated;
  } catch (error) {
    dataError = true;
    console.error("Unable to load the pollution inventory", error);
  }

  return (
    <Suspense>
      <CarteClient
        sites={sites}
        unmappedSites={unmappedSites}
        lastUpdated={lastUpdated}
        dataError={dataError}
      />
    </Suspense>
  );
}
