import { Suspense } from "react";
import {
  fetchAllPollutionSites,
  type PollutionSite,
  type UnmappedPollutionSite,
} from "@/lib/google-sheets";
import CarteClient from "./CarteClient";

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
