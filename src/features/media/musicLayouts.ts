// Geometry adapted from DotIsle lyric-core/src/music_layout.rs, d09a751 (MIT).
// The host already supplies 20px card padding and its own navigation chrome.
import type { MusicLayout } from '../appearance';
export { MUSIC_LAYOUTS, normalizeMusicLayout, type MusicLayout } from '../appearance/index.ts';

export function musicLayoutMetrics(layout: MusicLayout) {
  const base = { coverSize: 68, coverTop: 0, metaTop: -2, metaLeft: 88,
    lyricTop: 48, progressTop: 114, controlsTop: 145, extraHeight: 0 };
  if (layout === 'SideBySide') return base;
  if (layout === 'Separated') return { ...base, coverSize: 56, coverTop: -2, metaTop: 3.5,
    metaLeft: 76, lyricTop: 74, progressTop: 130, controlsTop: 161, extraHeight: 16 };
  if (layout === 'LyricFocus') return { ...base, coverTop: -2, metaTop: -1,
    lyricTop: 72, progressTop: 130, controlsTop: 161, extraHeight: 16 };
  if (layout === 'LyricRight') return { ...base, metaLeft: 0, extraHeight: 16, controlsTop: 161 };
  return { ...base, coverSize: 0, metaLeft: 4, lyricTop: 50,
    progressTop: 144, controlsTop: 167, extraHeight: 16 };
}

export function musicLayoutVariables(layout: MusicLayout) {
  const metrics = musicLayoutMetrics(layout);
  return {
    '--music-cover-size': `${metrics.coverSize}px`, '--music-cover-top': `${metrics.coverTop}px`,
    '--music-meta-top': `${metrics.metaTop}px`, '--music-meta-left': `${metrics.metaLeft}px`,
    '--music-lyric-top': `${metrics.lyricTop}px`, '--music-progress-top': `${metrics.progressTop}px`,
    '--music-controls-top': `${metrics.controlsTop}px`,
  };
}
