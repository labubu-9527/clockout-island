import { useState } from "react";
import { DeviceNoticeSettings } from "../../features/device-notices/DeviceNoticeSettings";
import { SettingsGroup } from "../../components/settings/SettingsGroup";
import { useTranslation } from "../../i18n";
import { CollapsedDimensionRows } from "../../features/appearance/CollapsedDimensionRows";
import { CollapsedIslandSection } from "../../features/appearance/CollapsedIslandSection";
import { CollapsedLayoutEditor } from "../../features/appearance/CollapsedLayoutEditor";
import { ColorSettingsSection } from "../../features/appearance/ColorSettingsSection";
import { AppearancePresetSection } from "../../features/appearance/AppearancePresetSection";
import { IslandCornerRows } from "../../features/appearance/IslandCornerRows";
import { IslandShapeRow } from "../../features/appearance/IslandShapeRow";
import { IslandPreview } from "../../features/appearance/IslandPreview";
import { IslandEffectsSettings } from "../../features/appearance/IslandEffectsSettings";
import { APPEARANCE_TABS, type AppearanceTab } from "./settingsSearch";
import "./AppearanceSettingsPage.css";
import {
  CollapsedScaleRow, ExpandedScaleRow, FontRows, MaterialRows, OpacityRow, PageButtonsRow, SchemeRow,
} from "../../features/appearance/StyleRows";
import { TopEdgeShoulderRows } from "../../features/appearance/TopEdgeShoulderRows";
import { TuckLookRows } from "../../features/appearance/TuckLookRows";
import type { IslandSettings } from "../../features/appearance/types";
import { requestPanelPreview } from "./storage";
import { appearancePreviewMode } from "./appearancePreview";

/**
 * Settings → Appearance (docs/design/settings.md, 2026-11-19): one kind of setting per group, so
 * each is found in one place: a preview; the theme; colours; the font; every size; every corner;
 * what sits where on the collapsed island and what it shows first; the tucked look; and last the
 * whole-look presets.
 */
export function AppearanceSettingsPage({
  settings,
  onSettingsChange,
  tab = "size",
  onTabChange,
}: {
  settings: IslandSettings;
  onSettingsChange: (settings: IslandSettings) => void;
  tab?: AppearanceTab;
  onTabChange?: (tab: AppearanceTab) => void;
}) {
  const t = useTranslation();
  const text = t.settings.appearance;
  const [expandedScalePreview, setExpandedScalePreview] = useState<number | null>(null);
  const [fontSizePreview, setFontSizePreview] = useState<number | null>(null);
  const updateAppearance = (next: IslandSettings) => {
    onSettingsChange(next);
    const mode = appearancePreviewMode(settings, next);
    if (mode) requestPanelPreview(mode);
  };
  const rows = { settings, onSettingsChange: updateAppearance };
  return (
    <>
      <div className="settings-tabs" role="tablist" aria-label={t.settings.categories.appearance}>
        {APPEARANCE_TABS.map((entry, index) => <button key={entry} type="button" role="tab" id={`appearance-tab-${entry}`}
          aria-selected={tab === entry} aria-controls={`appearance-panel-${entry}`} tabIndex={tab === entry ? 0 : -1}
          data-appearance-tab={entry} onClick={() => onTabChange?.(entry)} onKeyDown={event => {
            const next = event.key === "ArrowRight" ? (index + 1) % APPEARANCE_TABS.length : event.key === "ArrowLeft" ? (index + APPEARANCE_TABS.length - 1) % APPEARANCE_TABS.length : event.key === "Home" ? 0 : event.key === "End" ? APPEARANCE_TABS.length - 1 : null;
            if (next === null) return;
            event.preventDefault(); onTabChange?.(APPEARANCE_TABS[next]);
            document.getElementById(`appearance-tab-${APPEARANCE_TABS[next]}`)?.focus();
          }}>{t.settings.replica.tabs[entry]}</button>)}
      </div>
      <p className="settings-tabs__description">{t.settings.replica.tabDescriptions[tab]}</p>
      {(tab === "size" || tab === "material") && <IslandPreview settings={{
        ...settings,
        expandedScale: expandedScalePreview ?? settings.expandedScale,
        islandFontPercent: fontSizePreview ?? settings.islandFontPercent,
      }} />}
      <div className="settings-tab-panel" id="appearance-panel-size" role="tabpanel" aria-labelledby="appearance-tab-size" data-settings-tab="size" hidden={tab !== "size"}>
      <SettingsGroup title={text.textSizeTitle}>
        <FontRows {...rows} onFontSizePreview={setFontSizePreview} />
      </SettingsGroup>
      <SettingsGroup title={text.sizeTitle} footer={text.collapsedDimensions.hint}>
        <CollapsedScaleRow {...rows} />
        <ExpandedScaleRow {...rows} onExpandedScalePreview={setExpandedScalePreview} />
        <CollapsedDimensionRows settings={settings} onChange={updateAppearance} />
      </SettingsGroup>
      <SettingsGroup title={text.cornersTitle}>
        <IslandCornerRows settings={settings} onChange={updateAppearance} />
        {settings.islandShape !== "pill" && <TopEdgeShoulderRows settings={settings} onChange={updateAppearance} />}
      </SettingsGroup>
      </div>
      <div className="settings-tab-panel" id="appearance-panel-material" role="tabpanel" aria-labelledby="appearance-tab-material" data-settings-tab="material" hidden={tab !== "material"}>
        <SettingsGroup title={text.themeTitle}>
          <IslandShapeRow {...rows} /><SchemeRow {...rows} /><MaterialRows {...rows} /><OpacityRow {...rows} />
        </SettingsGroup>
        <ColorSettingsSection {...rows} />
        <AppearancePresetSection {...rows} />
      </div>
      <div className="settings-tab-panel" id="appearance-panel-layout" role="tabpanel" aria-labelledby="appearance-tab-layout" data-settings-tab="layout" hidden={tab !== "layout"}>
      <CollapsedLayoutEditor {...rows}>
        <PageButtonsRow {...rows} />
      </CollapsedLayoutEditor>
      </div>
      <div className="settings-tab-panel" id="appearance-panel-interaction" role="tabpanel" aria-labelledby="appearance-tab-interaction" data-settings-tab="interaction" hidden={tab !== "interaction"}>
      <DeviceNoticeSettings />
      <CollapsedIslandSection {...rows} />
      <SettingsGroup title={t.settings.expand.tuckTitle}>
        <TuckLookRows {...rows} onPreviewTuck={() => requestPanelPreview("tucked")} />
      </SettingsGroup>
      </div>
      <div className="settings-tab-panel" id="appearance-panel-motion" role="tabpanel" aria-labelledby="appearance-tab-motion" data-settings-tab="motion" hidden={tab !== "motion"}>
        <IslandEffectsSettings {...rows} />
      </div>
    </>
  );
}
