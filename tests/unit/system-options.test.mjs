import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSettings } from "../../src/features/appearance/settings.ts";

test("legacy system slot expands in place and deduplicates independent slots", () => {
  const settings = normalizeSettings({ collapsedLayout: ["music", "system", "text", "mail", "shelf", "agents"] });
  assert.deepEqual(settings.collapsedLayout, ["music", "cpu", "memory", "text", "mail", "shelf", "agents", "weather", "clock", "pet", "wireless"]);
  assert.deepEqual(normalizeSettings({ collapsedLayout: ["memory", "system", "cpu"] }).collapsedLayout.slice(0, 2), ["memory", "cpu"]);
});

test("CPU and memory default on and remain independently switchable", () => {
  assert.equal(normalizeSettings({}).cpuEnabled, true);
  assert.equal(normalizeSettings({}).memoryEnabled, true);
  for (const cpuEnabled of [true, false]) for (const memoryEnabled of [true, false]) {
    const settings = normalizeSettings({ cpuEnabled, memoryEnabled });
    assert.equal(settings.cpuEnabled, cpuEnabled);
    assert.equal(settings.memoryEnabled, memoryEnabled);
  }
});

test("damaged collapsed layout falls back to defaults", () => {
  for (const collapsedLayout of ["system", 42, {}, null]) {
    assert.deepEqual(normalizeSettings({ collapsedLayout }).collapsedLayout, normalizeSettings({}).collapsedLayout);
  }
});

test("clock and pet gain slots without changing existing order and have independent defaults", () => {
  const settings = normalizeSettings({ collapsedLayout: ["weather", "text"] });
  assert.equal(settings.clockEnabled, true);
  assert.equal(settings.petEnabled, true);
  assert.deepEqual(settings.collapsedLayout.slice(-3), ["clock", "pet", "wireless"]);
  assert.deepEqual(settings.collapsedLayout.slice(0, 2), ["weather", "text"]);
  const changed = normalizeSettings({ clockEnabled: false, petEnabled: false, clockHour12: true, clockPeriod: "detailed", clockShowSeconds: true });
  assert.equal(changed.clockEnabled, false);
  assert.equal(changed.petEnabled, false);
  assert.equal(changed.clockHour12, true);
  assert.equal(changed.clockPeriod, "detailed");
  assert.equal(changed.clockShowSeconds, true);
  assert.equal(normalizeSettings({ clockPeriod: "invalid" }).clockPeriod, "none");
});
