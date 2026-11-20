import type { CSSProperties } from "react";
import { motionTiming, type IslandEffectsSettings } from "../../features/appearance/islandEffects";

export function islandMotionStyle(settings: IslandEffectsSettings, expanded: boolean): CSSProperties {
  const duration = expanded ? settings.motionDuration : settings.motionCollapseDuration;
  const linearSupported = typeof CSS !== "undefined" && CSS.supports("transition-timing-function", "linear(0,1)");
  return {
    "--island-motion": motionTiming(settings, expanded, linearSupported),
    "--island-motion-duration": `${duration}ms`,
    "--island-panel-open-slide-duration": `${Math.max(100, duration - 80)}ms`,
    "--island-panel-open-fade-duration": `${Math.min(240, duration / 2)}ms`,
  } as CSSProperties;
}
