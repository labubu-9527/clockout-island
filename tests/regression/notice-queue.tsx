import { act } from "react";
import { createRoot } from "react-dom/client";
import { mockIPC, mockWindows } from "@tauri-apps/api/mocks";
import { emit } from "@tauri-apps/api/event";
import "../../src/styles/tokens.css";
import "../../src/styles/base.css";
import { I18nProvider, LOCALE_STORAGE_KEY } from "../../src/i18n";
import { IslandApp } from "../../src/windows/island/IslandApp";
import { DEFAULT_MEDIA_STATE } from "../../src/features/media/mediaState";
import type { MailSnapshot } from "../../src/features/messages/mail/api";
import type { QQNotificationSnapshot } from "../../src/features/messages/qq-notifications/api";
import { MAIL_OTP_ENABLED } from "../../src/features/releaseFlags";

Object.assign(globalThis, { isTauri: true, IS_REACT_ACT_ENVIRONMENT: true });
const original = new Map(Object.entries(localStorage).filter(([key]) => key.startsWith("focusd-island-")));
for (const key of original.keys()) localStorage.removeItem(key);
window.addEventListener("beforeunload", () => {
  for (const key of Object.keys(localStorage).filter(key => key.startsWith("focusd-island-"))) localStorage.removeItem(key);
  for (const [key, value] of original) localStorage.setItem(key, value);
});
localStorage.setItem(LOCALE_STORAGE_KEY, "en");
localStorage.setItem("focusd-island-settings", JSON.stringify({ autoTuck: false, autoCollapseSeconds: 0,
  agentStatusEnabled: false, shelfEnabled: false, petEnabled: false, cpuEnabled: false, memoryEnabled: false,
  showTitle: false, showCollapsedText: false, messageAutoExpand: true, messageExpandSeconds: 3,
  messagePreviewSeconds: 2, autoCopyOtp: false, lyricsOnline: false, lyricsChinese: false,
  collapsedAutoWidth: true, collapsedSlotVisibility: { text: false, clock: true, music: true } }));
localStorage.setItem("focusd-island-qq-notifications-enabled", "true");
localStorage.setItem("focusd-island-qq-notification-access-requested", "true");
let qq: QQNotificationSnapshot = { revision: 1, enabled: true, status: "listening", items: [], error: null };
let mail: MailSnapshot = { revision: 1, email: "queue@example.test", enabled: true, configured: true, syncing: false,
  status: "connected", unreadCount: 0, items: [], lastSyncedAt: null, error: null };
let capsLock = false;
let visible = true;
const commands: { command: string; payload: Record<string, unknown> }[] = [];
mockIPC((command, payload) => {
  const args = (payload ?? {}) as Record<string, unknown>;
  commands.push({ command, payload: args });
  switch (command) {
    case "get_device_status": return { capsLock, numLock: false, microphoneMuted: false, touchpadEnabled: null };
    case "get_media_state": return DEFAULT_MEDIA_STATE;
    case "get_audio_level": return { active: false, peak: 0 };
    case "get_clipboard_history": return { settings: { enabled: false, captureImages: true, maxItems: 100, shortcut: "Ctrl+Shift+V", shortcutEnabled: false }, items: [] };
    case "get_file_shelf": return { items: [] };
    case "list_agent_sessions": case "agent_sessions_in_front": case "agent_approval_pending": return [];
    case "get_qq_mail_state": return [mail];
    case "get_agent_status": return { codex: { phase: "idle", updatedAt: 0 }, claudeCode: { phase: "idle", updatedAt: 0 }, updatedAt: 0, statusPath: "" };
    case "get_system_status": return { cpuPercent: 12, memoryPercent: 58, updatedAt: Date.now() };
    case "get_foreground_fullscreen": return { active: false, onIslandMonitor: false };
    case "set_island_interaction": return "disabled";
    case "get_island_top_attachment": return true;
    case "plugin:window|is_visible": return visible;
    case "set_qq_notifications_enabled": case "get_qq_notification_state": return qq;
    case "dismiss_qq_contact": qq = { ...qq, revision: qq.revision + 1, items: qq.items.filter(item => item.title !== args.title) }; return qq;
    case "set_wechat_reminders_enabled": return { revision: 1, enabled: false, status: "disabled", pending: false, lastAttentionAt: null, error: null, previewEnabled: false, previewStatus: "off", hideMinimizedTaskbar: false, messages: [] };
    case "read_qq_mail": return { id: args.messageId, content: `Body for ${args.messageId}`, contentType: "text/plain", attachments: [] };
    case "set_translation_shortcut": return (payload as { shortcut: string }).shortcut;
    case "updater_configured": case "has_translation_secret": return false;
    default: return null;
  }
}, { shouldMockEvents: true });
mockWindows("main");
const root = createRoot(document.getElementById("root")!);
const checks: string[] = [];
const check = (ok: unknown, message: string) => { if (!ok) throw new Error(message); checks.push(`PASS ${message}`); };
const wait = (ms: number) => act(async () => { await new Promise(resolve => setTimeout(resolve, ms)); });
const text = () => document.querySelector(".island__collapsed")?.textContent ?? "";
const hover = (value: boolean) => act(async () => { await emit("island-hover-changed", value); });
async function receiveQQ(id: string) {
  const item = { id, title: `Sender ${id}`, body: `Message ${id}`, createdAt: Date.now() };
  qq = { ...qq, revision: qq.revision + 1, items: [...qq.items, item] };
  await emit("qq-notifications-changed", { snapshot: qq, newestId: id, windowVisible: visible });
}
async function receiveMail(id: string, code?: string) {
  const now = Date.now();
  const item = { id, uid: mail.items.length + 1, sender: id, subject: `Subject ${id}`, receivedAt: now, unread: true, otpCode: code };
  mail = { ...mail, revision: mail.revision + 1, items: [...mail.items, item], unreadCount: mail.items.length + 1, lastSyncedAt: now };
  await emit("qq-mail-changed", { snapshot: mail, newestId: id, windowVisible: visible });
}
try {
  await act(async () => root.render(<I18nProvider><IslandApp /></I18nProvider>));
  await wait(300);
  await act(async () => { await receiveQQ("first"); }); await wait(50);
  check(text().includes("Message first"), "actual island displays first new event");
  await hover(true);
  await act(async () => { await receiveQQ("second"); await receiveQQ("third"); await receiveMail("code", "123456"); });
  await wait(3200);
  check(text().includes("Message first") && !text().includes("Subject code"), "held reader survives source preview expiry and defers priority code");
  check(!commands.some(item => item.command === "read_qq_mail"), "waiting mail does not fetch body before becoming visible");
  await hover(false); await wait(150);
  check(text().includes("Subject code") && text().includes("Body for code"), "code priority and managed body target reach actual reader");
  check(!commands.some(item => item.command === "copy_mail_otp"), "disabled automatic copying remains disabled");
  if (MAIL_OTP_ENABLED) {
    const copy = document.querySelector<HTMLButtonElement>(".island__collapsed .mail-otp-code");
    check(copy, "code has copy action in visible reader");
    await act(async () => copy!.click()); await wait(50);
    check(commands.some(item => item.command === "copy_mail_otp" && item.payload.code === "123456"), "copy uses the displayed code");
    check(!commands.some(item => item.command === "open_qq" || item.command === "open_wechat" || item.command === "mark_qq_mail_read"), "copy does not open a client or mark mail read");
  }
  await wait(3000);
  check(text().includes("Message first"), "interrupted message resumes after code display");
  await wait(3100);
  check(text().includes("Message second"), "same-source events accepted in one batch retain FIFO order");
  await wait(3100);
  check(text().includes("Message third"), "third event retains its full display duration after waiting");
  await act(async () => { qq = { ...qq, revision: qq.revision + 1, enabled: false, items: [] };
    await emit("qq-notifications-changed", { snapshot: qq, newestId: null, windowVisible: true }); });
  await wait(150);
  check(!text().includes("Message third") && document.querySelector(".clock-indicator"), "disabling a source removes active notice and restores current ordinary content");
  capsLock = true; await wait(300);
  check(document.querySelector('.device-notice[data-device-kind="capsLock"]'), "device transitions enter the same presentation flow");
  qq = { ...qq, enabled: true };
  await act(async () => { await receiveQQ("replacement"); }); await wait(100);
  check(text().includes("Message replacement") && !document.querySelector(".device-notice"), "message replaces lower-priority device status");
  await wait(3100);
  check(!document.querySelector(".device-notice") && !text().includes("Message replacement"), "device hint does not replay after higher priority content");
  await act(async () => { await receiveMail("mail-a"); await receiveMail("mail-b"); }); await wait(100);
  check(text().includes("Body for mail-a") && !text().includes("Body for mail-b"), "visible queued mail body is independent from newest mailbox preview");
  await act(async () => { await emit("qq-mail-changed", { snapshot: { ...mail, revision: mail.revision + 1 }, newestId: "mail-a", windowVisible: true }); });
  await wait(3100);
  check(text().includes("Body for mail-b"), "duplicate snapshot does not reset the first mail duration");
  await act(async () => document.querySelector<HTMLButtonElement>('.message-notice button[aria-label^="Open"]')!.click());
  await wait(100);
  check(commands.filter(item => item.command === "read_qq_mail").slice(-1)[0]?.payload.messageId === "mail-b", "opening queued mail targets its stable ID");
  check(!commands.some(item => item.command === "open_wechat"), "mail opening never falls through to WeChat");
  await act(async () => document.querySelector<HTMLButtonElement>(".island__collapse-target")!.click());
  await wait(150);
  check(!document.querySelector(".message-notice"), "opening a panel clears pending ordinary notifications");
  visible = false;
  await act(async () => { await receiveQQ("hidden"); }); await wait(100);
  visible = true; await wait(150);
  check(!text().includes("Message hidden"), "events arriving while tray-hidden are not replayed");
  document.documentElement.dataset.testResult = "passed";
} catch (error) {
  checks.push(`FAIL ${error instanceof Error ? error.message : String(error)}`);
  document.documentElement.dataset.testResult = "failed";
}
document.getElementById("results")!.textContent = checks.join("\n");
