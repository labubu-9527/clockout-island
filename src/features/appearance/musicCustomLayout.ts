// DotIsle lyric-core/custom_layout.rs v1 modules, adapted for existing settings (MIT).
export const MUSIC_MODULES = ['header', 'lyrics', 'translation', 'status', 'progress', 'controls'] as const;
export type MusicModule = typeof MUSIC_MODULES[number];
export type MusicModuleSlot = { kind: MusicModule; visible: boolean };
export type MusicCustomLayout = { version: 1; enabled: boolean; showCover: boolean; modules: MusicModuleSlot[] };

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
  return { version: 1, enabled: record.enabled === true, showCover: record.showCover !== false, modules };
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
