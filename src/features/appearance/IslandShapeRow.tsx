import { SettingsChoice } from "../../components/settings/SettingsChoice";
import { SettingsRow } from "../../components/settings/SettingsRow";
import { useTranslation } from "../../i18n";
import type { IslandSettings, IslandShape } from "./types";

export function IslandShapeRow({ settings, onSettingsChange }: {
  settings: IslandSettings;
  onSettingsChange: (settings: IslandSettings) => void;
}) {
  const text = useTranslation().settings.appearance;
  return <SettingsRow title={text.islandShape} control={
    <SettingsChoice<IslandShape> value={settings.islandShape} ariaLabel={text.islandShape}
      options={[{ value: "notch", label: text.notch }, { value: "pill", label: text.pill }]}
      onChange={(islandShape) => onSettingsChange({ ...settings, islandShape })} />
  } />;
}
