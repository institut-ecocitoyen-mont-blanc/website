import { createRequire } from "node:module";
import assert from "node:assert/strict";
const { chromium } = createRequire(import.meta.url)("playwright");
const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 1920, height: 720 }]) {
    const page = await browser.newPage({ viewport });
    await page.goto(process.env.ATLAS_URL || "http://localhost:3000/atlas");
    const map = page.locator(".leaflet-container");
    await map.waitFor();
    const sidebar = page.getByRole("complementary", { name: "Couches de l’atlas" });
    assert.equal(await sidebar.evaluate(el => getComputedStyle(el).overflowY), "visible");
    const layout = await sidebar.evaluate(el => {
      const rect = el.parentElement.getBoundingClientRect();
      return { left: rect.left, right: rect.right, bottom: rect.bottom + window.scrollY };
    });
    assert.ok(layout.left <= 17 && layout.right >= viewport.width - 17, "Atlas uses full page width");
    const intro = await page.locator("main h1").evaluate(el => {
      const rect = el.parentElement.getBoundingClientRect();
      return { left: rect.left, right: rect.right, normalContainer: el.parentElement.classList.contains("container") };
    });
    assert.ok(intro.normalContainer && intro.left > layout.left && intro.right < layout.right, "Intro uses the normal centered site container, independently of the full-width map");
    await page.evaluate(() => window.scrollTo(0, 450));
    await page.waitForFunction(() => Math.abs(document.querySelector('.leaflet-container').getBoundingClientRect().top - 128) < 2);
    const stuck = await map.boundingBox();
    assert.ok(stuck.y + stuck.height <= viewport.height - 15, "Sticky map fits viewport");
    const headerBottom = await page.locator("body > header, header").first().evaluate(el => el.getBoundingClientRect().bottom);
    assert.ok(stuck.y >= headerBottom, "Sticky map clears site header");
    await page.evaluate(() => window.scrollBy(0, 200));
    assert.ok(Math.abs((await map.boundingBox()).y - stuck.y) < 2, "Map stays fixed during page scroll");
    await page.screenshot({ path: `/tmp/atlas-sticky-${viewport.width}.png` });
    await page.evaluate(bottom => window.scrollTo(0, bottom - 250), layout.bottom);
    await page.waitForFunction(() => document.querySelector('.leaflet-container').getBoundingClientRect().top < 128);
    const end = await map.boundingBox();
    const footerTop = await page.locator("footer").last().evaluate(el => el.getBoundingClientRect().top);
    assert.ok(end.y + end.height <= footerTop, "Map stops before footer");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    console.log(`PASS ${viewport.width}px: full-width, page-scrolling layers, viewport-sized sticky map, footer boundary`);
    await page.close();
  }
} finally { await browser.close(); }
