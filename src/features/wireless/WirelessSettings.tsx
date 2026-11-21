import { useState } from 'react';
import { SettingsGroup } from '../../components/settings/SettingsGroup';
import { SettingsToggleRow } from '../../components/settings/SettingsToggleRow';
import { useTranslation } from '../../i18n';
import { saveWirelessEnabled, useWirelessEnabled } from './storage';
import { WirelessPanel } from './WirelessPanel';

export function WirelessSettings() {
  const enabled = useWirelessEnabled();
  const text = useTranslation().wireless;
  const [failed, setFailed] = useState(false);
  return <SettingsGroup title={text.title}>
    <SettingsToggleRow title={text.enabled} checked={enabled} onChange={value => setFailed(!saveWirelessEnabled(value))} />
    {failed && <p role="alert">{text.saveError}</p>}
    {enabled && <WirelessPanel />}
  </SettingsGroup>;
}
