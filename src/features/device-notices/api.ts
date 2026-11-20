import { invoke } from '@tauri-apps/api/core';
import type { DeviceState } from './model';

/** Matches system/device_status.rs DeviceStatus; null denotes unavailable state. */
export function getDeviceStatus() { return invoke<DeviceState>('get_device_status'); }

// Mount/cleanup/remount can overlap. Preserve their order so an old cleanup cannot disable a new listener.
let lifecycle: Promise<unknown> = Promise.resolve();
export function setDeviceNoticesEnabled(enabled: boolean) {
  const next = lifecycle.catch(() => {}).then(() => invoke<void>('set_device_notices_enabled', { enabled }));
  lifecycle = next;
  return next;
}
