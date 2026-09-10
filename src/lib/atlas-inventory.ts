import type { PollutionSitesResult } from "./google-sheets";
import { insideCcpmb } from "./ccpmb-territory.ts";

// Atlas-only view: never mutate the source used by the separate /carte page.
export function clipAtlasInventory(inventory: PollutionSitesResult): PollutionSitesResult {
  return { ...inventory, sites: inventory.sites.filter(({ coordinates }) => insideCcpmb(coordinates.lat, coordinates.lng)) };
}
