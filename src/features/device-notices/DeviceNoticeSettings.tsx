import { SettingsGroup } from '../../components/settings/SettingsGroup';
import { SettingsToggleRow } from '../../components/settings/SettingsToggleRow';
import { useTranslation } from '../../i18n';
import { DEVICE_KINDS } from './model';
import { saveDeviceNoticeSettings, useDeviceNoticeSettings } from './storage';

export function DeviceNoticeSettings() {
  const text = useTranslation().deviceNotices;
  const settings = useDeviceNoticeSettings();
  return <SettingsGroup title={text.title} footer={text.hint}>
    {DEVICE_KINDS.map(kind => <SettingsToggleRow key={kind} title={text.labels[kind]} checked={settings[kind]}
      onChange={value => { saveDeviceNoticeSettings({ ...settings, [kind]: value }); }} />)}
  </SettingsGroup>;
}
