import assert from "node:assert/strict";
import test from "node:test";
import { createWoodHeatmap, WOOD_HEATMAP_BOUNDS } from "../lib/wood-heatmap.ts";
import { insideCcpmb } from "../lib/ccpmb-territory.ts";

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
test("every coloured heatmap pixel lies inside the commune union", () => {
  const raster=createWoodHeatmap(220);
  const {west,east,south,north}=WOOD_HEATMAP_BOUNDS;
  const mercator=lat=>Math.log(Math.tan(Math.PI/4+lat*Math.PI/360));
  const top=mercator(north),bottom=mercator(south);
  let visible=0;
  for(let y=0;y<raster.height;y++) {
    const lat=(2*Math.atan(Math.exp(top-y/(raster.height-1)*(top-bottom)))-Math.PI/2)*180/Math.PI;
    for(let x=0;x<raster.width;x++) if(raster.pixels[(y*raster.width+x)*4+3]) {
      visible++;
      assert.ok(insideCcpmb(lat,west+x/(raster.width-1)*(east-west)),`Out-of-territory pixel ${x},${y}`);
    }
  }
  assert.ok(visible>100);
});

test("residential demo excludes Chamonix and Les Houches and adds Les Contamines and Praz-sur-Arly", () => {
  const raster = createWoodHeatmap(900);
  const { west, east, south, north } = WOOD_HEATMAP_BOUNDS;
  const mercator = (lat) => Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360));
  const pixel = (lat, lng) => {
    const x = Math.round((lng - west) / (east - west) * (raster.width - 1));
    const y = Math.round((mercator(north) - mercator(lat)) / (mercator(north) - mercator(south)) * (raster.height - 1));
    return [...raster.pixels.slice((y * raster.width + x) * 4, (y * raster.width + x) * 4 + 4)];
  };
  for (const [lat, lng] of [[45.909,6.836],[45.925,6.868],[45.944,6.892],[45.979,6.925]]) {
    assert.equal(pixel(lat,lng)[3],0,"No remaining Chamonix/Bossons/Les Praz/Argentière hotspots");
  }
  for (const [lat,lng] of [[45.821,6.728],[45.837,6.572]]) {
    const [r,g,,a] = pixel(lat,lng);
    assert.ok(a > 200 && r > 220 && g < 90,"Added village has a visible heatmap core");
  }
  assert.equal(pixel(45.886,6.803)[3],0,"Les Houches is excluded too");
  assert.equal(pixel(45.930,6.770)[3],0,"Servoz hotspot is now clipped away");
  assert.ok(pixel(45.929,6.642)[3] > 200,"Existing Sallanches coverage remains present");
});
