import assert from "node:assert/strict";
import test from "node:test";
import { formatClock, nextClockTickDelay } from "../../src/features/clock/formatClock.ts";
import { en, zhCN } from "../../src/i18n/sections/clock.ts";

const defaults = { clockHour12: false, clockPeriod: "none", clockShowSeconds: false };
const dateAt = (hour, minute = 5, second = 9) => new Date(2026, 10, 19, hour, minute, second);
const format = (hour, options = {}, text = en) => formatClock(dateAt(hour), { ...defaults, ...options }, text);

test("24-hour clock preserves midnight and noon with padded digits", () => {
  assert.equal(format(0), "00:05");
  assert.equal(format(12), "12:05");
  assert.equal(format(23, { clockShowSeconds: true }), "23:05:09");
});

test("12-hour clock renders midnight and noon as twelve", () => {
  assert.equal(format(0, { clockHour12: true }), "12:05");
  assert.equal(format(12, { clockHour12: true }), "12:05");
  assert.equal(format(13, { clockHour12: true, clockShowSeconds: true }), "1:05:09");
});

test("AM and PM periods follow noon and localize independently of hour format", () => {
  assert.equal(format(0, { clockPeriod: "ampm" }), "AM 00:05");
  assert.equal(format(12, { clockPeriod: "ampm", clockHour12: true }), "PM 12:05");
  assert.equal(format(11, { clockPeriod: "ampm" }, zhCN), "上午 11:05");
  assert.equal(format(12, { clockPeriod: "ampm" }, zhCN), "下午 12:05");
});

test("detailed periods change at local morning, noon, afternoon, evening and night boundaries", () => {
  const cases = [[0, "凌晨", "Night"], [5, "早上", "Morning"], [9, "上午", "Morning"], [12, "中午", "Noon"], [13, "下午", "Afternoon"], [18, "晚上", "Evening"], [23, "深夜", "Night"]];
  for (const [hour, zh, english] of cases) {
    assert.equal(format(hour, { clockPeriod: "detailed" }, zhCN), `${zh} ${String(hour).padStart(2, "0")}:05`);
    assert.equal(format(hour, { clockPeriod: "detailed" }), `${english} ${String(hour).padStart(2, "0")}:05`);
  }
});

test("clock scheduling aligns to the next visible second or minute", () => {
  assert.equal(nextClockTickDelay(61_250, false), 58_750);
  assert.equal(nextClockTickDelay(61_250, true), 750);
  assert.equal(nextClockTickDelay(60_000, false), 60_000);
});
