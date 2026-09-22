import { ccpmbLongitudeSpans } from "./ccpmb-territory.ts";
// Entirely fictional hotspots: no measurements, household locations, emissions
// estimates or health thresholds are represented.
export const WOOD_HEATMAP_BOUNDS = { west: 6.45, south: 45.7, east: 7.1, north: 46.1 };
export const WOOD_HEATMAP_GRADIENT = "linear-gradient(to right, #2546e8, #00cfff, #21d660, #ffe229, #f52222)";

// [latitude, longitude, illustrative weight, east-west spread, north-south spread]
const HOTSPOTS = [
  [45.942, 6.624, 0.92, 0.017, 0.009],
  [45.929, 6.642, 1.05, 0.018, 0.010],
  [45.909, 6.651, 0.85, 0.015, 0.011],
  [45.890, 6.661, 1.10, 0.020, 0.009],
  [45.919, 6.686, 0.76, 0.018, 0.008],
  [45.931, 6.708, 0.94, 0.018, 0.008],
  [45.924, 6.735, 1.05, 0.020, 0.009],
  [45.912, 6.756, 0.88, 0.017, 0.008],
  [45.930, 6.770, 0.83, 0.017, 0.008],
  [45.927, 6.805, 0.69, 0.016, 0.008],
  [45.894, 6.709, 0.98, 0.015, 0.010],
  [45.875, 6.716, 0.87, 0.017, 0.009],
  [45.852, 6.723, 0.65, 0.015, 0.008],
  [45.864, 6.622, 0.81, 0.017, 0.009],
  [45.848, 6.611, 1.02, 0.018, 0.009],
  [45.832, 6.584, 0.77, 0.018, 0.008],
  // Les Contamines-Montjoie: village and southern residential valley.
  [45.821, 6.728, 1.00, 0.012, 0.012],
  [45.808, 6.722, 0.75, 0.009, 0.010],
  // Praz-sur-Arly: strengthen the village centre, beyond the existing east fringe.
  [45.837, 6.572, 1.00, 0.013, 0.008],
] as const;

const COLORS = [[37, 70, 232], [0, 207, 255], [33, 214, 96], [255, 226, 41], [245, 34, 34]];
const mercatorY = (latitude: number) => Math.log(Math.tan(Math.PI / 4 + latitude * Math.PI / 360));

export function createWoodHeatmap(width = 900) {
  if (!Number.isInteger(width) || width < 2 || width > 2048) throw new Error("Invalid heatmap width");
  const { west, east, north, south } = WOOD_HEATMAP_BOUNDS;
  const top = mercatorY(north), bottom = mercatorY(south);
  const height = Math.round(width * (top - bottom) / ((east - west) * Math.PI / 180));
  const field = new Float32Array(width * height);
  const xFor = (longitude: number) => (longitude - west) / (east - west) * (width - 1);
  const yFor = (latitude: number) => (top - mercatorY(latitude)) / (top - bottom) * (height - 1);

  for (const [lat, lng, weight, spreadX, spreadY] of HOTSPOTS) {
    const cx = xFor(lng), cy = yFor(lat);
    const sx = xFor(lng + spreadX) - cx, sy = cy - yFor(lat + spreadY);
    for (let y = Math.max(0, Math.floor(cy - 3 * sy)); y <= Math.min(height - 1, Math.ceil(cy + 3 * sy)); y++) {
      for (let x = Math.max(0, Math.floor(cx - 3 * sx)); x <= Math.min(width - 1, Math.ceil(cx + 3 * sx)); x++) {
        field[y * width + x] += weight * Math.exp(-0.5 * (((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2));
      }
    }
  }

  const mask = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const lat = (2 * Math.atan(Math.exp(top - y / (height - 1) * (top - bottom))) - Math.PI / 2) * 180 / Math.PI;
    for (const [left, right] of ccpmbLongitudeSpans(lat)) {
      const start = Math.max(0, Math.ceil(xFor(left))), end = Math.min(width - 1, Math.floor(xFor(right)));
      if (start <= end) mask.fill(1, y * width + start, y * width + end + 1);
    }
  }
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < field.length; i++) {
    const value = Math.min(1, field[i]);
    if (value < 0.055 || !mask[i]) continue;
    const scaled = Math.max(0, (value - 0.055) / 0.945) * (COLORS.length - 1);
    const index = Math.min(COLORS.length - 2, Math.floor(scaled));
    const fraction = scaled - index;
    for (let channel = 0; channel < 3; channel++) {
      pixels[i * 4 + channel] = COLORS[index][channel] * (1 - fraction) + COLORS[index + 1][channel] * fraction;
    }
    // Fade the outer fringe; layer opacity controls the whole raster.
    pixels[i * 4 + 3] = Math.min(1, (value - 0.055) / 0.13) * 235;
  }
  return { width, height, pixels };
}
