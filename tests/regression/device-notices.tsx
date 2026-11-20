import { act } from "react";
import { createRoot } from "react-dom/client";
import { mockIPC, mockWindows } from "@tauri-apps/api/mocks";
import "../../src/styles/tokens.css";
import "../../src/styles/base.css";
import { I18nProvider, LOCALE_STORAGE_KEY } from "../../src/i18n";
import { useDeviceNotice } from "../../src/features/device-notices/useDeviceNotice";
import { DeviceNoticeCard } from "../../src/features/device-notices/DeviceNoticeCard";
import { DeviceNoticeSettings } from "../../src/features/device-notices/DeviceNoticeSettings";
import { DEVICE_NOTICE_SETTINGS_KEY } from "../../src/features/device-notices/storage";
import type { DeviceState, DeviceKind } from "../../src/features/device-notices/model";
import { IslandApp } from "../../src/windows/island/IslandApp";
import { DEFAULT_MEDIA_STATE } from "../../src/features/media/mediaState";

Object.assign(globalThis, { isTauri: true, IS_REACT_ACT_ENVIRONMENT: true });
const original = new Map(Object.entries(localStorage).filter(([key]) => key.startsWith("focusd-island-")));
for (const key of original.keys()) localStorage.removeItem(key);
localStorage.setItem(LOCALE_STORAGE_KEY, "en");
let state: DeviceState = { capsLock: false, numLock: false, microphoneMuted: false, touchpadEnabled: null };
let samples = 0;
let failing = false;
let fullscreen = false;
let deferSample = false;
let pendingSample: ((value: DeviceState) => void) | null = null;
const layouts: Record<string, unknown>[] = [];
const monitoring: boolean[] = [];
mockIPC((command, payload) => {
  switch (command) {
    case "get_device_status": {
      samples++;
      if (failing) throw new Error("device unavailable");
      if (deferSample) return new Promise<DeviceState>(resolve => { pendingSample = resolve; });
      return { ...state };
    }
    case "set_device_notices_enabled": monitoring.push((payload as { enabled: boolean }).enabled); return null;
    case "plugin:window|is_visible": return true;
    case "get_clipboard_history": return { settings: { enabled: false, captureImages: true, maxItems: 100, shortcut: "Ctrl+Shift+V", shortcutEnabled: false }, items: [] };
    case "get_file_shelf": return { items: [] };
    case "list_agent_sessions": case "agent_sessions_in_front": case "agent_approval_pending": case "get_qq_mail_state": return [];
    case "get_agent_status": return { codex: { phase: "idle", updatedAt: 0 }, claudeCode: { phase: "idle", updatedAt: 0 }, updatedAt: 0, statusPath: "" };
    case "get_media_state": return DEFAULT_MEDIA_STATE;
    case "get_system_status": return { cpuPercent: 12, memoryPercent: 58, updatedAt: Date.now() };
    case "get_foreground_fullscreen": return { active: fullscreen, onIslandMonitor: fullscreen };
    case "set_island_interaction": layouts.push(payload as Record<string, unknown>); return "disabled";
    case "get_island_top_attachment": return true;
    case "set_qq_notifications_enabled": case "get_qq_notification_state": return { revision: 1, enabled: false, status: "disabled", items: [], error: null };
    case "set_wechat_reminders_enabled": return { revision: 1, enabled: false, status: "disabled", pending: false, lastAttentionAt: null, error: null, previewEnabled: false, previewStatus: "off", hideMinimizedTaskbar: false, messages: [] };
    case "set_translation_shortcut": return (payload as { shortcut: string }).shortcut;
    case "updater_configured": case "has_translation_secret": return false;
    default: return null;
  }
}, { shouldMockEvents: true });
mockWindows("main");
function Harness({ blocked = false }: { blocked?: boolean }) {
  const notice = useDeviceNotice(blocked);
  return <><section id="settings"><DeviceNoticeSettings /></section><div style={{ width: 280, height: 44 }}>{notice ? <DeviceNoticeCard notice={notice} /> : <span id="ordinary">Ordinary island content</span>}</div></>;
}
const root = createRoot(document.getElementById("root")!);
const checks: string[] = [];
const check = (ok: unknown, text: string) => { if (!ok) throw new Error(text); checks.push(`PASS ${text}`); };
const wait = (ms: number) => act(async () => { await new Promise(resolve => setTimeout(resolve, ms)); });
const render = (blocked = false) => act(async () => root.render(<I18nProvider><Harness blocked={blocked} /></I18nProvider>));
const card = () => document.querySelector<HTMLElement>(".device-notice");
const change = async (kind: DeviceKind, value: boolean | null) => { state = { ...state, [kind]: value }; await wait(260); };
const preferences = (patch: object) => act(async () => {
  localStorage.setItem(DEVICE_NOTICE_SETTINGS_KEY, JSON.stringify({ capsLock: true, numLock: true, microphoneMuted: true, touchpadEnabled: true, ...patch }));
  window.dispatchEvent(new StorageEvent("storage", { key: DEVICE_NOTICE_SETTINGS_KEY }));
});
const islandSettings = (patch: object) => act(async () => {
  const previous = JSON.parse(localStorage.getItem("focusd-island-settings") ?? "{}");
  localStorage.setItem("focusd-island-settings", JSON.stringify({ ...previous, ...patch }));
  window.dispatchEvent(new StorageEvent("storage", { key: "focusd-island-settings" }));
});
try {
  await render(); await wait(260);
  check(!card() && samples > 0, "first snapshot establishes baseline without startup reminder");
  check(monitoring[monitoring.length - 1] === true, "initial enabled keyboard sources activate native monitoring");
  const toggles = () => [...document.querySelectorAll<HTMLInputElement>("#settings input[type=checkbox]")];
  check(toggles().length === 4 && toggles().every(input => input.checked), "four independent settings default enabled");
  await change("capsLock", true);
  check(card()?.textContent?.includes("Caps Lock") && card()?.textContent?.includes("On"), "real hook renders enabled Caps Lock change");
  await change("capsLock", false);
  check(card()?.textContent?.includes("Off"), "reverse Caps Lock change renders disabled state");
  await wait(1200); await change("microphoneMuted", true); await wait(900);
  check(card()?.dataset.deviceKind === "microphoneMuted" && card()?.textContent?.includes("Muted"), "rapid change replaces reminder and resets two-second lifetime");
  await wait(1200);
  check(!card() && document.querySelector("#ordinary"), "two-second expiry restores ordinary island content");
  await change("microphoneMuted", false);
  check(card()?.textContent?.includes("Unmuted"), "microphone unmute uses correct inverse label");
  await render(true); await change("numLock", true); await render(false);
  check(!card(), "priority interruption discards active and blocked changes without stale replay");
  await wait(260);
  await change("touchpadEnabled", true);
  check(!card(), "unknown to known touchpad state establishes baseline without false reminder");
  await change("touchpadEnabled", false);
  check(card()?.dataset.deviceKind === "touchpadEnabled" && card()?.textContent?.includes("Off"), "supported touchpad change renders off state");
  await act(async () => toggles()[3].click());
  check(!toggles()[3].checked && toggles().slice(0, 3).every(input => input.checked) && !card(), "settings UI independently disables active source and hides its reminder");
  await change("touchpadEnabled", true);
  check(!card(), "disabled source does not notify");
  await act(async () => toggles()[3].click()); await wait(260);
  check(!card(), "reenabling source establishes fresh baseline without replay");
  failing = true; await wait(260); state = { ...state, numLock: false }; failing = false; await wait(260);
  check(!card(), "failed sample and successful recovery never infer false state transitions");
  await preferences({ capsLock: false, numLock: false, microphoneMuted: false, touchpadEnabled: false });
  const held = samples; await wait(450);
  check(samples === held && !card(), "all sources disabled stop native polling");
  check(monitoring[monitoring.length - 1] === false, "all sources disabled release native keyboard monitoring");
  await preferences({}); await wait(260);
  check(!card(), "enabling monitoring again does not show startup state");
  check(monitoring[monitoring.length - 1] === true, "reenabling sources restarts native keyboard monitoring");
  await render(true); await wait(260);
  deferSample = true; await wait(260);
  check(Boolean(pendingSample), "blocked monitor can have a native request still in flight");
  const inFlightSamples = samples; await wait(450);
  check(samples === inFlightSamples, "slow native sample never overlaps another polling request");
  state = { ...state, capsLock: true };
  await render(false);
  await act(async () => {
    deferSample = false;
    const resolve = pendingSample as ((value: DeviceState) => void) | null;
    pendingSample = null;
    resolve?.({ ...state });
  });
  check(!card(), "changed response requested while blocked is discarded after unblock");
  await wait(260);
  check(!card(), "first fresh snapshot after crossing priority boundary silently rebuilds baseline");
  await change("capsLock", false);
  check(card()?.textContent?.includes("Off"), "new transition after boundary baseline still produces reminder");
  await render(true); await wait(260);
  state = { ...state, numLock: true };
  await render(false); await wait(260);
  check(!card(), "change immediately before unblock is absorbed into fresh baseline without replay");
  await change("numLock", false);
  check(card()?.dataset.deviceKind === "numLock", "subsequent fresh transition after unblock is not lost");
  // Exercise the actual window composition, including native hit-region dimensions.
  await islandSettings({ autoTuck: false, autoCollapseSeconds: 0, collapsedAutoWidth: false, collapsedWidth: 240, islandFontPercent: 120, showCollapsedText: false, material: "frostedGlass", gameDoNotDisturb: false, gameAutoTuck: false });
  await act(async () => root.render(<I18nProvider><IslandApp /></I18nProvider>)); await wait(800);
  check(!card(), "actual island first snapshot remains quiet");
  await change("capsLock", true); await wait(500);
  check(Boolean(card()), "actual narrow island shows reminder with ordinary text disabled");
  const bounds = card()!.getBoundingClientRect();
  check(card()!.scrollWidth <= card()!.clientWidth + 1 && bounds.width >= 200 && bounds.height >= 30, `large-font reminder fits temporary narrow-island dimensions (${card()!.scrollWidth}/${card()!.clientWidth}, ${bounds.width}x${bounds.height})`);
  const native = layouts[layouts.length - 1]!;
  check(typeof native.noticeWidth === "number" && typeof native.noticeHeight === "number" && Number(native.noticeWidth) >= 260 && Number(native.noticeHeight) >= 44 && native.glassEnabled === true,
    "native hit region uses temporary notice dimensions and inherits glass material");
  await wait(1800);
  check(!card() && layouts[layouts.length - 1]?.noticeWidth == null, "expiry restores actual island content and native ordinary dimensions");
  await act(async () => document.querySelector<HTMLElement>(".island")!.click()); await wait(700);
  check(document.querySelector(".island__expanded")?.getAttribute("aria-hidden") === "false", "real island opens expanded panel");
  await change("numLock", true);
  check(!card(), "expanded page suppresses device reminder");
  await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))); await wait(700);
  check(document.querySelector(".island__expanded")?.getAttribute("aria-hidden") === "true" && !card(), "collapse does not replay changes from expanded page");
  // Remount the locale provider as a separate window would do.
  await act(async () => root.render(null));
  localStorage.setItem(LOCALE_STORAGE_KEY, "zh-CN");
  await act(async () => root.render(<I18nProvider><IslandApp /></I18nProvider>)); await wait(400);
  await change("capsLock", false);
  check(card()?.textContent?.includes("大写锁定") && card()?.textContent?.includes("已关闭"), "actual island renders Chinese name and disabled status");
  await act(async () => root.render(null));
  fullscreen = true;
  await islandSettings({ gameDoNotDisturb: true });
  await act(async () => root.render(<I18nProvider><IslandApp /></I18nProvider>)); await wait(400);
  await change("capsLock", true);
  check(!card(), "actual full-screen game quiet mode suppresses device reminder");
  await islandSettings({ gameDoNotDisturb: false }); await wait(260);
  check(!card(), "leaving game quiet mode never replays blocked state");
  document.documentElement.dataset.testResult = "passed";
} catch (error) {
  document.documentElement.dataset.testResult = "failed";
  checks.push(`FAIL ${String(error)}`);
} finally {
  await act(async () => root.unmount());
  for (const key of Object.keys(localStorage).filter(key => key.startsWith("focusd-island-"))) localStorage.removeItem(key);
  for (const [key, value] of original) localStorage.setItem(key, value);
  document.getElementById("results")!.textContent = checks.join("\n");
}



