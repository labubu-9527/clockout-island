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
let interaction: Record<string, unknown> = {};
mockIPC((command, payload) => {
  switch (command) {
    case "get_media_state": return media;
    case "get_media_diagnostics": return { players: [] };
    case "get_lyrics": return { source: "lrclib", lrc: "[00:00.00]我本险将心单单向你\n[01:00.00]奈何明月照沟渠" };
    case "get_audio_level": return { active: audioActive, peak: audioActive ? 0.2 : 0 };
    case "get_clipboard_history": return { settings: { enabled: false, captureImages: true, maxItems: 100, shortcut: "Ctrl+Shift+V", shortcutEnabled: false }, items: [] };
    case "get_file_shelf": return { items: [] };
    case "list_agent_sessions": return sessions;
    case "agent_sessions_in_front": case "agent_approval_pending": case "get_qq_mail_state": return [];
    case "get_agent_status": return { codex: { phase: "idle", updatedAt: 0 }, claudeCode: { phase: "idle", updatedAt: 0 }, updatedAt: 0, statusPath: "" };
    case "get_system_status": return { cpuPercent: 12, memoryPercent: 58, updatedAt: Date.now() };
    case "get_foreground_fullscreen": return { active: false, onIslandMonitor: false };
    case "set_island_interaction": interaction = payload as Record<string, unknown>; return "disabled";
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
const waitForMusicPet = async (playing: boolean) => {
  const until = performance.now() + 6000;
  while (Boolean(document.querySelector('.island-pet[data-state="music"]')) !== playing && performance.now() < until) await wait(100);
};
const patch = (value: object) => act(async () => {
  const previous = JSON.parse(localStorage.getItem("focusd-island-settings")!);
  localStorage.setItem("focusd-island-settings", JSON.stringify({ ...previous, ...value }));
  window.dispatchEvent(new StorageEvent("storage", { key: "focusd-island-settings" }));
});
const width = () => parseFloat(document.querySelector<HTMLElement>(".stage")!.style.getPropertyValue("--collapsed-island-width"));
try {
  await act(async () => root.render(<I18nProvider><IslandApp /></I18nProvider>));
  await wait(100);
  await wait(900);
  const musicIsland = document.querySelector<HTMLElement>('.island')!;
  const radius = parseFloat(getComputedStyle(musicIsland).borderBottomLeftRadius);
  check(musicIsland.classList.contains('island--shape-pill') && ['round', 'superellipse(1)'].includes(getComputedStyle(musicIsland).getPropertyValue('corner-shape'))
    && Math.abs(radius * 2 - musicIsland.getBoundingClientRect().height) < 1, 'music capsule uses circular ends instead of the saved squircle');
  check(interaction.islandShape === 'pill' && interaction.cornerShape === 'round'
    && Number(interaction.collapsedCornerRadius) * 2 === interaction.collapsedHeight, 'native hit region uses the same music capsule geometry');
  await act(async () => window.dispatchEvent(new StorageEvent('storage', {
    key: 'focusd-island-position-reset', newValue: JSON.stringify({ requestedAt: Date.now() }),
  })));
  await wait(100);
  const savedAfterReset = JSON.parse(localStorage.getItem('focusd-island-settings')!);
  check(savedAfterReset.islandShape === 'notch' && savedAfterReset.islandCornerShape === 'squircle'
    && savedAfterReset.collapsedHeight === 38, 'resetting position during music never saves render-only capsule overrides');
  check(document.querySelector(".collapsed-lyric")?.textContent?.includes("Test song"), "lyrics stay visible when ordinary text is off");
  check(document.querySelector(".music-wave-button"), "waveform appears during music playback");
  for (const [material, frost, reflection] of [["classic", 0, 0], ["frostedGlass", 15 / 255, 0], ["liquidGlass", 0, 24 / 255]] as const) {
    await patch({ material });
    const plane = getComputedStyle(musicIsland);
    check(Math.abs(parseFloat(plane.getPropertyValue("--music-surface-frost")) - frost) < 0.00001
      && Math.abs(parseFloat(plane.getPropertyValue("--music-surface-reflection")) - reflection) < 0.00001,
    `${material} uses its source frost and reflection instead of a shared bright sheen`);
  }
  await patch({ material: "classic" });
  check(!document.querySelector(".clock-indicator, .island-system-status, .weather-badge, .island-agent-count"), "music hides ordinary indicators");
  check(document.querySelectorAll(".island__collapsed .island-pet").length === 1 && document.querySelector(".island__agent-light .island-pet"), "pet replaces leading status dot without a duplicate slot");
  check(!document.querySelector(".island__pulse"), "leading status circle is replaced");
  check(document.querySelector('.island-pet[data-state="music"]'), "playing music selects the singing pet");
  check(document.querySelector(".island__collapsed")?.firstElementChild?.classList.contains("island__agent-light"), "pet is a fixed leading control outside sortable text");
  check(getComputedStyle(document.querySelector(".collapsed-lyric")!).textAlign === "center", "lyric line centers independently");
  await patch({ lyricsOnline: true, lyricsChinese: true });
  for (const islandFontPercent of [100, 120, 150]) {
    await patch({ islandFontPercent });
    await wait(900);
    const summary = document.querySelector('.island__summary')!.getBoundingClientRect();
    const lines = [...document.querySelectorAll('.collapsed-lyric--double > span')].map(line => line.getBoundingClientRect());
    check(lines.length === 2 && lines.every(line => line.top >= summary.top - 0.1 && line.bottom <= summary.bottom + 0.1),
      `both Chinese lyric rows fit inside the clipping wrapper at ${islandFontPercent}% font size`);
  }
  await patch({ lyricsOnline: false, islandFontPercent: 100 });
  await wait(900);
  await patch({ expandTrigger: "click", autoCollapseSeconds: 0 });
  await act(async () => document.querySelector<HTMLButtonElement>('.island__open-button')!.click());
  await wait(900);
  check(document.querySelector('.island--expanded.island--music.island--music-surface'), "expanded music keeps its reference surface");
  await act(async () => document.querySelector<HTMLButtonElement>('.dot-button--todo')!.click());
  await wait(900);
  check(document.querySelector('.island--expanded.island--todo') && !document.querySelector('.island--music-surface'),
    "playing music does not recolor the expanded todo page");
  await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  await wait(900);
  check(document.querySelector('.island--collapsed.island--music-surface'), "collapsing restores the music surface");
  const musicWidth = width();
  await patch({ petEnabled: false, collapsedSlotVisibility: { text: false, pet: false } });
  check(!document.querySelector(".island__collapsed .island-pet") && width() < musicWidth, "pet switch removes the face and closes its reserved space");
  media = { ...media, playbackStatus: "paused", updatedAt: Date.now() };
  await wait(2600);
  check(!document.querySelector(".music-wave-button"), "paused music hides the waveform even with its visibility switch enabled");
  await act(async () => {
    localStorage.setItem("focusd-island-weather-settings", JSON.stringify({ enabled: true }));
    window.dispatchEvent(new StorageEvent("storage", { key: "focusd-island-weather-settings" }));
  });
  await patch({ clockEnabled: true, clockShowSeconds: true, clockPeriod: "none", islandFontPercent: 120, cpuEnabled: false, memoryEnabled: false, petEnabled: false, collapsedSlotVisibility: { text: false, pet: false, clock: true, cpu: false, memory: false, weather: true, music: true, agents: false } });
  const clock = document.querySelector<HTMLElement>(".clock-indicator")!;
  check(clock && clock.scrollWidth <= clock.clientWidth + 1, `clock preserves complete digits beside controls (${clock?.scrollWidth}/${clock?.clientWidth})`);
  for (const clockPeriod of ["none", "ampm", "detailed"]) {
    for (const clockHour12 of [false, true]) {
      await patch({ clockPeriod, clockHour12 });
      const time = document.querySelector<HTMLElement>(".clock-indicator")!;
      const clockBar = document.querySelector<HTMLElement>(".island__collapsed")!;
      check(time.scrollWidth <= time.clientWidth + 1 && clockBar.scrollWidth <= clockBar.clientWidth + 1,
        `complete ${clockPeriod} ${clockHour12 ? 12 : 24}-hour clock fits beside weather and music`);
    }
  }
  await act(async () => {
    localStorage.setItem("focusd-island-weather-settings", JSON.stringify({ enabled: false }));
    window.dispatchEvent(new StorageEvent("storage", { key: "focusd-island-weather-settings" }));
  });
  await patch({ clockShowSeconds: false, clockPeriod: "none", clockHour12: false, islandFontPercent: 100 });
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
  await waitForMusicPet(true);
  check(document.querySelector('.island-pet[data-state="music"]'), "music without track metadata overrides ordinary Agent work");
  media = { ...DEFAULT_MEDIA_STATE, audioActive: true, audioPeak: 0.2, updatedAt: Date.now() };
  audioActive = true;
  await wait(2700);
  await waitForMusicPet(true);
  check(document.querySelector('.island-pet[data-state="music"]'), "system audio drives singing when the player exposes no media session");
  media = { ...media, playbackStatus: "paused", updatedAt: Date.now() };
  await wait(2700);
  await waitForMusicPet(false);
  check(!document.querySelector('.island-pet[data-state="music"]'), "explicit pause suppresses the audio fallback");
  check(bar.firstElementChild?.classList.contains("island__agent-light"), "reordering indicators cannot move the leading pet");
  const faceBounds = bar.querySelector(".island-pet")!.getBoundingClientRect();
  const barBounds = bar.getBoundingClientRect();
  check(Math.abs((faceBounds.top + faceBounds.bottom - barBounds.top - barBounds.bottom) / 2) < 1, "leading pet stays vertically centered");
  const crowded = collapsedPresentationLayout({ textWidth: 96, pet: true, clockWidth: 150, statusCount: 2, weather: true, shelf: true, music: true, agents: true, messages: 7 });
  const sources = ["wechat", "qq", "qqMail", "dingtalk", "feishu", "wecom", "plugin"] as const;
  type BarProps = ComponentProps<typeof IslandCollapsedBar>;
  let openedPage = "";
  const renderTimer = (showText = true, playing = false) => act(async () => root.render(<I18nProvider><div style={{ "--collapsed-island-width": `${crowded.width}px`, "--collapsed-island-height": "38px", "--island-collapsed-scale": "1", "--island-font-scale": "1.2", position: "relative", marginLeft: "300px" } as CSSProperties}>
    <IslandCollapsedBar qqMail={{} as BarProps["qqMail"]} qqNotifications={{} as BarProps["qqNotifications"]} wechatReminders={{} as BarProps["wechatReminders"]}
      preview={null} page="weather" isExpanded={false} isTucked={false} positionLocked={false}
      showTitle showCollapsedText={showText} collapsedLabel="Test" collapsedTaskTitle={"Focused long task ".repeat(20)} collapsedTodoCount={null} collapsedItem="todo"
      slotVisibility={{ text: showText }}
      todoTimer={{ todoId: "focused", endsAt: Date.now() + 900000, durationMinutes: 15, notified: false }}
      collapsedLayout={["text", "cpu", "memory", "weather", "clock", "shelf", "music", "agents", "pet"]}
      collapsedCover={null} lyricsSettings={{ lyricsFolder: "", lyricsOnline: false, lyricsChinese: false, lyricsOffsetMs: 0 }}
      agentSession={null} agentSessionCount={2} mediaState={playing ? { ...media, title: "Test song", playbackStatus: "playing" } : DEFAULT_MEDIA_STATE} showMusic shelfCount={3}
      systemStatus={{ cpuPercent: 12, memoryPercent: 58, updatedAt: Date.now() }} compactCollapsed={false}
      weatherBadge={<span>Weather 25°</span>} clockIndicator={<span>Afternoon 12:34:56</span>}
      petIndicator={<IslandPet state="idle" active={false} />} agentVisualState="idle"
      messageRail={<MessageRail items={sources.map(source => ({ source, pending: true }))} expanded={false} onOpen={() => {}} />}
      onOpenPage={page => { openedPage = page; }} onOpenMessages={() => {}} onWindowDragStart={() => {}} onTuck={() => {}} />
  </div></I18nProvider>));
  await renderTimer();
  const crowdedBar = document.querySelector<HTMLElement>(".island__collapsed")!;
  check(document.querySelectorAll(".message-rail__button").length === 7 && !document.querySelector(".island-system-status"), "crowded bar retains seven message sources and yields auxiliary readings");
  check(crowdedBar.scrollWidth <= crowdedBar.clientWidth + 1, `seven message sources and ordinary controls fit adaptive width (${crowdedBar.scrollWidth}/${crowdedBar.clientWidth})`);
  crowdedBar.parentElement!.style.setProperty("--collapsed-island-width", "240px");
  check(crowdedBar.scrollWidth <= crowdedBar.clientWidth + 1 && document.querySelectorAll(".message-rail__button").length === 7, `fixed 240px bar retains all message sources without outer overflow (${crowdedBar.scrollWidth}/${crowdedBar.clientWidth})`);
  const timerBounds = document.querySelector(".island__timer-pill")!.getBoundingClientRect();
  const summaryBounds = document.querySelector(".island__summary")!.getBoundingClientRect();
  check(timerBounds.left >= summaryBounds.left && timerBounds.right <= summaryBounds.right + 1, "fixed narrow bar keeps the running timer visible beside its face");
  check(!document.querySelector(".island__brand, .island-shelf-count, .island-agent-count, .island-system-status, .music-wave-button"), "running timer yields brand and ordinary indicators even without width pressure");
  await renderTimer(false);
  check(document.querySelector(".island__timer-pill") && !document.querySelector(".island__active-task-title"), "text and text-slot switches do not hide a running timer");
  await act(async () => document.querySelector<HTMLButtonElement>(".island__summary")!.click());
  check(openedPage === "todo", "clicking the running task opens todo independently of the current page");
  await renderTimer(false, true);
  await act(async () => document.querySelector<HTMLButtonElement>(".island__summary")!.click());
  check(openedPage === "music", "clicking lyrics opens music independently of the current page");
  check(document.querySelector(".collapsed-lyric") && document.querySelector(".island__timer-pill") && document.querySelectorAll(".message-rail__button").length === 7, "music keeps lyrics, running countdown and all pending message entries with text disabled");
  document.documentElement.dataset.testResult = "passed";
} catch (error) {
  messages.push(`FAIL ${error instanceof Error ? error.message : error}`);
  document.documentElement.dataset.testResult = "failed";
}
document.getElementById("results")!.textContent = messages.join("\n");
