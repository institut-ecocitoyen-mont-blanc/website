import { createRequire } from "node:module";
import assert from "node:assert/strict";
const { chromium } = createRequire(import.meta.url)("playwright");
const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(process.env.ATLAS_URL || "http://localhost:3000/atlas");
  const sidebar = page.getByRole("complementary", { name: "Couches de l’atlas" });
  await sidebar.getByRole("checkbox", { name: /Qualité des eaux souterraines/ }).check();
  const pin = page.locator(".groundwater-pin").first();
  await pin.waitFor();
  await pin.hover({ force: true });
  await page.locator(".leaflet-tooltip").waitFor();
  assert.equal(await pin.getAttribute("title"), null, "Styled tooltips must not have a duplicate native title tooltip");
  assert.equal(await pin.locator("svg title").count(), 0, "Pin SVG must not add another native tooltip");
  assert.ok(await pin.getAttribute("aria-label"), "Pin retains an accessible label");
  await pin.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("dialog").waitFor();
  console.log("PASS single styled groundwater tooltip, accessible label and keyboard activation");
} finally { await browser.close(); }
