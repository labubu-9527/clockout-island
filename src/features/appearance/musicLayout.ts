export const MUSIC_LAYOUTS = ['SideBySide', 'Separated', 'LyricFocus', 'LyricRight', 'Immersive'] as const;
export type MusicLayout = typeof MUSIC_LAYOUTS[number];

export function normalizeMusicLayout(value: unknown): MusicLayout {
  return MUSIC_LAYOUTS.find(layout => layout === value) ?? 'SideBySide';
}
