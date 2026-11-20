import test from "node:test";
import assert from "node:assert/strict";
import { createPetAnimation, stepPetAnimation, expressionDuration, expressionFrame, musicSegment } from "../../src/features/island-pet/petAnimation.ts";

test("reference sprites have non-uniform frame durations and clamp the last frame", () => {
  assert.equal(expressionFrame("wink", 0.34), 0);
  assert.equal(expressionFrame("wink", 0.36), 1);
  assert.equal(expressionFrame("scan", 0.6), 2);
  assert.equal(expressionFrame("wink", 99), 15);
});

test("music keeps each pose for sixteen seconds then cycles all twelve reference clips", () => {
  assert.deepEqual(musicSegment(15.99), { pose: "microphone", elapsed: 15.99, expression: null, time: 0 });
  assert.equal(musicSegment(16.01).expression, "wink");
  let age = 0;
  const seen = new Set();
  for (const name of ["wink", "delighted", "smug", "blush", "heart", "scan", "side-glance", "giggle", "praised", "peek", "shy-peek", "search"]) {
    seen.add(musicSegment(age + 16.01).expression);
    age += 16 + expressionDuration(name);
  }
  assert.equal(seen.size, 12);
  assert.equal(musicSegment(age + 0.01).pose, "microphone");
});

test("hidden pet pauses its music and expression timeline; a notice does not reset music", () => {
  const pet = createPetAnimation();
  stepPetAnimation(pet, "music", 17, true, false);
  const age = pet.musicAge;
  stepPetAnimation(pet, "music", 30, false, false);
  assert.equal(pet.musicAge, age);
  stepPetAnimation(pet, "notice", 5, true, false);
  stepPetAnimation(pet, "music", 0.1, true, false);
  assert.equal(pet.musicAge, age + 0.1);
});

test("idle clips start after eight seconds and hover reactions have eighteen second cooldown", () => {
  const pet = createPetAnimation();
  stepPetAnimation(pet, "idle", 7.9, true, false);
  assert.equal(pet.clip, null);
  stepPetAnimation(pet, "idle", 0.2, true, false);
  assert.equal(pet.clip?.expression, "scan");
  const hover = createPetAnimation();
  stepPetAnimation(hover, "idle", 0, true, true);
  assert.equal(hover.clip?.expression, "wink");
  stepPetAnimation(hover, "idle", 5, true, false);
  stepPetAnimation(hover, "idle", 0.1, true, true);
  assert.equal(hover.clip, null);
});
