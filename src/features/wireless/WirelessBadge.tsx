import { Bluetooth } from 'lucide-react';
import { useTranslation } from '../../i18n';
import type { WirelessDevice } from './model';
import { useWirelessEnabled } from './storage';
import './wireless.css';

export function WirelessBadge({ devices, onOpen }: { devices: WirelessDevice[]; onOpen: () => void }) {
  const text = useTranslation().wireless;
  const enabled = useWirelessEnabled();
  if (!enabled) return null;
  const values = devices.flatMap(device => device.batteryPercent === null ? [] : [device.batteryPercent]);
  return <button type="button" className="wireless-badge" onClick={onOpen} aria-label={text.title} title={text.title}>
    <Bluetooth size={14} />{values.length > 0 && <span>{Math.min(...values)}%</span>}
  </button>;
}
