import type { IslandSettings } from "../../features/appearance/types";
import { LyricsSettingsSection } from "../../features/media/lyrics/LyricsSettingsSection";
import { MusicSourcePrioritySection } from "../../features/media/MusicSourcePrioritySection";
import { useTranslation } from "../../i18n";
import { ModuleSwitchSection } from "./ModuleSwitchSection";
import { MediaCompatibilitySection } from "../../features/media/MediaCompatibilitySection";
import { MusicLayoutSettings } from "../../features/media/MusicLayoutSettings";
import { MusicModuleSettings } from "../../features/media/MusicModuleSettings";
import { MusicCanvasEditor } from "../../features/media/MusicCanvasEditor";

/** Settings → Music: the module switch, which player the island follows, and where lyrics come from. */
export function MusicSettingsPage({
  settings,
  onSettingsChange,
}: {
  settings: IslandSettings;
  onSettingsChange: (settings: IslandSettings) => void;
}) {
  const t = useTranslation();

  return (
    <>
      <ModuleSwitchSection
        label={t.settings.modules.music}
        checked={settings.musicEnabled}
        onChange={(musicEnabled) => onSettingsChange({ ...settings, musicEnabled })}
      />
      {settings.musicEnabled && <MusicSourcePrioritySection />}
      {settings.musicEnabled && <MusicLayoutSettings settings={settings} onSettingsChange={onSettingsChange} />}
      {settings.musicEnabled && <MusicModuleSettings settings={settings} onSettingsChange={onSettingsChange} />}
      {settings.musicEnabled && settings.musicCustomLayout.enabled && <MusicCanvasEditor
        layout={settings.musicCustomLayout} fontScale={settings.islandFontPercent / 100}
        onChange={musicCustomLayout => onSettingsChange({...settings, musicCustomLayout})} />}
      {settings.musicEnabled && <LyricsSettingsSection settings={settings} onSettingsChange={onSettingsChange} />}
      {settings.musicEnabled && <MediaCompatibilitySection />}
    </>
  );
}
