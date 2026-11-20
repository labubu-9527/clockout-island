import type { CSSProperties } from "react";
import claudeCodeIcon from "../../assets/brands/claude-code.png";
import { useTranslation } from "../../i18n";
import { inkOn } from "../../utils/color";
import { AgentPagePreview } from "./AgentPagePreview";
import { IslandPet } from "../island-pet";
import { cornerShapeCss } from "./cornerShape";
import { shapedSettings } from "./islandShape";
import { COLLAPSED_WIDTH, glassTintAlpha, hexToRgba, isGlass, MAX_COLLAPSED_SCALE, MAX_EXPANDED_SCALE } from "./settings";
import type { IslandSettings } from "./types";
import { resolveSchemeColors } from "./theme";
import { useResolvedScheme } from "./useDocumentTheme";
import "./IslandPreview.css";

/**
 * Appearance, first: the island drawn from the current settings, collapsed and expanded, on a
 * colourful wallpaper so opacity and glass show. Both show an Agent session, as the island does
 * while one is working: collapsed, the bar with its title and session ring; expanded, the Agent
 * page (AgentPagePreview). A drawing with sample content, not the island itself; the variables
 * mirror windows/island/stageStyle.ts, which features cannot import.
 */
export function IslandPreview({ settings }: { settings: IslandSettings }) {
  const text = useTranslation().settings.appearance.preview;
  const glass = isGlass(settings.material);
  const shaped = shapedSettings(settings);
  const colors = resolveSchemeColors(settings, useResolvedScheme(settings.colorScheme));
  const style = {
    "--preview-fill": hexToRgba(
      colors.islandBackgroundColor,
      settings.opacity / 100 * (glass ? glassTintAlpha(settings.material, settings.glassIntensity) : 1),
    ),
    "--preview-glass": settings.glassIntensity / 100,
    "--preview-radius-px": settings.islandCornerRadius,
    "--preview-radius-collapsed-px": shaped.collapsedCornerRadius,
    "--preview-corner-shape": settings.islandShape === "pill" ? "round" : cornerShapeCss(settings.islandCornerShape),
    "--preview-pulse": colors.pulseColor,
    "--preview-pulse-glow": hexToRgba(colors.pulseColor, 0.72),
    "--preview-pulse-brightness": `${settings.pulseBrightness}%`,
    "--preview-text": colors.taskTextColor,
    "--preview-ink": inkOn(colors.islandBackgroundColor),
    "--preview-collapsed-scale": settings.collapsedScale,
    "--preview-collapsed-width": settings.collapsedAutoWidth ? COLLAPSED_WIDTH.default : settings.collapsedWidth,
    "--preview-collapsed-height": settings.collapsedHeight,
    "--preview-collapsed-limit": COLLAPSED_WIDTH.max * MAX_COLLAPSED_SCALE,
    "--preview-expanded-scale": settings.expandedScale,
    "--preview-expanded-max-scale": MAX_EXPANDED_SCALE,
    "--preview-font-scale": settings.islandFontPercent / 100,
  } as CSSProperties;
  const islandClass = [
    "island-preview__island",
    glass && "island-preview__island--glass",
    `island-preview__island--${settings.material}`,
    `island-preview__island--${settings.islandShape}`,
    (settings.marginY > 0 || settings.islandShape === "pill") && "island-preview__island--detached",
  ].filter(Boolean).join(" ");

  return (
    <figure
      className={`island-preview island-preview--font-${settings.fontFamily}`}
      data-tone={colors.tone}
      style={style}
      aria-label={text.label}
    >
      <div className="island-preview__desktop">
        <div className={`${islandClass} island-preview__island--collapsed`}>
          {settings.petEnabled && settings.collapsedSlotVisibility.pet && <IslandPet state="idle" active={false} />}
          <img className="island-preview__provider" src={claudeCodeIcon} alt="" draggable={false} />
          {settings.collapsedSlotVisibility.text && <span className="island-preview__task">{text.sessions.needs.title}</span>}
          {settings.collapsedSlotVisibility.agents && settings.agentStatusEnabled && <span className="island-preview__ring">1</span>}
        </div>
        <figcaption className="island-preview__caption">{text.collapsed}</figcaption>
      </div>
      <div className="island-preview__desktop">
        <div className={`${islandClass} island-preview__island--expanded`}>
          <AgentPagePreview pageOrder={settings.pageOrder} pageButtonStyle={settings.pageButtonStyle} />
        </div>
        <figcaption className="island-preview__caption">{text.expanded}</figcaption>
      </div>
    </figure>
  );
}
