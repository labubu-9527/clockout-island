import test from "node:test";
import assert from "node:assert/strict";
import { resolvePetState } from "../../src/features/island-pet/petState.ts";

const inactive = { notice: false, agentAttention: false, agentWorking: false, focusing: false, musicPlaying: false };

test("pet is idle when no activity is present", () => {
  assert.equal(resolvePetState(inactive), "idle");
});

test("pet prioritizes notifications and agent attention, then music over ordinary work and focus", () => {
  const priorities = [
    ["notice", "notice"],
    ["agentAttention", "agentAttention"],
    ["musicPlaying", "music"],
    ["agentWorking", "agentWorking"],
    ["focusing", "focused"],
  ];
  for (let i = 0; i < priorities.length; i += 1) {
    const input = { ...inactive };
    for (const [key] of priorities.slice(i)) input[key] = true;
    assert.equal(resolvePetState(input), priorities[i][1]);
  }
});

test("each activity independently selects its expression", () => {
  for (const [key, state] of [["notice", "notice"], ["agentAttention", "agentAttention"], ["agentWorking", "agentWorking"], ["focusing", "focused"], ["musicPlaying", "music"]]) {
    assert.equal(resolvePetState({ ...inactive, [key]: true }), state);
  }
});
