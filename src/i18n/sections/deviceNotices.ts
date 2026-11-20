export type DeviceNoticesText = {
  title: string; hint: string; enabled: string; disabled: string; muted: string; unmuted: string;
  labels: Record<'capsLock' | 'numLock' | 'microphoneMuted' | 'touchpadEnabled', string>;
};
export const zhCN: DeviceNoticesText = {
  title: '系统状态提醒', hint: '状态变化时在岛上显示约 2 秒。麦克风仅检测系统静音；触控板提醒取决于设备支持。',
  enabled: '已开启', disabled: '已关闭', muted: '已静音', unmuted: '已取消静音',
  labels: { capsLock: '大写锁定', numLock: '小键盘锁定', microphoneMuted: '麦克风', touchpadEnabled: '触控板' },
};
export const en: DeviceNoticesText = {
  title: 'System status reminders', hint: 'Show changes on the island for 2 seconds. Microphone reflects system mute; touchpad support varies by device.',
  enabled: 'On', disabled: 'Off', muted: 'Muted', unmuted: 'Unmuted',
  labels: { capsLock: 'Caps Lock', numLock: 'Num Lock', microphoneMuted: 'Microphone', touchpadEnabled: 'Touchpad' },
};
