import assert from "node:assert/strict";
import test from "node:test";
import * as glow from "../../src/features/appearance/islandEffects.ts";

test("default shape motion uses the reference spring while retaining custom settings", () => {
  const defaults = glow.DEFAULT_ISLAND_EFFECTS;
  assert.equal(defaults.springMass, 1);
  assert.equal(defaults.springStiffness, 380);
  assert.ok(Math.abs(defaults.springDamping / (2 * Math.sqrt(380)) - 0.82) < 0.0001);
  assert.equal(glow.normalizeIslandEffects({ springMass: 1.4, springStiffness: 550, springDamping: 40 }).springDamping, 40);
});

test("reference glow springs retain velocity when reversing and settle independently of frame rate", () => {
  let state = { value: 0, velocity: 0 };
  for (let i = 0; i < 6; i++) state = glow.stepGlowSpring(state, 1, 1 / 60);
  const reversed = glow.stepGlowSpring(state, 0, 1 / 120);
  assert.ok(reversed.value > state.value, "momentum survives retargeting");
  const advance = fps => {
    let value = { value: 0, velocity: 0 };
    for (let i = 0; i < fps; i++) value = glow.stepGlowSpring(value, 1, 1 / fps);
    return value.value;
  };
  assert.ok(Math.abs(advance(30) - advance(120)) < 0.002);
  for (let i = 0; i < 120; i++) state = glow.stepGlowSpring(state, 0, 1 / 60);
  assert.deepEqual(state, { value: 0, velocity: 0 });
});
