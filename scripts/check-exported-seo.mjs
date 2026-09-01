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

const notFoundHtml = await readFile(
  path.join(EXPORT_ROOT, "404.html"),
  "utf8",
);
const notFoundHead = notFoundHtml.match(/<head>([\s\S]*?)<\/head>/i)?.[1] ?? "";
const notFoundMain =
  notFoundHtml.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? "";
const notFoundText = notFoundMain
  .replace(/<[^>]+>/g, " ")
  .replace(/\s+/g, " ");

if (!/<meta name="robots" content="[^"]*noindex[^"]*"\/>/i.test(notFoundHead)) {
  errors.push("404.html: missing noindex robots directive");
}
if (/<link rel="canonical"/i.test(notFoundHead)) {
  errors.push("404.html: should not declare a canonical URL");
}
if (!notFoundText.includes("Page introuvable")) {
  errors.push("404.html: missing branded not-found heading");
}
for (const recoveryPath of ["/", "/actualites", "/projets"]) {
  if (!notFoundMain.includes(`href="${recoveryPath}"`)) {
    errors.push(`404.html: missing recovery link to ${recoveryPath}`);
  }
}

// Check actual markup, not matching copy inside serialized React payloads.
const mapHtml = (await readFile(path.join(EXPORT_ROOT, "carte.html"), "utf8"))
  .replace(/<(script|style|template)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
const mapMain = mapHtml.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? "";
const mapHeadings = [...mapMain.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
if (mapHeadings.length !== 1 || !mapHeadings[0][1].trim()) {
  errors.push("carte.html: expected one server-rendered map heading");
}

const mapText = mapMain.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
for (const content of [
  "Visualisez les sites de pollution recensés dans le Pays du Mont Blanc.",
  "Cet inventaire est en cours de construction.",
]) {
  if (!mapText.includes(content)) {
    errors.push(`carte.html: missing server-rendered content: ${content}`);
  }
}
if (!mapMain.includes('href="https://forms.gle/oUp7WnxcNppePk5PA"')) {
  errors.push("carte.html: missing server-rendered contribution form link");
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
