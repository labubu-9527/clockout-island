import test from "node:test";
import assert from "node:assert/strict";
import { createNoticeQueue, advanceNoticeQueue, messageNotice, deviceNotice } from "../../src/windows/island/noticeQueue.ts";

const preview = (id, receivedAt = 0, otpCode) => ({ source: "qqMail", messageId: id, mailAccount: "test@example.test", title: id, body: id, receivedAt, otpCode });
const msg = (id, at = 0, otpCode) => messageNotice(preview(id, at, otpCode), 5000, at);
const step = (state, now, incoming = [], extra = {}) => advanceNoticeQueue(state, { now, incoming, ...extra });
const id = state => state.active?.id;

test("same-priority notices are FIFO and display time starts when selected", () => {
  let s = step(createNoticeQueue(0), 0, [msg("one"), msg("two"), msg("three")]);
  assert.equal(s.active.payload.preview.title, "one");
  s = step(s, 5000);
  assert.equal(s.active.payload.preview.title, "two");
  assert.equal(s.active.remainingMs, 5000);
  s = step(s, 10000);
  assert.equal(s.active.payload.preview.title, "three");
});

test("code preempts ordinary messages, which resume with remaining time", () => {
  let s = step(createNoticeQueue(0), 0, [msg("chat"), msg("next")]);
  s = step(s, 1000, [msg("code", 1000, "123456")]);
  assert.equal(s.active.payload.preview.otpCode, "123456");
  s = step(s, 6000);
  assert.equal(s.active.payload.preview.title, "chat");
  assert.equal(s.active.remainingMs, 4000);
});

test("hover and selection hold the active item and defer replacement", () => {
  let s = step(createNoticeQueue(0), 0, [msg("chat")]);
  s = step(s, 1000, [], { holding: true });
  s = step(s, 20000, [msg("code", 20000, "654321")], { holding: true });
  assert.equal(s.active.payload.preview.title, "chat");
  assert.equal(s.active.remainingMs, 4000);
  s = step(s, 21000, [], { holding: false });
  assert.equal(s.active.payload.preview.title, "code");
});

test("repeated snapshots and body updates never restart or replay a notice", () => {
  const entry = msg("one");
  let s = step(createNoticeQueue(0), 0, [entry]);
  s = step(s, 2000, [{ ...entry, payload: { kind: "message", preview: { ...entry.payload.preview, detail: "Loaded body" } } }]);
  assert.equal(s.active.remainingMs, 3000);
  assert.equal(s.active.payload.preview.detail, "Loaded body");
  assert.equal(s.pending.length, 0);
  s = step(s, 5000, [entry]);
  assert.equal(s.active, null);
  s = step(s, 6000, [entry]);
  assert.equal(s.active, null);
});

test("identity separates accounts and stable IDs but ignores loading changes", () => {
  const p = preview("same");
  assert.equal(messageNotice(p, 5000, 0).id, messageNotice({ ...p, detail: "body", receivedAt: 100 }, 5000, 100).id);
  assert.notEqual(messageNotice(p, 5000, 0).id, messageNotice({ ...p, mailAccount: "other@example.test" }, 5000, 0).id);
});

test("queued stale codes and messages expire without expiring the held reader", () => {
  let s = step(createNoticeQueue(0), 0, [msg("held")], { holding: true });
  s = step(s, 1000, [msg("code", 1000, "123456"), msg("waiting", 1000)], { holding: true });
  s = step(s, 32000, [], { holding: true });
  assert.deepEqual(s.pending.map(n => n.payload.preview.title), ["waiting"]);
  s = step(s, 62000, [], { holding: true });
  assert.equal(s.pending.length, 0);
  assert.equal(s.active.payload.preview.title, "held");
});

test("device changes coalesce and never replay after higher priority content", () => {
  const change = (value, at) => deviceNotice({ kind: "capsLock", value, at });
  let s = step(createNoticeQueue(0), 0, [change(true, 0)]);
  s = step(s, 1000, [change(false, 1000)]);
  assert.equal(s.active.payload.notice.value, false);
  assert.equal(s.active.remainingMs, 2000);
  s = step(s, 1100, [msg("chat", 1100)]);
  assert.equal(s.active.payload.kind, "message");
  assert.equal(s.pending.length, 0);
  s = step(s, 1200, [change(true, 1200)]);
  assert.equal(s.pending.length, 0);
  s = step(s, 6100);
  assert.equal(s.active, null);
});

test("disabling or clearing sources removes both active and waiting notices", () => {
  let s = step(createNoticeQueue(0), 0, [msg("one"), msg("two")]);
  const previousId = id(s);
  s = step(s, 100, [], { isValid: entry => entry.id !== previousId });
  assert.equal(s.active.payload.preview.title, "two");
  s = step(s, 200, [], { isValid: () => false });
  assert.equal(s.active, null);
});

test("panel and game boundaries clear pending items without replay on return", () => {
  const one = msg("one");
  let s = step(createNoticeQueue(0), 0, [one, msg("two")]);
  s = step(s, 100, [], { enabled: false });
  assert.equal(s.active, null);
  assert.equal(s.pending.length, 0);
  s = step(s, 200, [one]);
  assert.equal(s.active, null);
});

test("capacity retains twenty pending items and protects priority codes", () => {
  let s = step(createNoticeQueue(0), 0, [msg("reader")], { holding: true });
  s = step(s, 100, [msg("code", 100, "123456"), ...Array.from({ length: 25 }, (_, i) => msg(`chat-${i}`, 100))], { holding: true });
  assert.equal(s.pending.length, 20);
  assert(s.pending.some(n => n.payload.preview.otpCode));
  assert(!s.pending.some(n => n.payload.preview.title === "chat-0"));
});

test("new messages use full duration after delayed timer processing", () => {
  let s = step(createNoticeQueue(0), 0, [msg("one"), msg("two")]);
  s = step(s, 25000);
  assert.equal(s.active.payload.preview.title, "two");
  assert.equal(s.active.remainingMs, 5000);
});

test("incoming stale source snapshots are ignored", () => {
  const s = step(createNoticeQueue(70000), 70000, [msg("old", 0)]);
  assert.equal(s.active, null);
});
