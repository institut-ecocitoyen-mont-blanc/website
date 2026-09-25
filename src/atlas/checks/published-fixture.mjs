import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Local export QA before publication, without changing the application's transport.
export async function usePublishedFixture(page) {
  if (!process.env.ATLAS_DATA_DIR) return;
  await page.route("**/iec-atlas-data/**", async (route) => {
    const path = new URL(route.request().url()).pathname.split("/iec-atlas-data/")[1];
    if (!/^(manifest\.json|data\/[a-z0-9-]+\.json)$/.test(path)) return route.abort();
    const json = JSON.parse(await readFile(join(process.env.ATLAS_DATA_DIR, path), "utf8"));
    await route.fulfill({ json });
  });
}
