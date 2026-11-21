import type { MusicCustomLayout, MusicModule } from '../appearance';

export type MusicModuleGeometry = { modules: { kind: MusicModule; top: number; height: number }[]; height: number };

/** DotIsle custom_layout.rs: stack visible modules, without reserving absent rows. */
export function musicModuleGeometry(layout: MusicCustomLayout, options: {
  fontScale: number; hasLyrics: boolean; hasProgress: boolean;
}): MusicModuleGeometry {
  const scale = Number.isFinite(options.fontScale) ? Math.max(0.8, Math.min(1.5, options.fontScale)) : 1;
  const heights: Record<MusicModule, number> = {
    header: Math.max(layout.showCover ? 56 : 0, 48 * scale), lyrics: 27 * scale,
    translation: 18 * scale, status: 16 * scale, progress: 46, controls: 44,
  };
  const modules: MusicModuleGeometry['modules'] = [];
  let top = 0;
  for (const slot of layout.modules) {
    if (!slot.visible || ((slot.kind === 'lyrics' || slot.kind === 'translation') && !options.hasLyrics)
      || (slot.kind === 'progress' && !options.hasProgress)) continue;
    const height = Math.ceil(heights[slot.kind]);
    modules.push({ kind: slot.kind, top, height });
    top += height + 8;
  }
  // The native island clamps expanded height to 220px; its existing chrome is 86px.
  return { modules, height: Math.max(134, top - (modules.length ? 8 : 0)) };
}
