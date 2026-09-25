import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { CCPMB_COMMUNES } from "../lib/ccpmb-territory.ts";
const { chromium } = createRequire(import.meta.url)("playwright");
const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.route("**/COUCHE_FRANCE_ENTIERE_MAJ_2026/FeatureServer/1/query?**", (route) => route.fulfill({ json: {
    features: CCPMB_COMMUNES.map(({ code }) => ({ attributes: { code_insee: code, f2025_12: 0.58 } })),
  } }));
  await page.goto(process.env.ATLAS_URL || "http://localhost:3000/atlas");
  await page.getByRole("checkbox", { name: /Pollution lumineuse/ }).check();
  const polygon = page.locator(".leaflet-cerema-light-pane path").first();
  await polygon.waitFor();
  await page.locator(".leaflet-container").scrollIntoViewIfNeeded();
  await polygon.dispatchEvent("mouseover", { clientX: 700, clientY: 350 });
  const tooltip = page.locator(".leaflet-tooltip").filter({ hasText: "décembre 2025" });
  await tooltip.waitFor();
  const stacking = await tooltip.evaluate((element) => {
    const pane = element.closest(".leaflet-pane");
    const polygonPane = document.querySelector(".leaflet-cerema-light-pane");
    return { pane: pane.className, z: Number(getComputedStyle(pane).zIndex), polygonZ: Number(getComputedStyle(polygonPane).zIndex) };
  });
  console.log(stacking);
  await page.locator(".leaflet-container").screenshot({ path: "/tmp/atlas-cerema-tooltip.png" });
  assert.match(stacking.pane, /leaflet-tooltip-pane/, "Tooltip must not inherit the coloured polygon pane");
  assert.ok(stacking.z > stacking.polygonZ, "Tooltip must stack above the polygon overlay");
  console.log("PASS: Cerema tooltip uses the foreground tooltip pane");
} finally { await browser.close(); }
