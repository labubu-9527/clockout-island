import { useDeviceNotice } from '../../features/device-notices/useDeviceNotice';
import { DeviceNoticeCard } from '../../features/device-notices/DeviceNoticeCard';
import { useTranslation } from '../../i18n';
import { getCollapsedTextUnits } from '../../utils/text';
import type { IslandSettings } from '../../features/appearance/types';

/** Window composition owns priority and sizing; the device feature only reports state changes. */
export function useIslandDeviceNotice(settings: IslandSettings, blocked: boolean) {
  const notice = useDeviceNotice(blocked);
  const text = useTranslation().deviceNotices;
  if (!notice) return null;
  const state = notice.kind === 'microphoneMuted' ? notice.value ? text.muted : text.unmuted : notice.value ? text.enabled : text.disabled;
  const width = Math.min(480, Math.max(260, Math.ceil(80 + getCollapsedTextUnits(text.labels[notice.kind] + state) * 13 * settings.islandFontPercent / 100)));
  const height = Math.max(settings.collapsedHeight, 44);
  return { content: <DeviceNoticeCard notice={notice} />, size: { width, height, reader: false, scrolls: false },
    native: { width, height, clickThrough: false } };
}
