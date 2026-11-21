import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type { WirelessDevice } from './model';

export function getWirelessDevices(refresh = false) {
  return invoke<WirelessDevice[]>('get_wireless_devices', { refresh });
}
export function isWirelessWindowVisible() {
  return getCurrentWindow().isVisible();
}
