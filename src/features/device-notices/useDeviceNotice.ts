import { useEffect, useRef, useState } from 'react';
import { getDeviceStatus, setDeviceNoticesEnabled } from './api';
import { changedDeviceStates, DEVICE_NOTICE_MS, normalizeDeviceState, visibleDeviceNotice, type DeviceNotice, type DeviceState } from './model';
import { useDeviceNoticeSettings } from './storage';

/** Keeps baselines while blocked so a closed panel never replays stale keyboard changes. */
export function useDeviceNotice(blocked: boolean) {
  const settings = useDeviceNoticeSettings();
  const [notice, setNotice] = useState<DeviceNotice | null>(null);
  const boundary = useRef({ blocked, epoch: 0 });
  if (boundary.current.blocked !== blocked) boundary.current = { blocked, epoch: boundary.current.epoch + 1 };
  const latest = useRef({ blocked, settings, epoch: boundary.current.epoch });
  latest.current = { blocked, settings, epoch: boundary.current.epoch };
  const enabledKey = JSON.stringify(settings);
  useEffect(() => {
    setNotice(null);
    if (!Object.values(latest.current.settings).some(Boolean)) return;
    let cancelled = false;
    let running = false;
    let before: DeviceState | null = null;
    let baselineEpoch = latest.current.epoch;
    const poll = async () => {
      if (cancelled || running) return;
      running = true;
      const epoch = latest.current.epoch;
      if (epoch !== baselineEpoch) { before = null; baselineEpoch = epoch; }
      try {
        const next = normalizeDeviceState(await getDeviceStatus());
        if (cancelled) return;
        // An IPC result crossing a panel/priority boundary cannot represent a current transition.
        if (epoch !== latest.current.epoch) { before = null; return; }
        const changes = changedDeviceStates(before, next, latest.current.settings);
        before = next;
        const change = changes[changes.length - 1];
        if (change && !latest.current.blocked) setNotice({ ...change, at: Date.now() });
      } catch {
        before = null;
      } finally { running = false; }
    };
    let timer: number | undefined;
    void (async () => {
      await setDeviceNoticesEnabled(latest.current.settings.capsLock || latest.current.settings.numLock).catch(() => {});
      if (cancelled) return;
      await poll();
      if (!cancelled) timer = window.setInterval(() => void poll(), 200);
    })();
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      void setDeviceNoticesEnabled(false).catch(() => {});
    };
  }, [enabledKey]);
  // Once a higher-priority notice or a panel takes over, this reminder must not come back.
  useEffect(() => { if (blocked) setNotice(null); }, [blocked]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(current => current === notice ? null : current), Math.max(0, DEVICE_NOTICE_MS - (Date.now() - notice.at)));
    return () => window.clearTimeout(timer);
  }, [notice]);
  return visibleDeviceNotice(notice, settings, Date.now(), blocked);
}
