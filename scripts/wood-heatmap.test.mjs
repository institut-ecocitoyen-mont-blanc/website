import assert from "node:assert/strict";
import test from "node:test";
import { createWoodHeatmap } from "../src/lib/wood-heatmap.ts";

test("fictional heatmap is deterministic, with transparent surroundings and a full colour ramp", () => {
  const first = createWoodHeatmap(200);
  assert.deepEqual(first, createWoodHeatmap(200));
  assert.equal(first.pixels.length, first.width * first.height * 4);
  let transparent = 0, red = 0, blue = 0, green = 0, yellow = 0;
  for (let i = 0; i < first.pixels.length; i += 4) {
    const [r, g, b, a] = first.pixels.slice(i, i + 4);
    if (!a) { transparent++; continue; }
    if (r > 220 && g < 90) red++;
    if (b > 180 && r < 80) blue++;
    if (g > 180 && r < 100 && b < 150) green++;
    if (r > 210 && g > 180 && b < 90) yellow++;
  }
  assert.ok(transparent > first.width * first.height / 2);
  for (const count of [red, blue, green, yellow]) assert.ok(count > 0);
  // No rectangular tint at the geographic boundary.
  for (let x = 0; x < first.width; x++) {
    assert.equal(first.pixels[x * 4 + 3], 0);
    assert.equal(first.pixels[((first.height - 1) * first.width + x) * 4 + 3], 0);
  }
});

test("invalid raster sizes are rejected", () => {
  for (const width of [0, -1, 1.5, NaN, Infinity, 3000]) {
    assert.throws(() => createWoodHeatmap(width), /Invalid heatmap width/);
  }
});
