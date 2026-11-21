import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { mockIPC, mockWindows } from '@tauri-apps/api/mocks';
import { I18nProvider, LOCALE_STORAGE_KEY } from '../../src/i18n';
import { WirelessSettings } from '../../src/features/wireless/WirelessSettings';
import { WIRELESS_KEY } from '../../src/features/wireless/storage';
import type { WirelessDevice } from '../../src/features/wireless/model';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
mockWindows('settings');
const before = [WIRELESS_KEY, LOCALE_STORAGE_KEY].map(key => [key, localStorage.getItem(key)] as const);
localStorage.removeItem(WIRELESS_KEY);
localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
const endpoint: WirelessDevice = { id: 'test', name: 'Test keyboard', kind: 'keyboard', batteryPercent: null, updatedAt: 1 };
let response = async () => [endpoint];
let reads = 0, visible = true;
const forced: boolean[] = [];
mockIPC((command, payload) => {
  if (command === 'plugin:window|is_visible') return visible;
  if (command === 'get_wireless_devices') {
    reads++;
    forced.push((payload as { refresh: boolean }).refresh);
    return response();
  }
  return null;
});
const root = createRoot(document.getElementById('root')!);
const text = () => document.getElementById('root')!.textContent ?? '';
const click = (selector: string) => act(async () => {
  const button = document.querySelector<HTMLElement>(selector);
  if (!button) throw Error('Missing control ' + selector);
  button.click();
});
const toggle = '[role="switch"]';
const refresh = '[aria-label="Refresh battery levels"]';
const results: string[] = [];
const check = (value: unknown, name: string) => {
  if (!value) throw Error(name); results.push('PASS ' + name);
};
try {
  await act(async () => root.render(<I18nProvider><WirelessSettings /></I18nProvider>));
  check(reads === 0, 'disabled by default');
  await click(toggle);
  check(reads === 1 && text().includes('Test keyboard') && text().includes('Unknown'), 'connected device with unknown battery');
  response = async () => [];
  await click(refresh);
  check(forced[forced.length - 1] && text().includes('No connected') && !text().includes('Test keyboard'), 'refresh replaces disconnected snapshot');
  response = async () => { throw Error('Access denied'); };
  await click(refresh);
  check(text().includes('Access denied'), 'native scan error visible');
  let finish: (devices: WirelessDevice[]) => void = () => {};
  response = () => new Promise(resolve => { finish = resolve; });
  await click(refresh);
  await click(toggle);
  await act(async () => finish([endpoint]));
  check(!text().includes('Test keyboard') && !document.querySelector(refresh), 'late result discarded after disabling');
  visible = false;
  const prior = reads;
  await click(toggle);
  check(reads === prior, 'native hidden window does not scan');
  document.documentElement.dataset.testResult = 'passed';
} catch (error) {
  document.documentElement.dataset.testResult = 'failed';
  results.push('FAIL ' + String(error));
} finally {
  await act(async () => root.unmount());
  for (const [key, value] of before) {
    if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value);
  }
  document.getElementById('results')!.textContent = results.join('\n');
}
