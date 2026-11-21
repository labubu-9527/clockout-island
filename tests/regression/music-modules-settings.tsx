import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MusicModuleSettings } from '../../src/features/media/MusicModuleSettings';
import { DEFAULT_SETTINGS, normalizeSettings } from '../../src/features/appearance/settings';
import { saveSettings, STORAGE_KEY } from '../../src/features/appearance/storage';
import type { IslandSettings, MusicModule } from '../../src/features/appearance';
import { I18nProvider, LOCALE_STORAGE_KEY } from '../../src/i18n';
import '../../src/styles/tokens.css';
import '../../src/styles/base.css';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const original = localStorage.getItem(STORAGE_KEY);
const originalLocale = localStorage.getItem(LOCALE_STORAGE_KEY);
const locale = new URLSearchParams(location.search).get('lang') === 'zh-CN' ? 'zh-CN' : 'en';
localStorage.setItem(LOCALE_STORAGE_KEY, locale);
let current: IslandSettings = { ...DEFAULT_SETTINGS, musicLayout: 'Immersive' };
function Harness() {
  const [settings, setSettings] = useState(current);
  return <MusicModuleSettings settings={settings} onSettingsChange={next => {
    current = next;
    saveSettings(next);
    setSettings(next);
  }} />;
}
const root = createRoot(document.getElementById('root')!);
const results = document.getElementById('results')!;
function check(condition: boolean, message: string) { if (!condition) throw new Error(message); }
const row = (kind: MusicModule) => document.querySelector<HTMLElement>(`[data-music-module="${kind}"]`)!;
const button = (kind: MusicModule, action: string) => row(kind).querySelector<HTMLButtonElement>(`[data-module-action="${action}"]`)!;
const click = async (element: HTMLElement) => act(async () => element.click());
const kinds = () => [...document.querySelectorAll<HTMLElement>('[data-music-module]')].map(item => item.dataset.musicModule).join(',');
try {
  await act(async () => root.render(<I18nProvider><Harness /></I18nProvider>));
  check(!document.querySelector('[data-music-module]'), 'Editor starts disabled');
  await click(document.querySelector<HTMLInputElement>('[role="switch"]')!);
  check(current.musicCustomLayout.enabled, 'Enable custom modules');
  check(row('header').querySelector<HTMLInputElement>('input')!.disabled, 'Track information is required');
  check(row('controls').querySelector<HTMLInputElement>('input')!.disabled, 'Controls are required');
  check(row('header').textContent!.includes(locale === 'en' ? 'Required' : '必须保留'), 'Required explanation is localized');
  check([...document.querySelectorAll<HTMLElement>('.music-modules-item')].every(item => item.scrollWidth <= item.clientWidth), 'Module rows fit a narrow settings window');
  await click(row('lyrics').querySelector<HTMLInputElement>('input')!);
  check(!current.musicCustomLayout.modules.find(item => item.kind === 'lyrics')!.visible, 'Hide lyrics');
  await click(document.querySelector<HTMLInputElement>('.music-modules-cover input')!);
  check(!current.musicCustomLayout.showCover && current.musicCustomLayout.modules[0].visible, 'Hide cover independently');
  await click(button('lyrics', 'up'));
  check(kinds().startsWith('lyrics,header'), 'Move up button');
  await click(button('lyrics', 'down'));
  check(kinds().startsWith('header,lyrics'), 'Move down button');
  await click(button('lyrics', 'up'));
  await act(async () => button('header', 'drag').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })));
  check(kinds().startsWith('lyrics,translation,header'), 'ArrowDown reorders');
  check(document.activeElement === button('header', 'drag'), 'Keyboard focus follows moved module');
  await act(async () => button('header', 'drag').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })));
  check(kinds().startsWith('lyrics,header,translation'), 'ArrowUp reorders');
  const transfer = new DataTransfer();
  await act(async () => button('controls', 'drag').dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: transfer })));
  await act(async () => row('lyrics').dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: transfer })));
  await act(async () => row('lyrics').dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: transfer })));
  check(kinds().startsWith('controls,lyrics'), 'Mouse drag reorders');
  const saved = normalizeSettings(JSON.parse(localStorage.getItem(STORAGE_KEY)!));
  check(saved.musicCustomLayout.modules[0].kind === 'controls' && !saved.musicCustomLayout.showCover, 'Save and normalize custom layout');
  await click(document.querySelector<HTMLButtonElement>('[data-module-action="reset"]')!);
  check(current.musicCustomLayout.enabled && current.musicLayout === 'Immersive', 'Reset preserves enabled state and preset');
  check(kinds() === 'header,lyrics,translation,status,progress,controls', 'Reset module order');
  check(current.musicCustomLayout.showCover && current.musicCustomLayout.modules.every(item => item.visible), 'Reset visibility');
  check(button('header', 'up').disabled && button('controls', 'down').disabled, 'Order boundaries disable buttons');
  await click(document.querySelector<HTMLInputElement>('[role="switch"]')!);
  check(!current.musicCustomLayout.enabled && current.musicLayout === 'Immersive', 'Disable preserves preset');
  results.textContent = 'PASS enable, visibility, required controls, cover, buttons, keyboard focus, mouse drag, persistence and reset';
  document.documentElement.dataset.testResult = 'passed';
} catch (error) {
  results.textContent = `FAIL ${String(error)}`;
  document.documentElement.dataset.testResult = 'failed';
} finally {
  if (original === null) localStorage.removeItem(STORAGE_KEY); else localStorage.setItem(STORAGE_KEY, original);
  if (originalLocale === null) localStorage.removeItem(LOCALE_STORAGE_KEY); else localStorage.setItem(LOCALE_STORAGE_KEY, originalLocale);
}
