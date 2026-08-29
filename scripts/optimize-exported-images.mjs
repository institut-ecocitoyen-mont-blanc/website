import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
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

const rewrites = new Map();
let originalBytes = 0;
let optimizedBytes = 0;

for (const input of imageFiles) {
  const extension = path.extname(input).toLowerCase();
  const inputStats = await stat(input);
  const relativeInput = path.relative(EXPORT_ROOT, input);
  const temporaryOutput = `${input}.optimized.webp`;

  originalBytes += inputStats.size;

  await sharp(input)
    .rotate()
    .resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 85, smartSubsample: true })
    .toFile(temporaryOutput);

  const outputStats = await stat(temporaryOutput);

  if (extension === ".webp") {
    if (outputStats.size < inputStats.size) {
      await rename(temporaryOutput, input);
      optimizedBytes += outputStats.size;
    } else {
      await rm(temporaryOutput);
      optimizedBytes += inputStats.size;
    }
    continue;
  }

  const output = `${input.slice(0, -extension.length)}.webp`;
  if (outputStats.size >= inputStats.size) {
    await rm(temporaryOutput);
    optimizedBytes += inputStats.size;
    continue;
  }

  try {
    await stat(output);
    throw new Error(`Image optimization collision: ${output}`);
  } catch (error) {
    if (
      !(
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ENOENT"
      )
    ) {
      throw error;
    }
  }

  await rename(temporaryOutput, output);
  optimizedBytes += outputStats.size;
  rewrites.set(relativeInput, path.relative(EXPORT_ROOT, output));
}

for (const file of textFiles) {
  const original = await readFile(file, "utf8");
  let rewritten = original;

  for (const [from, to] of rewrites) {
    rewritten = rewritten.split(from).join(to);
    rewritten = rewritten
      .split(from.replaceAll("/", "\\/"))
      .join(to.replaceAll("/", "\\/"));
  }

  if (rewritten !== original) {
    await writeFile(file, rewritten);
  }
}

for (const [relativeInput] of rewrites) {
  const input = path.join(EXPORT_ROOT, relativeInput);
  const plainReference = relativeInput;
  const escapedReference = relativeInput.replaceAll("/", "\\/");

  for (const file of textFiles) {
    const contents = await readFile(file, "utf8");
    if (
      contents.includes(plainReference) ||
      contents.includes(escapedReference)
    ) {
      throw new Error(`Unrewritten image reference ${relativeInput} in ${file}`);
    }
  }

  await rm(input);
}

for (const output of responsiveOutputs) {
  await stat(output);
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
  `Optimized ${imageFiles.length} exported images (${rewrites.size} converted to WebP, ${reduction}% smaller) and generated ${responsiveOutputs.length} referenced responsive variants (${(responsiveBytes / 1_000_000).toFixed(2)} MB).`,
);
