import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

function load(path, mocks) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(new URL(`../../src/features/messages/${path}`, import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(source, { exports, require: (id) => {
    if (!(id in mocks)) throw new Error(`Missing mock ${id}`);
    return mocks[id];
  }, Date, window: { setTimeout: () => 1, clearTimeout() {} } });
  return exports;
}
function hooks() {
  const slots = [];
  let index = 0;
  const effects = [];
  return { render: (run) => { index = 0; effects.length = 0; const result = run(); effects.forEach((effect) => effect()); return result; },
    react: {
      useRef(value) { const key = index++; return slots[key] ??= { current: value }; },
      useState(value) { const key = index++; slots[key] ??= { value }; return [slots[key].value, (next) => { slots[key].value = typeof next === "function" ? next(slots[key].value) : next; }]; },
      useCallback: (fn) => fn,
      useEffect: (fn) => effects.push(fn),
      useLayoutEffect: (fn) => effects.push(fn),
    } };
}

test("plugin arrivals include every owner-scoped message and skip startup history", () => {
  const runner = hooks();
  let notifications = [{ id: "old", receivedAt: 1 }];
  const owned = () => notifications.map((item) => ({ title: "", appName: "app", body: "body", ...item }));
  const plugin = load("pluginNotifications.ts", { react: runner.react, "../plugins": { usePlugins: () => ({
    registry: { installed: { a: { enabled: true }, b: { enabled: true } } },
    live: { a: { status: "running", notifications: owned() }, b: { status: "running", notifications: owned() } },
  }) } });
  const arrivals = [];
  const render = () => runner.render(() => plugin.usePluginPreview(true, 8, (item) => arrivals.push(item)));
  render();
  assert.equal(arrivals.length, 0);
  const now = Date.now();
  notifications = [...notifications, { id: "new", receivedAt: now }, { id: "later", receivedAt: now + 1 }];
  render();
  assert.equal(arrivals.length, 4);
  assert.deepEqual(arrivals.map((item) => item.pluginId).sort(), ["a", "a", "b", "b"]);
  assert.deepEqual(arrivals.map((item) => item.messageId), ["new", "new", "later", "later"]);
  render();
  assert.equal(arrivals.length, 4);
  notifications = notifications.map((item) => item.id === "new" ? { ...item, body: "updated body" } : item);
  render();
  assert.equal(arrivals.length, 6);
  assert.ok(arrivals.slice(4).every((item) => item.messageId === "new" && item.body === "updated body"));
});

test("QQ forwards each accepted native arrival even after legacy burst expires", async () => {
  const runner = hooks();
  let event;
  const api = { listenQQNotificationsChanged: async (callback) => { event = callback; return () => {}; },
    setQQNotificationsEnabled: async () => ({ revision: 0, enabled: true, items: [] }) };
  const module = load("qq-notifications/useQQNotifications.ts", {
    react: runner.react, "../../../i18n": { useTranslation: () => ({ wechat: {} }) }, "@tauri-apps/api/core": { isTauri: () => true },
    "./api": api, "./storage": { isQQNotificationsEnabled: () => true, hasRequestedQQNotificationAccess: () => true },
    "../qqNotificationTiming": { nextQQPreview: () => ({ timing: {}, expiresAt: null }) },
  });
  const arrivals = [];
  runner.render(() => module.useQQNotifications(true, 5, (item) => arrivals.push(item)));
  await new Promise(setImmediate);
  for (let revision = 1; revision <= 3; revision++) event({ payload: { windowVisible: true, newestId: String(revision), snapshot: {
    revision, enabled: true, items: [{ id: String(revision), title: "sender", body: "message", createdAt: revision * 100 }],
  } } });
  assert.equal(arrivals.length, 3);
  assert.deepEqual(arrivals.map((item) => item.receivedAt), [100, 200, 300]);
  assert.deepEqual(arrivals.map((item) => item.messageId), ["1", "2", "3"]);
  const items = [{ id: "5", createdAt: 500 }, { id: "4", createdAt: 400 }, { id: "3", createdAt: 300 }];
  event({ payload: { windowVisible: true, newestId: "5", snapshot: { revision: 4, enabled: true, items } } });
  assert.deepEqual(arrivals.slice(3).map((item) => item.messageId), ["4", "5"]);
  event({ payload: { windowVisible: true, newestId: "5", snapshot: { revision: 5, enabled: true, items } } });
  assert.deepEqual(arrivals.slice(5).map((item) => item.messageId), ["5"]);
});

test("mail notices preserve arrival metadata and managed body does not replace legacy preview", () => {
  const runner = hooks();
  let callbacks;
  let contentArgs;
  const message = { id: "queued", unread: true, sender: "sender", subject: "subject", receivedAt: 100, otpCode: "123456" };
  const mailbox = { email: "a@example.com", enabled: true, status: "connected", items: [message], lastSyncedAt: 200 };
  const noop = () => {};
  const module = load("mail/useMail.ts", {
    react: runner.react, "../../../i18n": { useTranslation: () => ({ wechat: {} }) }, "@tauri-apps/plugin-opener": {},
    "../qqNotificationTiming": { nextQQPreview: () => ({ timing: {}, expiresAt: null }) }, "./mailDomain": {},
    "./useMailAccounts": { useMailAccounts: (options) => { callbacks = options; return { mailboxes: [mailbox], setActionError: noop }; } },
    "./useMailReader": { useMailReader: () => ({ closeReader: noop }) },
    "./useMarkAllRead": { useMarkAllRead: () => ({}) },
    "./useMailOtp": { useMailOtp: () => ({ copyArrival: noop }) },
    "./useMailPreviewContent": { useMailPreviewContent: (...args) => { contentArgs = args; return {}; } },
  });
  const arrivals = [];
  const controller = runner.render(() => module.useMail(true, { previewBody: true,
    managedPreview: { account: mailbox.email, id: message.id }, onNotice: (item) => arrivals.push(item) }));
  assert.equal(controller.preview, null);
  assert.equal(contentArgs[0].id, "queued");
  assert.equal(contentArgs[1], mailbox.email);
  const beforeArrival = Date.now();
  callbacks.onEvent({ snapshot: mailbox, newestId: "queued", windowVisible: true });
  assert.ok(arrivals[0].receivedAt >= beforeArrival);
  assert.equal(arrivals.length, 1);
  assert.equal(arrivals[0].mailAccount, mailbox.email);
  assert.equal(arrivals[0].otpCode, "123456");
  assert.equal(arrivals[0].messageId, "queued");
  const batch = { ...mailbox, items: [
    { ...message, id: "normal", otpCode: null, receivedAt: 300, uid: 3 },
    { ...message, id: "code", receivedAt: 200, uid: 2 }, message,
  ] };
  callbacks.onEvent({ snapshot: batch, newestId: "normal", windowVisible: true }, mailbox);
  assert.deepEqual(arrivals.slice(1).map((item) => item.messageId), ["code", "normal"]);
  assert.equal(arrivals[1].otpCode, "123456");
  callbacks.onEvent({ snapshot: batch, newestId: "normal", windowVisible: true }, batch);
  assert.deepEqual(arrivals.slice(3).map((item) => item.messageId), ["normal"]);
});


test("WeChat forwards every message captured in one native attention batch", async () => {
  const runner = hooks();
  let event;
  const initial = { revision: 0, pending: false, lastAttentionAt: null, messages: [] };
  const module = load("wechat/useWeChatReminders.ts", {
    react: runner.react, "../../../i18n": { useTranslation: () => ({ wechat: {} }) }, "@tauri-apps/api/core": { isTauri: () => true },
    "./api": { listenWeChatReminderChanged: async (callback) => { event = callback; return () => {}; }, getWeChatReminderState: async () => initial },
    "./storage": {}, "./openError": {},
  });
  const arrivals = [];
  runner.render(() => module.useWeChatReminders(true, { restore: false, onNotice: (item) => arrivals.push(item) }));
  await new Promise(setImmediate);
  const receivedAt = Date.now();
  const snapshot = { revision: 1, pending: true, enabled: true, status: "listening", lastAttentionAt: receivedAt,
    messages: ["first", "second"].map((id) => ({ id, receivedAt, contact: id, body: id })) };
  event({ payload: { snapshot, windowVisible: true } });
  assert.equal(arrivals.length, 2);
  assert.deepEqual(arrivals.map((item) => item.messageId), ["first", "second"]);
  event({ payload: { snapshot, windowVisible: true } });
  assert.equal(arrivals.length, 2);
});



test("mail account callbacks receive the immediately previous accepted snapshot without a React render", async () => {
  const runner = hooks();
  let event;
  const initial = { email: "a@example.com", revision: 1, items: [], status: "connected" };
  const module = load("mail/useMailAccounts.ts", {
    react: runner.react, "../../../i18n": { useTranslation: () => ({ mail: {} }) }, "@tauri-apps/api/core": { isTauri: () => true },
    "@tauri-apps/plugin-opener": {},
    "./api": { listenMailChanged: async (callback) => { event = callback; return () => {}; }, getMailState: async () => [initial] },
    "./storage": { loadMailAccounts: () => [], saveMailAccounts() {} },
    "./mailAccounts": { orderMailboxes: (items) => items, rememberMailbox: () => [], totalUnread: () => 0,
      upsertMailbox: (items, item) => [...items.filter((old) => old.email !== item.email), item] },
  });
  const previous = [];
  runner.render(() => module.useMailAccounts({ restore: false, onEvent: (_, snapshot) => previous.push(snapshot) }));
  await new Promise(setImmediate);
  const second = { ...initial, revision: 2 };
  event({ payload: { snapshot: second } });
  event({ payload: { snapshot: { ...initial, revision: 3 } } });
  assert.equal(previous[0], initial);
  assert.equal(previous[1], second);
});
