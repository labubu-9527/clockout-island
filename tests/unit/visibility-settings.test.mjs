import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSettings, DEFAULT_SETTINGS, isSameSettings, withAppearanceFrom } from "../../src/features/appearance/settings.ts";
import { withCollapsedSlotVisibility, withMessageSourceVisibility } from "../../src/features/appearance/visibilitySettings.ts";

test("shape and all visibility fields have compatible defaults", () => {
  const next = normalizeSettings({ islandShape: "invalid" });
  assert.equal(next.islandShape, "notch");
  assert.ok(Object.values(next.collapsedSlotVisibility).every(Boolean));
  assert.ok(Object.values(next.messageSourceVisibility).every(Boolean));
});

test("missing slot fields migrate independently from legacy choices", () => {
  const next = normalizeSettings({ cpuEnabled: false, memoryEnabled: false, clockEnabled: false,
    petEnabled: false, showCollapsedText: false, collapsedSlotVisibility: { cpu: true } });
  assert.equal(next.collapsedSlotVisibility.cpu, true);
  for (const slot of ["memory", "clock", "pet", "text"]) assert.equal(next.collapsedSlotVisibility[slot], false);
  assert.equal(next.collapsedSlotVisibility.music, true);
  assert.equal(normalizeSettings({ islandShape: "pill" }).islandShape, "pill");
});

test("visibility toggles retain services and synchronize legacy display fields and mail", () => {
  const music = withCollapsedSlotVisibility(DEFAULT_SETTINGS, "music", false);
  assert.equal(music.musicEnabled, true);
  assert.equal(music.collapsedSlotVisibility.music, false);
  assert.equal(withCollapsedSlotVisibility(DEFAULT_SETTINGS, "cpu", false).cpuEnabled, false);
  assert.equal(withCollapsedSlotVisibility(DEFAULT_SETTINGS, "text", false).showCollapsedText, false);
  const mail = withCollapsedSlotVisibility(DEFAULT_SETTINGS, "mail", false);
  assert.equal(mail.mailEnabled, true);
  assert.equal(mail.messageSourceVisibility.qqMail, false);
  assert.equal(withMessageSourceVisibility(mail, "qqMail", true).collapsedSlotVisibility.mail, true);
});

test("normalization validates each source and retains mail alias", () => {
  assert.equal(normalizeSettings({ collapsedSlotVisibility: { mail: false } }).messageSourceVisibility.qqMail, false);
  const normalized = normalizeSettings({ messageSourceVisibility: { qq: false, plugin: "invalid" } });
  assert.equal(normalized.messageSourceVisibility.qq, false);
  assert.equal(normalized.messageSourceVisibility.plugin, true);
  assert.ok(isSameSettings(normalized, normalizeSettings(normalized)));
});

test("canonical visibility overrides stale legacy flags in both directions", () => {
  for (const visible of [true, false]) {
    const normalized = normalizeSettings({ cpuEnabled: !visible, memoryEnabled: !visible,
      clockEnabled: !visible, petEnabled: !visible, showCollapsedText: !visible,
      collapsedSlotVisibility: { cpu: visible, memory: visible, clock: visible, pet: visible, text: visible } });
    for (const key of ["cpuEnabled", "memoryEnabled", "clockEnabled", "petEnabled", "showCollapsedText"]) {
      assert.equal(normalized[key], visible, key);
    }
  }
});

test("appearance reset and presets synchronize legacy display fields while retaining services", () => {
  const hidden = normalizeSettings({ cpuEnabled: false, memoryEnabled: false, clockEnabled: false,
    petEnabled: false, showCollapsedText: false, musicEnabled: false, mailEnabled: false });
  const reset = withAppearanceFrom(hidden, DEFAULT_SETTINGS);
  for (const key of ["cpuEnabled", "memoryEnabled", "clockEnabled", "petEnabled", "showCollapsedText"]) {
    assert.equal(reset[key], true, key);
  }
  assert.equal(reset.musicEnabled, false);
  assert.equal(reset.mailEnabled, false);
  const preset = withAppearanceFrom(DEFAULT_SETTINGS, hidden);
  for (const key of ["cpuEnabled", "memoryEnabled", "clockEnabled", "petEnabled", "showCollapsedText"]) {
    assert.equal(preset[key], false, key);
  }
  assert.equal(preset.musicEnabled, true);
  assert.equal(preset.mailEnabled, true);
});
