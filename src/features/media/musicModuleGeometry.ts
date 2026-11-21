import type { MusicCustomLayout, MusicModule } from '../appearance';
import { DESIGN_WIDTH, type MusicElement } from '../appearance/musicCustomLayout.ts';

export type MusicRect = { element: MusicElement; x: number; y: number; width: number; height: number };
type Row = { kind: MusicModule; top: number; height: number };
export type MusicModuleGeometry = { modules: Row[]; elements: MusicRect[]; height: number };

export function musicRectStyle(rect: MusicRect) {
  return { left: `${rect.x / DESIGN_WIDTH * 100}%`, top: rect.y,
    width: `${rect.width / DESIGN_WIDTH * 100}%`, height: rect.height };
}

function elementRects(layout: MusicCustomLayout, rows: Row[], scale: number) {
  const rects: MusicRect[] = [];
  const add = (element: MusicElement, left: number, top: number, defaultWidth: number, height: number) => {
    const p = layout.elements?.find(item => item.element === element);
    const width = p?.width ?? defaultWidth;
    rects.push({ element, width, height, x: Math.min(DESIGN_WIDTH - width, p?.x ?? left), y: p?.y ?? top });
  };
  for (const {kind, top, height} of rows) {
    if (kind === 'header') {
      if (layout.showCover) add('cover', 0, top, 56, 56);
      const left = layout.showCover ? 70 : 0;
      const titleTop = top + Math.max(0, Math.floor((height - 48 * scale) / 2));
      add('title', left, titleTop, 370 - left, Math.ceil(26 * scale));
      add('artist', left, titleTop + Math.ceil(27 * scale), 370 - left, Math.ceil(20 * scale));
    } else if (kind === 'controls') {
      const actions: MusicElement[] = ['mode', 'favorite', 'volume', 'previous', 'play', 'next', 'translate', 'settings'];
      actions.forEach((action, index) => add(action, 3 + 50 * index, top, 44, 44));
    } else {
      add(kind, 0, top, kind === 'status' ? 150 : 400, height);
    }
  }
  return rects;
}

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
  const elements = elementRects(layout, modules, scale);
  const bottom = layout.elements?.length ? Math.max(...elements.map(rect => rect.y + rect.height)) : top - 8;
  return { modules, elements, height: Math.max(134, bottom) };
}
