import { useSyncExternalStore } from 'react';
import { readString, writeString } from '../../lib/storage';

export const WIRELESS_KEY = 'focusd-island-wireless-enabled';
const changeEvent = 'wireless-enabled-changed';

function subscribe(notify: () => void) {
  const storage = (e: StorageEvent) => { if (e.key === null || e.key === WIRELESS_KEY) notify(); };
  window.addEventListener('storage', storage);
  window.addEventListener(changeEvent, notify);
  return () => {
    window.removeEventListener('storage', storage);
    window.removeEventListener(changeEvent, notify);
  };
}
export function useWirelessEnabled() {
  return useSyncExternalStore(subscribe, () => readString(WIRELESS_KEY) === 'true', () => false);
}
export function saveWirelessEnabled(enabled: boolean) {
  const saved = writeString(WIRELESS_KEY, String(enabled));
  if (saved) window.dispatchEvent(new Event(changeEvent));
  return saved;
}
