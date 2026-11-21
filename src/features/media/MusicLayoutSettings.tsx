import type { IslandSettings } from '../appearance';
import { MUSIC_LAYOUTS } from './musicLayouts';
import { SettingsGroup } from '../../components/settings/SettingsGroup';
import { SettingsRow } from '../../components/settings/SettingsRow';
import { SettingsSelect } from '../../components/settings/SettingsSelect';
import { useTranslation } from '../../i18n';

export function MusicLayoutSettings({ settings, onSettingsChange }: {
  settings: IslandSettings; onSettingsChange: (settings: IslandSettings) => void;
}) {
  const { layout } = useTranslation().music;
  return <SettingsGroup title={layout.title}>
    <SettingsRow title={layout.title} description={layout.description} control={
      <SettingsSelect value={settings.musicLayout} ariaLabel={layout.title}
        options={MUSIC_LAYOUTS.map(value => ({ value, label: layout.options[value] }))}
        onChange={musicLayout => onSettingsChange({ ...settings, musicLayout })} />
    } />
  </SettingsGroup>;
}
