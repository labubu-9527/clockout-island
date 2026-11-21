// DotIsle lyric-core/custom_layout.rs v1 modules, adapted for existing settings (MIT).
export const MUSIC_MODULES = ['header', 'lyrics', 'translation', 'status', 'progress', 'controls'] as const;
export type MusicModule = typeof MUSIC_MODULES[number];
export type MusicModuleSlot = { kind: MusicModule; visible: boolean };
export const MUSIC_ELEMENTS = ['cover', 'title', 'artist', 'lyrics', 'translation', 'status', 'progress',
  'mode', 'favorite', 'volume', 'previous', 'play', 'next', 'translate', 'settings'] as const;
export type MusicElement = typeof MUSIC_ELEMENTS[number];
export type MusicPlacement = { element: MusicElement; x: number; y: number; width?: number };
export type MusicCustomLayout = { version: 1; enabled: boolean; showCover: boolean; modules: MusicModuleSlot[]; elements?: MusicPlacement[] };
export const DESIGN_WIDTH = 400;
export const MAX_ELEMENT_Y = 600;
export const canResizeMusicElement = (element: MusicElement) =>
  ['title', 'artist', 'lyrics', 'translation', 'status', 'progress'].includes(element);

function normalizeElements(value: unknown): MusicPlacement[] {
  const result: MusicPlacement[] = [];
  if (!Array.isArray(value)) return result;
  for (const item of value as unknown[]) {
    if (!item || typeof item !== 'object') continue;
    const { x, y, width, element: name } = item as Record<string, unknown>;
    const element = MUSIC_ELEMENTS.find(id => id === name);
    if (!element || typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x)
      || !Number.isFinite(y) || result.some(p => p.element === element)) continue;
    const size = canResizeMusicElement(element) && typeof width === 'number' && Number.isFinite(width)
      ? Math.max(24, Math.min(DESIGN_WIDTH, Math.round(width))) : undefined;
    result.push({ element, x: Math.max(0, Math.min(DESIGN_WIDTH - (size ?? 1), Math.round(x))),
      y: Math.max(0, Math.min(MAX_ELEMENT_Y, Math.round(y))), ...(size !== undefined && { width: size }) });
  }
  return result;
}

export const isRequiredMusicModule = (kind: MusicModule) => kind === 'header' || kind === 'controls';

export function defaultMusicCustomLayout(): MusicCustomLayout {
  return { version: 1, enabled: false, showCover: true, modules: MUSIC_MODULES.map(kind => ({ kind, visible: true })) };
}

export function normalizeMusicCustomLayout(value: unknown): MusicCustomLayout {
  const fallback = defaultMusicCustomLayout();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback;
  const record = value as Record<string, unknown>;
  if (record.version !== undefined && record.version !== 1) return fallback;
  const modules: MusicModuleSlot[] = [];
  if (Array.isArray(record.modules)) for (const entry of record.modules) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const slot = entry as Record<string, unknown>;
    const kind = MUSIC_MODULES.find(candidate => candidate === slot.kind);
    if (!kind || modules.some(item => item.kind === kind)) continue;
    modules.push({ kind, visible: isRequiredMusicModule(kind) || slot.visible !== false });
  }
  for (const kind of MUSIC_MODULES) if (!modules.some(slot => slot.kind === kind)) modules.push({ kind, visible: true });
  const elements = normalizeElements(record.elements);
  return { version: 1, enabled: record.enabled === true, showCover: record.showCover !== false, modules,
    ...(elements.length ? { elements } : {}) };
}

/** Offset-based movement works for keyboard/buttons and arbitrary drop targets alike. */
export function moveMusicModule(layout: MusicCustomLayout, kind: MusicModule, offset: number): MusicCustomLayout {
  const from = layout.modules.findIndex(slot => slot.kind === kind);
  const to = Math.max(0, Math.min(layout.modules.length - 1, from + Math.trunc(offset)));
  if (from < 0 || from === to || !Number.isFinite(to)) return layout;
  const modules = [...layout.modules];
  modules.splice(to, 0, ...modules.splice(from, 1));
  return { ...layout, modules };
}
