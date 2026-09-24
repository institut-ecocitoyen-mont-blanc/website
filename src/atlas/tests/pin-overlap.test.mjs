import assert from "node:assert/strict";
import test from "node:test";
import { overlappingPins, fanPositions } from "../../components/map/pin-overlap.ts";

test("identical coordinates group together while separate pins stay individual", () => {
  const groups = overlappingPins([{ id: "a", x: 0, y: 0 }, { id: "b", x: 0, y: 0 }, { id: "c", x: 100, y: 100 }]);
  assert.deepEqual(groups.map(g => g.map(p => p.id)), [["a", "b"]]);
});
test("only near-identical positions group, and zooming apart splits them", () => {
  const points = [{ id: "a", x: 0, y: 0 }, { id: "b", x: 0.3, y: 0.4 }];
  assert.equal(overlappingPins(points).length, 1);
  assert.equal(overlappingPins(points.map(p => ({ ...p, x: p.x * 3, y: p.y * 3 }))).length, 0);
  assert.equal(overlappingPins(points.slice(0, 1)).length, 0);
});
test("nearby chains never form neighbourhood-sized groups", () => {
  const points = [{ id: "c", x: 1.6, y: 0 }, { id: "a", x: 0, y: 0 }, { id: "b", x: 0.8, y: 0 }];
  assert.deepEqual(overlappingPins(points).map(g => g.map(p => p.id)), [["a", "b"]]);
  assert.deepEqual(overlappingPins([{ id: "a", x: 0, y: 0 }, { id: "b", x: 15, y: 0 }]), []);
});
test("fanned pins stay separated, including dense cross-layer groups", () => {
  for (const count of [2, 5, 10, 40, 100]) {
    const points = fanPositions(count);
    assert.equal(points.length, count);
    for (let i = 0; i < count; i++) for (let j = i + 1; j < count; j++) {
      assert.ok(Math.abs(points[i].x - points[j].x) >= 36 || Math.abs(points[i].y - points[j].y) >= 44);
    }
  }
});
