import { useEffect, useRef } from 'react';
import { useWirelessEnabled } from '../../features/wireless/storage';
import { useWirelessSnapshot } from '../../features/wireless/useWirelessSnapshot';
import { wirelessAlerts, type WirelessDevice } from '../../features/wireless/model';

/** Low-battery thresholds survive page switches, while polling follows island visibility. */
export function useIslandWirelessNotices(active: boolean, accept: (device: WirelessDevice) => void) {
  const enabled = useWirelessEnabled();
  const snapshot = useWirelessSnapshot(enabled && active);
  const levels = useRef(new Map<string, number>());
  useEffect(() => {
    if (!enabled || !active || snapshot.loading || snapshot.error) return;
    for (const device of wirelessAlerts(snapshot.devices, levels.current)) accept(device);
  }, [accept, active, enabled, snapshot.devices, snapshot.error, snapshot.loading]);
  return { enabled, devices: snapshot.devices };
}
