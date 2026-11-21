import assert from "node:assert/strict";
import test from "node:test";
import { startSwipe, moveSwipe, shouldHide } from "../../src/windows/island/swipeUpToHide.ts";

test("upward intent reserves the pointer before locking, ordinary movement starts native drag", () => {
  const swipe = startSwipe(0, 100, 0);
  assert.equal(moveSwipe(swipe, 1, 94, 25), "pending");
  assert.equal(moveSwipe(swipe, 1, 89, 50), "swipe");
  assert.equal(moveSwipe(startSwipe(0, 100, 0), 8, 94, 25), "drag");
  assert.equal(moveSwipe(startSwipe(0, 100, 0), 0, 104, 25), "drag");
});

test("slow short drag cancels, distance and screen ceiling commit, reversal cancels", () => {
  const swipe = startSwipe(0, 100, 0);
  moveSwipe(swipe, 0, 88, 80);
  assert.equal(shouldHide(swipe, 90, false), false);
  assert.equal(shouldHide(swipe, 90, true), true);
  moveSwipe(swipe, 0, 52, 200);
  assert.equal(swipe.offset, -72 * 48 / 120);
  assert.equal(shouldHide(swipe, 210, false), true);
  moveSwipe(swipe, 0, 67, 220);
  assert.equal(shouldHide(swipe, 220, false), false);
});

test("recent upward flick commits only while velocity is fresh", () => {
  const swipe = startSwipe(0, 100, 0);
  moveSwipe(swipe, 0, 75, 20);
  assert.equal(shouldHide(swipe, 30, false), true);
  assert.equal(shouldHide(swipe, 150, false), false);
});
