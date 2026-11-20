export const DEVICE_KINDS = ['capsLock', 'numLock', 'microphoneMuted', 'touchpadEnabled'] as const;
export type DeviceKind = typeof DEVICE_KINDS[number];
export type DeviceState = Record<DeviceKind, boolean | null>;
export type DeviceNoticeSettings = Record<DeviceKind, boolean>;
export type DeviceChange = { kind: DeviceKind; value: boolean };
export type DeviceNotice = DeviceChange & { at: number };
export const DEVICE_NOTICE_MS = 2000;

export function normalizeDeviceNoticeSettings(value: unknown): DeviceNoticeSettings {
  const saved = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return Object.fromEntries(DEVICE_KINDS.map(kind => [kind, typeof saved[kind] === 'boolean' ? saved[kind] : true])) as DeviceNoticeSettings;
}

export function normalizeDeviceState(value: unknown): DeviceState {
  const saved = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return Object.fromEntries(DEVICE_KINDS.map(kind => [kind, typeof saved[kind] === 'boolean' ? saved[kind] : null])) as DeviceState;
}

export function changedDeviceStates(before: DeviceState | null, next: DeviceState, settings: DeviceNoticeSettings): DeviceChange[] {
  if (!before) return [];
  return DEVICE_KINDS.flatMap(kind => {
    const value = next[kind];
    return settings[kind] && typeof before[kind] === 'boolean' && typeof value === 'boolean' && before[kind] !== value
      ? [{ kind, value }] : [];
  });
}

export function visibleDeviceNotice(notice: DeviceNotice | null, settings: DeviceNoticeSettings, now: number, blocked: boolean) {
  return notice && !blocked && settings[notice.kind] && now - notice.at < DEVICE_NOTICE_MS ? notice : null;
}
