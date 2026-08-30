import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const EXPORT_ROOT = "out";
const SITE_URL = "https://institut-ecocitoyen-pmb.fr";

async function collectHtmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectHtmlFiles(entryPath)));
    } else if (
      entry.name.endsWith(".html") &&
      entry.name !== "404.html" &&
      entry.name !== "_not-found.html"
    ) {
      files.push(entryPath);
    }
  }

  return files;
}

const htmlFiles = await collectHtmlFiles(EXPORT_ROOT);
const canonicalOwners = new Map();
const errors = [];

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const titles = [...html.matchAll(/<title>([^<]+)<\/title>/g)];
  const descriptions = [
    ...html.matchAll(/<meta name="description" content="([^"]*)"\/>/g),
  ];
  const canonicals = [
    ...html.matchAll(/<link rel="canonical" href="([^"]+)"\/>/g),
  ];

  if (
    /<p\b[^>]*class="[^"]*\bmarkdown\b[^"]*"[^>]*>\s*<(?:p|h[1-6]|ul|ol|div)\b/i.test(
      html,
    )
  ) {
    errors.push(`${file}: block-level Markdown content is nested inside a p`);
  }

  if (titles.length !== 1) {
    errors.push(`${file}: expected one title, found ${titles.length}`);
  }
  if (descriptions.length !== 1 || descriptions[0][1].trim() === "") {
    errors.push(`${file}: expected one non-empty meta description`);
  }
  if (canonicals.length !== 1) {
    errors.push(`${file}: expected one canonical, found ${canonicals.length}`);
    continue;
  }

  const canonical = canonicals[0][1];
  if (!canonical.startsWith(SITE_URL)) {
    errors.push(`${file}: canonical is outside ${SITE_URL}`);
  }
  if (canonical.includes("?") || canonical.includes("#")) {
    errors.push(`${file}: canonical contains a query string or fragment`);
  }

  const existingOwner = canonicalOwners.get(canonical);
  if (existingOwner) {
    errors.push(`${file}: canonical duplicates ${existingOwner}`);
  } else {
    canonicalOwners.set(canonical, file);
  }
}

const expectedListingCanonicals = new Map([
  [path.join(EXPORT_ROOT, "actualites.html"), `${SITE_URL}/actualites`],
  [path.join(EXPORT_ROOT, "projets.html"), `${SITE_URL}/projets`],
]);

for (const [file, expectedCanonical] of expectedListingCanonicals) {
  const html = await readFile(file, "utf8");
  if (!html.includes(`<link rel="canonical" href="${expectedCanonical}"/>`)) {
    errors.push(`${file}: missing base listing canonical ${expectedCanonical}`);
  }
}

const robots = await readFile(path.join(EXPORT_ROOT, "robots.txt"), "utf8");
if (!robots.includes("Disallow: /outstatic/")) {
  errors.push("robots.txt: public CMS redirect is not disallowed");
}
if (!robots.includes(`Sitemap: ${SITE_URL}/sitemap.xml`)) {
  errors.push("robots.txt: sitemap declaration is missing");
}

if (errors.length > 0) {
  console.error("Exported SEO contract failed:\n");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Checked ${htmlFiles.length} public pages (${canonicalOwners.size} unique canonicals).`,
);
