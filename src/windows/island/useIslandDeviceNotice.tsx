import type { DeviceNotice } from '../../features/device-notices/model';
import { DeviceNoticeCard } from '../../features/device-notices/DeviceNoticeCard';
import { useTranslation } from '../../i18n';
import { getCollapsedTextUnits } from '../../utils/text';
import type { IslandSettings } from '../../features/appearance/types';
import type { WirelessDevice } from '../../features/wireless/model';
import { BatteryLow } from 'lucide-react';

/** Window composition owns priority and sizing; the device feature only reports state changes. */
export function useIslandDeviceNotice(settings: IslandSettings, notice: DeviceNotice | null, wireless: WirelessDevice | null = null) {
  const t = useTranslation();
  const text = t.deviceNotices;
  if (wireless) {
    const name = wireless.name || t.wireless.unnamed;
    const width = Math.min(480, Math.max(260, Math.ceil(100 + getCollapsedTextUnits(name + t.wireless.low) * 13 * settings.islandFontPercent / 100)));
    const height = Math.max(settings.collapsedHeight, 44);
    return { content: <div className="device-notice" role="status" aria-live="polite" aria-atomic="true">
      <span className="device-notice__icon"><BatteryLow size={20} aria-hidden="true" /></span>
      <span className="device-notice__name">{name}</span><span className="device-notice__state">{t.wireless.low} · {wireless.batteryPercent}%</span>
    </div>, size: { width, height, reader: false, scrolls: false }, native: { width, height, clickThrough: false } };
  }
  if (!notice) return null;
  const state = notice.kind === 'microphoneMuted' ? notice.value ? text.muted : text.unmuted : notice.value ? text.enabled : text.disabled;
  const width = Math.min(480, Math.max(260, Math.ceil(80 + getCollapsedTextUnits(text.labels[notice.kind] + state) * 13 * settings.islandFontPercent / 100)));
  const height = Math.max(settings.collapsedHeight, 44);
  return { content: <DeviceNoticeCard notice={notice} />, size: { width, height, reader: false, scrolls: false },
    native: { width, height, clickThrough: false } };
}
