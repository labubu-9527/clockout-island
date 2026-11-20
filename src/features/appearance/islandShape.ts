import type { IslandSettings } from "./types";

// Shapes are available in Appearance; native geometry owns the floating gap.
export const CAPSULE_SHAPE_ENABLED = true;

/**
 * Native capsule offset, in logical px. Do not add this to the saved window margin.
 */
export const CAPSULE_TOP_GAP = 6;

/**
 * The settings as the island draws them. The notch keeps the user's own values (and the same
 * object). The capsule floats a little below the top edge, a full pill while collapsed: its
 * collapsed corner radius is half the bar's height, which Rust also uses to round the hit area.
 */
export function shapedSettings(settings: IslandSettings): IslandSettings {
  if (settings.islandShape !== "pill") return settings;
  return {
    ...settings,
    collapsedCornerRadius: settings.collapsedHeight / 2,
  };
}
