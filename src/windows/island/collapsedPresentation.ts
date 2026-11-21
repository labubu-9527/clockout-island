import type { CollapsedSlot } from "../../features/appearance/types";

/** Pet is a leading status face; the retained legacy slot no longer duplicates it. */
export function visibleCollapsedSlots(layout: readonly CollapsedSlot[], visibility: Partial<Record<CollapsedSlot, boolean>>, lyricMode: boolean, timer = false) {
  if (lyricMode) return visibility.music === false ? ["text"] as CollapsedSlot[] : ["text", "music"] as CollapsedSlot[];
  if (timer) return ["text"] as CollapsedSlot[];
  return layout.filter(slot => slot !== "pet" && (slot === "text" || visibility[slot] !== false));
}

type PresentationOptions = {
  textWidth: number; pet: boolean; clockWidth: number; statusCount: number; weather: boolean;
  shelf: boolean; music: boolean; agents: boolean; messages: number; lyricMode?: boolean; timer?: boolean; musicWidth?: number; wireless?: boolean;
};

function occupiedWidth(options: PresentationOptions) {
  const { textWidth, pet, clockWidth, statusCount, weather, shelf, music, agents, messages, lyricMode, timer } = options;
  const content = lyricMode ? (options.musicWidth ?? 260) + (pet ? 48 : 0) + (timer ? 64 : 0)
    : timer ? Math.max(96, textWidth) + (pet ? 48 : 0)
    : textWidth + (pet ? 48 : 0) + clockWidth + statusCount * 60 + (weather ? 72 : 0)
      + (shelf ? 42 : 0) + (music ? 30 : 0) + (agents ? 30 : 0) + (options.wireless ? 42 : 0);
  return Math.ceil(content + messages * 32);
}

export function collapsedPresentationWidth(options: PresentationOptions) {
  return Math.max(96, Math.min(480, occupiedWidth(options)));
}

/** Auxiliary readings yield to the task, face, controls and message sources on a crowded bar. */
export function collapsedPresentationLayout(options: PresentationOptions, availableWidth = 480) {
  const compact = !options.lyricMode && (Boolean(options.timer) || occupiedWidth(options) > availableWidth);
  return { compact, width: collapsedPresentationWidth(compact
    ? { ...options, clockWidth: 0, statusCount: 0, weather: false, shelf: false, agents: false, music: false, wireless: false } : options) };
}
