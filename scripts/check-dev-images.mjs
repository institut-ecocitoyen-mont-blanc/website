import assert from "node:assert/strict";

// Run against `npm run dev`. Cover next/image (header, cards, partners) and
// Markdown images, without requiring a prior production export.
const origin = new URL(process.argv[2] ?? "http://localhost:3000");
const pages = ["/", "/projets/livre-blanc-pollutions-polluants"];
const assets = new Set();
const errors = [];
let images = 0;

for (const page of pages) {
  const response = await fetch(new URL(page, origin), {
    signal: AbortSignal.timeout(30000),
  });
  assert.equal(response.status, 200, `Unable to load ${page}`);
  const html = await response.text();
  const tags = html.match(/<img\b[^>]*>/gi) ?? [];
  assert.ok(tags.length > 0, `No images found on ${page}`);

  for (const tag of tags) {
    images += 1;
    const attributes = new Map(
      Array.from(tag.matchAll(/([\w:-]+)=(?:"([^"]*)"|'([^']*)')/g),
        (match) => [match[1].toLowerCase(), match[2] ?? match[3]]),
    );
    const candidates = [
      attributes.get("src") ?? "",
      ...(attributes.get("srcset") ?? "").split(",").map(
        (item) => item.trim().split(/\s+/, 1)[0],
      ),
    ];
    for (const candidate of candidates) {
      if (!candidate.startsWith("/") || candidate.startsWith("//")) continue;
      if (candidate.startsWith("/_responsive/")) {
        errors.push(`${page}: export-only image URL ${candidate}`);
      } else {
        assets.add(candidate.replaceAll("&amp;", "&"));
      }
    }
  }
}

await Promise.all(Array.from(assets, async (asset) => {
  const response = await fetch(new URL(asset, origin), {
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) {
    errors.push(`${asset}: ${response.status} ${response.headers.get("content-type")}`);
  }
  await response.body?.cancel();
}));

assert.equal(errors.length, 0, errors.join("\n"));
console.log(`Checked ${images} image tags across ${pages.length} dev pages; ${assets.size} local images are served without export-only URLs.`);
