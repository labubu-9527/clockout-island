import "../../src/styles/tokens.css";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { mockIPC } from "@tauri-apps/api/mocks";
import { I18nProvider } from "../../src/i18n";
import { DEFAULT_MEDIA_STATE } from "../../src/features/media/mediaState";
import { MusicPlayerPanel } from "../../src/features/media/MusicPlayerPanel";
import type { MediaState } from "../../src/features/media/api";

Object.assign(globalThis, { isTauri: true, IS_REACT_ACT_ENVIRONMENT: true });
const screenshot = new URLSearchParams(location.search).get("view") === "replica";
let releaseMode: (() => void) | undefined;
let holdMode = false;
const commands: { command: string; payload: Record<string, unknown> }[] = [];
mockIPC((command, payload) => {
  const args = payload as Record<string, unknown> | undefined;
  commands.push({ command, payload: args ?? {} });
  if (command === "media_toggle_shuffle") {
    const response = { ...track, shuffleActive: true, updatedAt: Date.now() };
    return holdMode ? new Promise(resolve => { releaseMode = () => resolve(response); }) : response;
  }
  if (command === "media_cycle_repeat") return { ...track, repeatMode: "track", updatedAt: Date.now() };
  if (command === "media_set_volume") return { ...track, volume: Number(args?.level), updatedAt: Date.now() };
  return command === "get_media_diagnostics" ? { players: [] }
  : command === "plugin:event|listen" ? 1 : command === "get_lyrics"
    ? { source: "lrclib", lrc: screenshot ? "[03:10.00]陪你把独自孤单 变成了勇敢\n[03:20.00]一次次失去 又重来 我没离开"
      : "[00:01.00]Previous line\n[00:05.00]The current lyric\n[00:10.00]Next line", translation: screenshot ? null : "[00:05.00]当前歌词译文" } : null;
});
const fixture = document.getElementById("fixture")!;
const results = document.getElementById("results")!;
const root = createRoot(fixture);
const cover = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#b45367"/><circle cx="80" cy="20" r="65" fill="#497ec3"/></svg>')}`;
const track: MediaState = { ...DEFAULT_MEDIA_STATE, available: true, title: "A song with a very long title that must never push controls outside the music page",
  artist: "A long artist name", thumbnail: cover, playbackStatus: "playing", positionMs: 6000, durationMs: 180000, updatedAt: Date.now(), canSeek: true, volume: 0.6 };
const messages: string[] = [];
const box = (selector: string) => fixture.querySelector<HTMLElement>(selector)!.getBoundingClientRect();
function check(value: unknown, label: string) { if (!value) throw new Error(label); messages.push(`PASS ${label}`); }
async function render(state = track, lyrics = false, error = false) {
  await act(async () => {
    root.render(<I18nProvider><MusicPlayerPanel mediaState={state} isTrackChanging={false} commandError={error ? "failed" : null}
      onOpenSettings={() => {}} onPlayPause={() => {}} onNext={() => {}} onPrevious={() => {}} onSeek={() => {}}
      lyricsSettings={{ lyricsFolder: "", lyricsOnline: lyrics, lyricsOffsetMs: 0 }} /></I18nProvider>);
    await new Promise((resolve) => setTimeout(resolve, 100));
  });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 450)); });
}
if (screenshot) {
  results.hidden = true;
  fixture.style.width = "360px";
  fixture.style.height = "184px";
  fixture.style.background = "#193744";
  fixture.style.setProperty("--is-light", "0");
  const blueCover = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#52b6df"/><path d="M0 55 Q30 45 60 57 T100 52 V100 H0" fill="#1b779e"/><path d="M0 78 Q40 65 100 84 V100 H0" fill="#e1bd7e"/></svg>')}`;
  await render({ ...track, title: "陪你度过漫长岁月", artist: "陈奕迅", thumbnail: blueCover,
    positionMs: 192000, durationMs: 242000, updatedAt: Date.now(), canShuffle: true, canRepeat: true }, true);
  fixture.dataset.ready = "true";
} else try {
  await render({ ...track, volume: -1 });
  check(fixture.querySelector<HTMLButtonElement>('[data-music-action="volume"]')?.disabled
    && !fixture.querySelector('.music-player__volume'), "unknown output volume disables its control instead of showing a negative percentage");
  await render();
  check(box('.music-player__artwork').width === 68, "artwork keeps the reference 68px size even without lyrics");
  fixture.style.setProperty('--island-radius', '40px');
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 300)); });
  check(parseFloat(getComputedStyle(fixture.querySelector('.music-player__artwork')!).borderTopLeftRadius) === 20,
    "artwork radius is half the enclosing card radius as in source geometry");
  fixture.style.removeProperty('--island-radius');
  check(fixture.querySelector('[data-music-action="mode"]'), "playback mode is exposed in the music toolbar");
  check(fixture.querySelector<HTMLButtonElement>('[data-music-action="favorite"]')?.disabled, "unsupported favorite stays visibly disabled instead of simulating success");
  await render({ ...track, canShuffle: true, activeSessionId: "test-session" });
  await act(async () => fixture.querySelector<HTMLButtonElement>('[data-music-action="mode"]')!.click());
  check(commands.some(item => item.command === "media_toggle_shuffle" && item.payload.target === "test-session"), "playback mode sends a real command to the selected player");
  await act(async () => fixture.querySelector<HTMLButtonElement>('[data-music-action="volume"]')!.click());
  const volume = fixture.querySelector<HTMLInputElement>('.music-player__volume input')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(volume, "0.4");
    volume.dispatchEvent(new Event("input", { bubbles: true }));
    volume.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await act(async () => volume.dispatchEvent(new KeyboardEvent("keyup", { key: "ArrowRight", bubbles: true })));
  check(commands.some(item => item.command === "media_set_volume" && item.payload.level === 0.4), "volume commits a real system output level");
  await act(async () => fixture.querySelector<HTMLButtonElement>('[data-music-action="volume"]')!.click());
  await render({ ...track, canRepeat: true, activeSessionId: "repeat-session", updatedAt: Date.now() + 1 });
  await act(async () => fixture.querySelector<HTMLButtonElement>('[data-music-action="mode"]')!.click());
  check(commands.some(item => item.command === "media_cycle_repeat" && item.payload.target === "repeat-session"), "repeat-only players use the real repeat command");
  await render(track, true);
  check(fixture.querySelector('.lyrics-view__line--translation'), "available lyric translation is initially visible");
  await act(async () => fixture.querySelector<HTMLButtonElement>('[data-music-action="translation"]')!.click());
  check(!fixture.querySelector('.lyrics-view__line--translation') && fixture.querySelector('.lyrics-view__line--current')?.textContent?.includes("The current lyric"), "translation toggle changes translated text without hiding the active lyric");
  await act(async () => fixture.querySelector<HTMLButtonElement>('[data-music-action="translation"]')!.click());
  await render({ ...track, canShuffle: true, activeSessionId: "pending-mode", updatedAt: Date.now() });
  holdMode = true;
  await act(async () => fixture.querySelector<HTMLButtonElement>('[data-music-action="mode"]')!.click());
  await act(async () => fixture.querySelector<HTMLButtonElement>('[data-music-action="volume"]')!.click());
  const independentVolume = fixture.querySelector<HTMLInputElement>('.music-player__volume input')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(independentVolume, "0.25");
    independentVolume.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () => independentVolume.dispatchEvent(new KeyboardEvent("keyup", { key: "ArrowRight", bubbles: true })));
  check(commands.some(item => item.command === "media_set_volume" && item.payload.level === 0.25), "pending mode command does not discard an independent volume commit");
  holdMode = false;
  await act(async () => releaseMode?.());
  await act(async () => fixture.querySelector<HTMLButtonElement>('[data-music-action="volume"]')!.click());
  const backdrop = fixture.querySelector<HTMLElement>(".music-player__atmosphere");
  check(backdrop && backdrop.getAttribute("aria-hidden") === "true", "artwork atmosphere exists only as decoration");
  check(getComputedStyle(backdrop!).pointerEvents === "none", "atmosphere cannot intercept player controls");
  for (const light of [0, 1]) for (const font of [0.9, 1.2]) for (const scale of [0.85, 1.2]) for (const lyrics of [false, true]) {
    document.documentElement.dataset.theme = light ? "light" : "dark";
    fixture.style.setProperty("--is-light", String(light));
    fixture.style.setProperty("--island-font-scale", String(font));
    fixture.style.height = `${188 + Math.max(0, font - 1) * 100 + 24}px`;
    fixture.style.background = light ? "#fafafa" : "#111";
    fixture.style.transform = `scale(${scale})`;
    await render(track, lyrics, true);
    const page = box(".music-player");
    check(fixture.scrollWidth <= fixture.clientWidth && box(".music-player__meta").right <= box(".music-player__aside").left + 1,
      "long title does not displace settings or create horizontal overflow");
    check(box(".music-player__controls").bottom <= page.bottom + 1 && box(".music-player__head").right <= page.right + 1,
      `theme ${light}, font ${font}, scale ${scale}, lyrics ${lyrics}: content fits`);
    const button = fixture.querySelector<HTMLElement>(".music-control-button--primary")!;
    const b = button.getBoundingClientRect();
    check(button.contains(document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)), "primary control remains hit-testable");
    check(fixture.querySelector('[role="alert"]'), "control failure remains visible");
    if (lyrics) check(box(".lyrics-view").bottom <= box(".music-progress").top + 1, "lyrics do not overlap progress");
  }
  await render({ ...track, playbackStatus: "paused" });
  check(!fixture.querySelector(".music-player--playing"), "pause keeps its real playback state");
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    check(getComputedStyle(fixture.querySelector(".music-player__atmosphere")!).transitionDuration === "0s", "reduced motion stops atmosphere transitions");
  }
  await render({ ...track, thumbnail: null, durationMs: 0, hasTimeline: false });
  check(!fixture.querySelector(".music-player__atmosphere") && !fixture.querySelector(".music-progress"), "no cover or timeline has no atmosphere or fabricated progress");
  await render(DEFAULT_MEDIA_STATE);
  check(!fixture.querySelector(".music-player__atmosphere") && fixture.querySelector(".music-idle"), "idle removes artwork atmosphere");
  const params = new URLSearchParams(location.search);
  document.documentElement.dataset.theme = params.get("theme") === "light" ? "light" : "dark";
  fixture.style.setProperty("--is-light", params.get("theme") === "light" ? "1" : "0");
  fixture.style.background = params.get("theme") === "light" ? "#fafafa" : "#111";
  fixture.style.transform = "none";
  await render(track, true);
  results.textContent = messages.join("\n"); results.dataset.result = "passed";
} catch (error) { results.textContent = `${messages.join("\n")}\nFAIL ${String(error)}`; results.dataset.result = "failed"; }
