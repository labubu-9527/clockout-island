import assert from "node:assert/strict";
import test from "node:test";
import { collapsedPresentationLayout, collapsedPresentationWidth, visibleCollapsedSlots } from "../../src/windows/island/collapsedPresentation.ts";

test("music hides ordinary slots and keeps its independent center", () => {
  assert.deepEqual(visibleCollapsedSlots(["cpu", "pet", "text", "clock", "music", "memory"], {}, true), ["text", "music"]);
  assert.deepEqual(visibleCollapsedSlots(["text", "pet", "clock"], { text: false }, false), ["text", "clock"]);
  assert.deepEqual(visibleCollapsedSlots(["music", "cpu", "text"], {}, true), ["text", "music"]);
});

test("crowded ordinary presentation hides auxiliary readings before computing final width", () => {
  const layout = collapsedPresentationLayout({ textWidth: 96, pet: true, clockWidth: 150, statusCount: 2, weather: true, shelf: true, music: true, agents: true, messages: 7 });
  assert.equal(layout.compact, true);
  assert.equal(layout.width, 368);
});

test("auto width shrinks with text and hidden indicators, while music is stable", () => {
  assert.equal(collapsedPresentationWidth({ textWidth: 96, pet: false, clockWidth: 0, statusCount: 0, weather: false, shelf: false, music: false, agents: false, messages: 0 }), 96);
  assert.equal(collapsedPresentationWidth({ textWidth: 36, pet: true, clockWidth: 0, statusCount: 0, weather: false, shelf: false, music: false, agents: false, messages: 0 }), 96);
  const ordinary = { textWidth: 96, pet: true, clockWidth: 44, statusCount: 2, weather: true, shelf: true, music: true, agents: true, messages: 1 };
  assert.ok(collapsedPresentationWidth(ordinary) > 280);
  assert.equal(collapsedPresentationWidth({ ...ordinary, lyricMode: true }), 380);
  assert.equal(collapsedPresentationWidth({ ...ordinary, lyricMode: true, pet: false, messages: 0 }), 300);
});

test("manual widths above 280 still yield auxiliary readings when occupied space exceeds them", () => {
  const options = { textWidth: 96, pet: true, clockWidth: 52, statusCount: 2, weather: false, shelf: false, music: true, agents: false, messages: 1 };
  assert.equal(collapsedPresentationLayout(options, 480).compact, false);
  assert.equal(collapsedPresentationLayout(options, 300).compact, true);
});
