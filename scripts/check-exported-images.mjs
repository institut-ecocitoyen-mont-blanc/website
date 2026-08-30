import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const EXPORT_ROOT = "out";
const HTML_PATTERN = /<img\b[^>]*>/gi;
const ATTRIBUTE_PATTERN = /([\w:-]+)=(?:"([^"]*)"|'([^']*)')/g;
const RASTER_PATTERN = /\.(?:avif|jpe?g|png|webp)(?:[?#].*)?$/i;

async function collectHtmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectHtmlFiles(entryPath)));
    } else if (entry.name.endsWith(".html")) {
      files.push(entryPath);
    }
  }

  return files;
}

function attributesFor(tag) {
  const attributes = new Map();
  for (const match of tag.matchAll(ATTRIBUTE_PATTERN)) {
    attributes.set(match[1].toLowerCase(), match[2] ?? match[3] ?? "");
  }
  return attributes;
}

function localRasterPath(url) {
  if (!url.startsWith("/") || url.startsWith("//") || !RASTER_PATTERN.test(url)) {
    return null;
  }

  return decodeURIComponent(url.split(/[?#]/, 1)[0]);
}

const htmlFiles = await collectHtmlFiles(EXPORT_ROOT);
const errors = [];
let imageTags = 0;
let responsiveImageTags = 0;
const referencedAssets = new Set();

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");

  for (const tag of html.match(HTML_PATTERN) ?? []) {
    imageTags += 1;
    const attributes = attributesFor(tag);
    const source = attributes.get("src") ?? "";
    const sourcePath = localRasterPath(source);
    if (!sourcePath) continue;

    const sourceSet = attributes.get("srcset");
    if (!sourceSet) {
      errors.push(`${file}: local raster image ${source} is missing srcset`);
      continue;
    }

    responsiveImageTags += 1;
    if (/\s\d+w(?:,|$)/.test(sourceSet) && !attributes.has("sizes")) {
      errors.push(`${file}: width-based srcset for ${source} is missing sizes`);
    }

    for (const candidate of [
      source,
      ...sourceSet.split(",").map((item) => item.trim().split(/\s+/, 1)[0]),
    ]) {
      const assetPath = localRasterPath(candidate);
      if (assetPath) referencedAssets.add(assetPath);
    }
  }
}

for (const assetPath of referencedAssets) {
  try {
    await access(path.join(EXPORT_ROOT, assetPath.slice(1)));
  } catch {
    errors.push(`Referenced image asset does not exist: ${assetPath}`);
  }
}

const homeHtml = await readFile(path.join(EXPORT_ROOT, "index.html"), "utf8");
const heroTag = (homeHtml.match(HTML_PATTERN) ?? []).find((tag) =>
  tag.includes('alt="Environmental research"'),
);

if (!heroTag || !/fetchpriority="high"/i.test(heroTag)) {
  errors.push("Homepage hero image is missing fetchpriority=high");
}

for (const listing of ["projets", "actualites"]) {
  const listingHtml = await readFile(
    path.join(EXPORT_ROOT, `${listing}.html`),
    "utf8",
  );
  const mainHtml = listingHtml.slice(listingHtml.indexOf("<main"));
  const listingImages = (mainHtml.match(HTML_PATTERN) ?? []).filter((tag) =>
    tag.includes(
      'class="object-cover transition-transform duration-300 group-hover:scale-105"',
    ),
  );
  const firstListingImage = listingImages[0];
  const imagePreloads = (listingHtml.match(/<link\b[^>]*>/gi) ?? []).filter(
    (tag) => {
      const attributes = attributesFor(tag);
      return (
        attributes.get("rel") === "preload" && attributes.get("as") === "image"
      );
    },
  );

  if (!firstListingImage || /loading="lazy"/i.test(firstListingImage)) {
    errors.push(`First ${listing} card image is still lazy-loaded`);
  }

  if (imagePreloads.length !== 1) {
    errors.push(
      `${listing}.html should preload exactly one image, found ${imagePreloads.length}`,
    );
  } else if (firstListingImage) {
    const firstSourceSet = attributesFor(firstListingImage).get("srcset");
    const preloadedSourceSet = attributesFor(imagePreloads[0]).get(
      "imagesrcset",
    );

    if (!firstSourceSet || firstSourceSet !== preloadedSourceSet) {
      errors.push(`${listing}.html does not preload its first card image`);
    }
  }

  if (listingImages.slice(1).some((tag) => !/loading="lazy"/i.test(tag))) {
    errors.push(`${listing}.html eagerly loads more than the first card image`);
  }
}

const headers = await readFile(path.join(EXPORT_ROOT, "_headers"), "utf8");
for (const expectedRule of [
  "/_next/static/*\n  Cache-Control: public, max-age=31536000, immutable",
  "/_responsive/*\n  Cache-Control: public, max-age=86400, stale-while-revalidate=604800",
]) {
  if (!headers.includes(expectedRule)) {
    errors.push(
      `_headers is missing cache rule: ${expectedRule.split("\n", 1)[0]}`,
    );
  }
}

if (errors.length > 0) {
  console.error("Exported image checks failed:\n");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Checked ${imageTags} exported image tags: ${responsiveImageTags} local raster images use responsive sources and ${referencedAssets.size} referenced assets exist.`,
);
