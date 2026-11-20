import assert from "node:assert/strict";
import test from "node:test";
import { settingsContentExtent } from "../../src/windows/settings/settingsContentHeight.ts";

test("content extent uses the furthest visible child and ignores the final hidden tab", () => {
  assert.equal(settingsContentExtent([{ bottom: 80, visible: true }, { bottom: 520, visible: true }, { bottom: 0, visible: false }], 24), 544);
  assert.equal(settingsContentExtent([{ bottom: 800, visible: false }, { bottom: 200, visible: true }], 12), 212);
});
