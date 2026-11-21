import { useCallback, useEffect, useState } from 'react';
import { getWirelessDevices, isWirelessWindowVisible } from './api';
import type { WirelessDevice } from './model';

const initial = { devices: [] as WirelessDevice[], loading: true, error: null as string | null };
export function useWirelessSnapshot(active: boolean) {
  const [state, setState] = useState(initial);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(n => n + 1), []);
  useEffect(() => {
    if (!active) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    async function scan(force: boolean) {
      try {
        const visible = !document.hidden && await isWirelessWindowVisible();
        if (disposed) return;
        if (visible) {
          setState(previous => ({ ...previous, loading: true }));
          const devices = await getWirelessDevices(force);
          if (!disposed) setState({ devices, error: null, loading: false });
        } else {
          setState(initial);
        }
      } catch (error) {
        if (!disposed) setState({ devices: [], error: String(error), loading: false });
      }
      if (!disposed) timer = setTimeout(() => void scan(false), 30000);
    }
    void scan(revision > 0);
    return () => { disposed = true; clearTimeout(timer); };
  }, [active, revision]);
  return { ...(active ? state : initial), refresh };
}
