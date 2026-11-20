import type { IslandSettings } from '../../features/appearance/types';
import { capsuleGroupMetrics } from '../../features/media/compactLyrics.ts';

/** Render-only geometry: native hit testing and CSS share the source's circular capsule ends. */
export function musicCapsuleSettings(settings: IslandSettings, active: boolean, height?: number): IslandSettings {
  if (!active) return settings;
  return { ...settings, islandShape: 'pill', islandCornerShape: 'round', pillCornerRadius: null,
    collapsedHeight: Math.max(settings.collapsedHeight, height ?? capsuleGroupMetrics(14 * settings.islandFontPercent / 100).height) };
}
