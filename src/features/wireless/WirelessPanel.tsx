import { Bluetooth, RefreshCw } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from '../../i18n';
import type { WirelessDevice } from './model';
import { useWirelessEnabled } from './storage';
import { useWirelessSnapshot } from './useWirelessSnapshot';
import './wireless.css';

export function WirelessPanel({ onDevices }: { onDevices?: (devices: WirelessDevice[]) => void }) {
  const enabled = useWirelessEnabled();
  const { devices, loading, error, refresh } = useWirelessSnapshot(enabled);
  const text = useTranslation().wireless;
  useEffect(() => { if (enabled && !loading && !error) onDevices?.(devices); }, [devices, loading, error, enabled, onDevices]);
  if (!enabled) return null;
  return <section className="wireless-panel" aria-label={text.title}>
    <header><strong>{text.title}</strong><button type="button" title={text.refresh} aria-label={text.refresh} onClick={refresh} disabled={loading}>
      <RefreshCw size={15} /></button></header>
    {error && <p role="alert">{text.error} · {error}</p>}
    {loading && <p role="status">{text.scanning}</p>}
    {!loading && !error && !devices.length && <p>{text.empty}</p>}
    <ul>{devices.map(device => <li key={device.id}><Bluetooth size={15} />
      <span>{device.name || text.unnamed}</span><b>{device.batteryPercent === null ? text.unknown : device.batteryPercent + '%'}</b>
    </li>)}</ul>
  </section>;
}
