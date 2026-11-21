import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSettings, DEFAULT_SETTINGS } from "../../src/features/appearance/settings.ts";
import { glowStrength, islandGlowKind, motionTiming, springResponse, curvePoint, fadingGlowKind } from "../../src/features/appearance/islandEffects.ts";

test("old settings keep optional halos off and load usable motion defaults", () => {
  const settings = normalizeSettings({});
  assert.equal(settings.musicGlowEnabled, false);
  assert.equal(settings.timerGlowEnabled, false);
  assert.equal(settings.updateGlowEnabled, false);
  assert.equal(settings.motionDuration, 480);
  assert.deepEqual(settings.motionCurve, [0.2, 0, 0, 1]);
});

test("halos follow update then music then timer and never survive a hidden island", () => {
  const settings = { ...DEFAULT_SETTINGS, musicGlowEnabled: true, timerGlowEnabled: true, updateGlowEnabled: true };
  const activity = { music: true, timer: true, updating: true, hidden: false };
  assert.equal(islandGlowKind(settings, activity), "update");
  assert.equal(islandGlowKind(settings, { ...activity, updating: false }), "breath");
  assert.equal(islandGlowKind({ ...settings, musicGlowMode: "rhythm" }, { ...activity, updating: false }), "rhythm");
  assert.equal(islandGlowKind(settings, { ...activity, music: false, updating: false }), "timer");
  assert.equal(islandGlowKind(settings, { ...activity, hidden: true }), "off");
});

test("the previous halo renderer survives shutdown until the fade finishes", () => {
  assert.equal(fadingGlowKind("update", "off", false), "update");
  assert.equal(fadingGlowKind("update", "off", true), "off");
  assert.equal(fadingGlowKind("update", "breath", false), "breath");
});

test("reference breathing lasts 2400ms, rhythm is bounded, and reduced motion is static", () => {
  assert.equal(glowStrength("breath", 0), 0.65);
  assert.ok(Math.abs(glowStrength("breath", 600) - 0.85) < 1e-9);
  assert.ok(Math.abs(glowStrength("breath", 1800) - 0.45) < 1e-9);
  assert.equal(glowStrength("rhythm", 0, -1), 0.12);
  assert.equal(glowStrength("rhythm", 0, 5), 1);
  assert.equal(glowStrength("update", 0), 0.85);
  assert.equal(glowStrength("off", 0, 1, true), 0);
  assert.equal(glowStrength("rhythm", 1000, 1, true), 1);
  assert.equal(glowStrength("rhythm", 1000, 0, true), 0.12);
  assert.equal(glowStrength("update", 1000, 0, true), 0.85);
  assert.equal(glowStrength("breath", 0, 0, true), glowStrength("breath", 600, 0, true));
});

test("each spring parameter and both durations really affect generated motion", () => {
  const baseline = motionTiming(DEFAULT_SETTINGS, true);
  for (const change of [{ springMass: 1.5 }, { springStiffness: 600 }, { springDamping: 70 }, { motionDuration: 1000 }])
    assert.notEqual(motionTiming({ ...DEFAULT_SETTINGS, ...change }, true), baseline);
  assert.notEqual(motionTiming(DEFAULT_SETTINGS, false), baseline);
  assert.ok(baseline.startsWith("linear(0,"));
  assert.ok(baseline.endsWith(",1)"));
  assert.equal(motionTiming({ ...DEFAULT_SETTINGS, motionMode: "curve", motionCurve: [0.1, 0.2, 0.8, 1] }, true), "cubic-bezier(0.1,0.2,0.8,1)");
  assert.ok(motionTiming(DEFAULT_SETTINGS, true, false).startsWith("cubic-bezier("));
  assert.deepEqual(curvePoint([0.2, 0, 0, 1], 0), { x: 0, y: 0 });
  assert.deepEqual(curvePoint([0.2, 0, 0, 1], 1), { x: 1, y: 1 });
  for (const damping of [10, 2 * Math.sqrt(420 * 0.8), 80]) {
    assert.equal(springResponse(0, 0.8, 420, damping), 0);
    assert.ok(Math.abs(springResponse(10, 0.8, 420, damping) - 1) < 1e-6);
  }
});

test("invalid motion archives cannot produce non-finite CSS or out-of-range handles", () => {
  const settings = normalizeSettings({ motionDuration: Infinity, motionCollapseDuration: 1,
    springMass: -3, springStiffness: 9999, springDamping: NaN,
    motionCurve: [-1, 8, 9, -3], musicGlowMode: "fake", motionMode: "bad" });
  assert.equal(settings.motionDuration, DEFAULT_SETTINGS.motionDuration);
  assert.equal(settings.motionCollapseDuration, 150);
  assert.equal(settings.springMass, 0.3);
  assert.equal(settings.springStiffness, 1000);
  assert.equal(settings.springDamping, DEFAULT_SETTINGS.springDamping);
  assert.deepEqual(settings.motionCurve, [0, 1, 1, 0]);
  assert.equal(settings.musicGlowMode, "breath");
  assert.equal(settings.motionMode, "spring");
});
