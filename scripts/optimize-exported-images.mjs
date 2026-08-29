import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
} from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  RESPONSIVE_IMAGE_WIDTHS,
  getResponsiveImagePath,
} from "../src/lib/responsive-images.mjs";

const EXPORT_ROOT = "out";
const RESPONSIVE_ROOT = path.join(EXPORT_ROOT, "_responsive");
const MAX_BYTES = 1_500_000;
const MAX_DIMENSION = 2400;
const TEXT_EXTENSIONS = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".map",
  ".txt",
  ".webmanifest",
  ".xml",
]);
const RASTER_EXTENSIONS = new Set([".avif", ".jpeg", ".jpg", ".png", ".webp"]);

function imagePipeline(input, extension, maxDimension, usePalette = false) {
  const pipeline = sharp(input).rotate().resize({
    width: maxDimension,
    height: maxDimension,
    fit: "inside",
    withoutEnlargement: true,
  });

  switch (extension) {
    case ".avif":
      return pipeline.avif({ quality: 55, effort: 5 });
    case ".jpeg":
    case ".jpg":
      return pipeline.jpeg({ quality: 85, mozjpeg: true });
    case ".png":
      return pipeline.png({
        compressionLevel: 9,
        adaptiveFiltering: true,
        palette: usePalette,
        quality: 90,
        effort: 10,
      });
    case ".webp":
      return pipeline.webp({ quality: 85, smartSubsample: true });
    default:
      throw new Error(`Unsupported image extension: ${extension}`);
  }
}

async function optimizeInPlace(input) {
  const extension = path.extname(input).toLowerCase();
  const inputStats = await stat(input);
  const inputMetadata = await sharp(input).metadata();
  const temporaryOutput = `${input}.optimized${extension}`;
  let maxDimension = MAX_DIMENSION;
  let usePalette = false;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    await imagePipeline(input, extension, maxDimension, usePalette).toFile(
      temporaryOutput,
    );

    const outputStats = await stat(temporaryOutput);
    if (outputStats.size <= MAX_BYTES) break;

    if (extension === ".png" && !usePalette) {
      usePalette = true;
      continue;
    }

    const scale = Math.min(
      0.9,
      Math.max(0.5, Math.sqrt(MAX_BYTES / outputStats.size) * 0.95),
    );
    const nextMaxDimension = Math.max(320, Math.floor(maxDimension * scale));
    if (nextMaxDimension === maxDimension) break;
    maxDimension = nextMaxDimension;
  }

  const outputStats = await stat(temporaryOutput);
  const mustReplace =
    inputStats.size > MAX_BYTES ||
    (inputMetadata.width ?? 0) > MAX_DIMENSION ||
    (inputMetadata.height ?? 0) > MAX_DIMENSION;

  if (mustReplace || outputStats.size < inputStats.size) {
    await rename(temporaryOutput, input);
    return { before: inputStats.size, after: outputStats.size, replaced: true };
  }

  await rm(temporaryOutput);
  return { before: inputStats.size, after: inputStats.size, replaced: false };
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(entryPath)));
    } else {
      files.push(entryPath);
    }
  }

  return files;
}

function isGeneratedAsset(file) {
  const relative = path.relative(EXPORT_ROOT, file);
  return (
    relative.startsWith(`_next${path.sep}`) ||
    relative.startsWith(`_responsive${path.sep}`)
  );
}

function isReferenced(contents, publicPath) {
  return contents.some(
    (content) =>
      content.includes(publicPath) ||
      content.includes(publicPath.replaceAll("/", "\\/")),
  );
}

const initialFiles = await collectFiles(EXPORT_ROOT);
const imageFiles = initialFiles.filter(
  (file) =>
    RASTER_EXTENSIONS.has(path.extname(file).toLowerCase()) &&
    !isGeneratedAsset(file),
);
const textFiles = initialFiles.filter((file) =>
  TEXT_EXTENSIONS.has(path.extname(file).toLowerCase()),
);
const textContents = await Promise.all(
  textFiles.map((file) => readFile(file, "utf8")),
);

await rm(RESPONSIVE_ROOT, { recursive: true, force: true });

const sourceByStem = new Map();
for (const input of imageFiles) {
  const relativeInput = path.relative(EXPORT_ROOT, input).split(path.sep).join("/");
  const stem = relativeInput.slice(0, -path.extname(relativeInput).length);
  const collision = sourceByStem.get(stem);

  if (collision) {
    throw new Error(
      `Responsive image collision: ${collision} and ${relativeInput} share the same path stem`,
    );
  }

  sourceByStem.set(stem, relativeInput);
}

const responsiveOutputs = [];
let responsiveBytes = 0;

for (const input of imageFiles) {
  const relativeInput = path.relative(EXPORT_ROOT, input).split(path.sep).join("/");
  const publicSource = `/${relativeInput}`;

  for (const width of RESPONSIVE_IMAGE_WIDTHS) {
    const publicOutput = getResponsiveImagePath(publicSource, width);
    if (!isReferenced(textContents, publicOutput)) continue;

    const output = path.join(EXPORT_ROOT, publicOutput.slice(1));
    await mkdir(path.dirname(output), { recursive: true });
    await sharp(input)
      .rotate()
      .resize({ width })
      .webp({ quality: 82, smartSubsample: true })
      .toFile(output);

    responsiveOutputs.push(output);
    responsiveBytes += (await stat(output)).size;
  }
}

let originalBytes = 0;
let optimizedBytes = 0;
let optimizedImages = 0;

for (const input of imageFiles) {
  const result = await optimizeInPlace(input);
  originalBytes += result.before;
  optimizedBytes += result.after;
  if (result.replaced) optimizedImages += 1;
}

for (const output of responsiveOutputs) {
  await stat(output);
}

for (const [index, file] of textFiles.entries()) {
  const finalContents = await readFile(file, "utf8");
  if (finalContents !== textContents[index]) {
    throw new Error(`Image optimization unexpectedly changed text asset: ${file}`);
  }
}

const finalImageFiles = (await collectFiles(EXPORT_ROOT)).filter(
  (file) =>
    RASTER_EXTENSIONS.has(path.extname(file).toLowerCase()) &&
    !path.relative(EXPORT_ROOT, file).startsWith(`_next${path.sep}`),
);
const violations = [];

for (const file of finalImageFiles) {
  const fileStats = await stat(file);
  const metadata = await sharp(file).metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  const isResponsiveVariant = path
    .relative(EXPORT_ROOT, file)
    .startsWith(`_responsive${path.sep}`);

  if (fileStats.size > MAX_BYTES) {
    violations.push(
      `${file}: ${(fileStats.size / 1_000_000).toFixed(2)} MB exceeds 1.50 MB`,
    );
  }
  if (
    width > MAX_DIMENSION ||
    (!isResponsiveVariant && height > MAX_DIMENSION)
  ) {
    violations.push(
      `${file}: ${width}x${height} exceeds ${MAX_DIMENSION}px`,
    );
  }
}

if (violations.length > 0) {
  console.error("Exported image budget exceeded:\n");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

const reduction =
  originalBytes === 0
    ? 0
    : Math.round((1 - optimizedBytes / originalBytes) * 100);
console.log(
  `Optimized ${optimizedImages} of ${imageFiles.length} exported source images in place (${reduction}% smaller) and generated ${responsiveOutputs.length} referenced WebP variants (${(responsiveBytes / 1_000_000).toFixed(2)} MB).`,
);
