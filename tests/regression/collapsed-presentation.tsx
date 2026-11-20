import { act, type ComponentProps, type CSSProperties } from "react";
import { createRoot } from "react-dom/client";
import { mockIPC, mockWindows } from "@tauri-apps/api/mocks";
import "../../src/styles/tokens.css";
import "../../src/styles/base.css";
import { I18nProvider } from "../../src/i18n";
import { IslandApp } from "../../src/windows/island/IslandApp";
import { DEFAULT_MEDIA_STATE } from "../../src/features/media/mediaState";
import type { MediaState } from "../../src/features/media/api";
import type { AgentSessionSummary } from "../../src/features/agent-status/api";
import { IslandCollapsedBar } from "../../src/windows/island/IslandCollapsedBar";
import { MessageRail } from "../../src/features/messages/MessageRail";
import { IslandPet } from "../../src/features/island-pet";
import { collapsedPresentationLayout } from "../../src/windows/island/collapsedPresentation";

Object.assign(globalThis, { isTauri: true, IS_REACT_ACT_ENVIRONMENT: true });
const original = new Map(Object.entries(localStorage).filter(([key]) => key.startsWith("focusd-island-")));
window.addEventListener("beforeunload", () => {
  for (const key of Object.keys(localStorage).filter(key => key.startsWith("focusd-island-"))) localStorage.removeItem(key);
  for (const [key, value] of original) localStorage.setItem(key, value);
});
for (const key of Object.keys(localStorage).filter(key => key.startsWith("focusd-island-"))) localStorage.removeItem(key);
let media: MediaState = { ...DEFAULT_MEDIA_STATE, available: true, title: "Test song", artist: "Test artist", playbackStatus: "playing", updatedAt: Date.now() };
let sessions: AgentSessionSummary[] = [];
let audioActive = false;
mockIPC((command, payload) => {
  switch (command) {
    case "get_media_state": return media;
    case "get_audio_level": return { active: audioActive, peak: audioActive ? 0.2 : 0 };
    case "get_clipboard_history": return { settings: { enabled: false, captureImages: true, maxItems: 100, shortcut: "Ctrl+Shift+V", shortcutEnabled: false }, items: [] };
    case "get_file_shelf": return { items: [] };
    case "list_agent_sessions": return sessions;
    case "agent_sessions_in_front": case "agent_approval_pending": case "get_qq_mail_state": return [];
    case "get_agent_status": return { codex: { phase: "idle", updatedAt: 0 }, claudeCode: { phase: "idle", updatedAt: 0 }, updatedAt: 0, statusPath: "" };
    case "get_system_status": return { cpuPercent: 12, memoryPercent: 58, updatedAt: Date.now() };
    case "get_foreground_fullscreen": return { active: false, onIslandMonitor: false };
    case "set_island_interaction": return "disabled";
    case "get_island_top_attachment": case "plugin:window|is_visible": return true;
    case "set_qq_notifications_enabled": case "get_qq_notification_state": return { revision: 1, enabled: false, status: "disabled", items: [], error: null };
    case "set_wechat_reminders_enabled": return { revision: 1, enabled: false, status: "disabled", pending: false, lastAttentionAt: null, error: null, previewEnabled: false, previewStatus: "off", hideMinimizedTaskbar: false, messages: [] };
    case "set_translation_shortcut": return (payload as { shortcut: string }).shortcut;
    case "updater_configured": case "has_translation_secret": return false;
    default: return null;
  }
}, { shouldMockEvents: true });
mockWindows("main");
const initial = { autoTuck: false, autoCollapseSeconds: 0, lyricsOnline: false, lyricsChinese: false, collapsedShowCover: false, collapsedAutoWidth: true, showCollapsedText: false, agentStatusEnabled: false, shelfEnabled: false, mailEnabled: false };
localStorage.setItem("focusd-island-settings", JSON.stringify(initial));
const today = new Date();
localStorage.setItem("focusd-island-current-date", `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`);
localStorage.setItem("focusd-island-todos", JSON.stringify([{ id: "test-todo", title: "Pending test task", completed: false, createdAt: Date.now() }]));
const root = createRoot(document.getElementById("root")!);
const messages: string[] = [];
const check = (ok: unknown, message: string) => { if (!ok) throw new Error(message); messages.push(`PASS ${message}`); };
const wait = (ms: number) => act(async () => { await new Promise(resolve => setTimeout(resolve, ms)); });
const patch = (value: object) => act(async () => {
  const previous = JSON.parse(localStorage.getItem("focusd-island-settings")!);
  localStorage.setItem("focusd-island-settings", JSON.stringify({ ...previous, ...value }));
  window.dispatchEvent(new StorageEvent("storage", { key: "focusd-island-settings" }));
});
const width = () => parseFloat(document.querySelector<HTMLElement>(".stage")!.style.getPropertyValue("--collapsed-island-width"));
try {
  await act(async () => root.render(<I18nProvider><IslandApp /></I18nProvider>));
  await wait(100);
  check(document.querySelector(".collapsed-lyric")?.textContent?.includes("Test song"), "lyrics stay visible when ordinary text is off");
  check(!document.querySelector(".clock-indicator, .island-system-status, .weather-badge, .island-agent-count"), "music hides ordinary indicators");
  check(document.querySelectorAll(".island__collapsed .island-pet").length === 1 && document.querySelector(".island__agent-light .island-pet"), "pet replaces leading status dot without a duplicate slot");
  check(!document.querySelector(".island__pulse"), "leading status circle is replaced");
  check(document.querySelector('.island-pet[data-state="music"]'), "playing music selects the singing pet");
  check(document.querySelector(".island__collapsed")?.firstElementChild?.classList.contains("island__agent-light"), "pet is a fixed leading control outside sortable text");
  check(getComputedStyle(document.querySelector(".collapsed-lyric")!).textAlign === "center", "lyric line centers independently");
  const musicWidth = width();
  await patch({ petEnabled: false, collapsedSlotVisibility: { text: false, pet: false } });
  check(!document.querySelector(".island__collapsed .island-pet") && width() < musicWidth, "pet switch removes the face and closes its reserved space");
  media = { ...media, playbackStatus: "paused", updatedAt: Date.now() };
  await wait(2600);
  await patch({ clockEnabled: false, cpuEnabled: false, memoryEnabled: false, collapsedSlotVisibility: { text: false, pet: false, clock: false, cpu: false, memory: false, music: false, agents: false } });
  check(!document.querySelector(".collapsed-lyric"), "pausing music restores ordinary presentation");
  check(width() === 96, `empty auto width shrinks to 96px (${width()})`);
  await patch({ showTitle: true, showCollapsedText: true, collapsedSlotVisibility: { text: true, pet: false, clock: false, cpu: false, memory: false, music: false, agents: false } });
  check(width() > 96, "restoring ordinary text expands its real content width");
  const bar = document.querySelector<HTMLElement>(".island__collapsed")!;
  check(bar.scrollWidth <= bar.clientWidth + 1, "ordinary compact bar stays within its measured width");
  sessions = [{ provider: "codex", sessionId: "long-agent", cwd: "E:/test", title: "A very long agent response ".repeat(30), model: null, effort: null, host: null, turnStartedAt: null, phase: "waiting", lastMessage: null, updatedAt: Date.now() }];
  await patch({ agentStatusEnabled: true, petEnabled: true, showTitle: true, collapsedSlotVisibility: { text: true, pet: true }, collapsedLayout: ["cpu", "clock", "text", "pet", "memory", "weather", "shelf", "music", "agents"] });
  await wait(2700);
  check(document.querySelector(".island__agent-session-title")?.textContent === "等待确认" && !bar.textContent?.includes("A very long agent response"), "long Agent response is replaced by its short waiting status");
  check(width() < 300 && !bar.querySelector(".island__brand"), `Agent adaptive width follows short status (${width()})`);
  media = { ...media, playbackStatus: "playing", title: null, updatedAt: Date.now() };
  await wait(2700);
  check(document.querySelector('.island-pet[data-state="music"]'), "music without track metadata overrides ordinary Agent work");
  media = { ...DEFAULT_MEDIA_STATE, audioActive: true, audioPeak: 0.2, updatedAt: Date.now() };
  audioActive = true;
  await wait(2700);
  check(document.querySelector('.island-pet[data-state="music"]'), "system audio drives singing when the player exposes no media session");
  media = { ...media, playbackStatus: "paused", updatedAt: Date.now() };
  await wait(2700);
  check(!document.querySelector('.island-pet[data-state="music"]'), "explicit pause suppresses the audio fallback");
  check(bar.firstElementChild?.classList.contains("island__agent-light"), "reordering indicators cannot move the leading pet");
  const faceBounds = bar.querySelector(".island-pet")!.getBoundingClientRect();
  const barBounds = bar.getBoundingClientRect();
  check(Math.abs((faceBounds.top + faceBounds.bottom - barBounds.top - barBounds.bottom) / 2) < 1, "leading pet stays vertically centered");
  const crowded = collapsedPresentationLayout({ textWidth: 96, pet: true, clockWidth: 150, statusCount: 2, weather: true, shelf: true, music: true, agents: true, messages: 7 });
  const sources = ["wechat", "qq", "qqMail", "dingtalk", "feishu", "wecom", "plugin"] as const;
  type BarProps = ComponentProps<typeof IslandCollapsedBar>;
  await act(async () => root.render(<I18nProvider><div style={{ "--collapsed-island-width": `${crowded.width}px`, "--collapsed-island-height": "38px", "--island-collapsed-scale": "1", position: "relative", marginLeft: "300px" } as CSSProperties}>
    <IslandCollapsedBar qqMail={{} as BarProps["qqMail"]} qqNotifications={{} as BarProps["qqNotifications"]} wechatReminders={{} as BarProps["wechatReminders"]}
      preview={null} page="todo" isExpanded={false} isTucked={false} positionLocked={false}
      showTitle={false} showCollapsedText collapsedLabel="Test" collapsedTaskTitle="Focused task" collapsedTodoCount={null} collapsedItem="todo"
      todoTimer={{ todoId: "focused", endsAt: Date.now() + 900000, durationMinutes: 15, notified: false }}
      collapsedLayout={["text", "cpu", "memory", "weather", "clock", "shelf", "music", "agents", "pet"]}
      collapsedCover={null} lyricsSettings={{ lyricsFolder: "", lyricsOnline: false, lyricsChinese: false, lyricsOffsetMs: 0 }}
      agentSession={null} agentSessionCount={2} mediaState={DEFAULT_MEDIA_STATE} showMusic shelfCount={3}
      systemStatus={{ cpuPercent: 12, memoryPercent: 58, updatedAt: Date.now() }} compactCollapsed={crowded.compact}
      weatherBadge={<span>Weather 25°</span>} clockIndicator={<span>Afternoon 12:34:56</span>}
      petIndicator={<IslandPet state="idle" active={false} />} agentVisualState="idle"
      messageRail={<MessageRail items={sources.map(source => ({ source, pending: true }))} expanded={false} onOpen={() => {}} />}
      onOpenPage={() => {}} onOpenMessages={() => {}} onWindowDragStart={() => {}} onTuck={() => {}} />
  </div></I18nProvider>));
  const crowdedBar = document.querySelector<HTMLElement>(".island__collapsed")!;
  check(document.querySelectorAll(".message-rail__button").length === 7 && !document.querySelector(".island-system-status"), "crowded bar retains seven message sources and yields auxiliary readings");
  check(crowdedBar.scrollWidth <= crowdedBar.clientWidth + 1, `seven message sources and ordinary controls fit adaptive width (${crowdedBar.scrollWidth}/${crowdedBar.clientWidth})`);
  crowdedBar.parentElement!.style.setProperty("--collapsed-island-width", "240px");
  check(crowdedBar.scrollWidth <= crowdedBar.clientWidth + 1 && document.querySelectorAll(".message-rail__button").length === 7, `fixed 240px bar retains all message sources without outer overflow (${crowdedBar.scrollWidth}/${crowdedBar.clientWidth})`);
  const timerBounds = document.querySelector(".island__timer-pill")!.getBoundingClientRect();
  const summaryBounds = document.querySelector(".island__summary")!.getBoundingClientRect();
  check(timerBounds.left >= summaryBounds.left && timerBounds.right <= summaryBounds.right + 1, "fixed narrow bar keeps the running timer visible beside its face");
  document.documentElement.dataset.testResult = "passed";
} catch (error) {
  messages.push(`FAIL ${error instanceof Error ? error.message : error}`);
  document.documentElement.dataset.testResult = "failed";
}
document.getElementById("results")!.textContent = messages.join("\n");
