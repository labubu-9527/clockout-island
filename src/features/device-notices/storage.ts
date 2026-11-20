import { useSyncExternalStore } from 'react';
import { readString, writeJson } from '../../lib/storage.ts';
import { normalizeDeviceNoticeSettings, type DeviceNoticeSettings } from './model.ts';

export const DEVICE_NOTICE_SETTINGS_KEY = 'focusd-island-device-notice-settings';
const CHANGE_EVENT = 'focusd-device-notice-settings-changed';
function subscribe(notify: () => void) {
  const storage = (event: StorageEvent) => { if (event.key === null || event.key === DEVICE_NOTICE_SETTINGS_KEY) notify(); };
  window.addEventListener('storage', storage);
  window.addEventListener(CHANGE_EVENT, notify);
  return () => { window.removeEventListener('storage', storage); window.removeEventListener(CHANGE_EVENT, notify); };
}
export function useDeviceNoticeSettings() {
  const raw = useSyncExternalStore(subscribe, () => readString(DEVICE_NOTICE_SETTINGS_KEY), () => null);
  try { return normalizeDeviceNoticeSettings(JSON.parse(raw ?? 'null')); }
  catch { return normalizeDeviceNoticeSettings(null); }
}
export function saveDeviceNoticeSettings(settings: DeviceNoticeSettings) {
  const saved = writeJson(DEVICE_NOTICE_SETTINGS_KEY, normalizeDeviceNoticeSettings(settings));
  if (saved) window.dispatchEvent(new Event(CHANGE_EVENT));
  return saved;
}
