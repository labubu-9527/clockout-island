import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { mockIPC } from '@tauri-apps/api/mocks';
import { I18nProvider } from '../../src/i18n';
import { DEFAULT_SETTINGS, normalizeSettings } from '../../src/features/appearance/settings';
import { saveSettings, STORAGE_KEY } from '../../src/features/appearance/storage';
import { MusicCanvasEditor } from '../../src/features/media/MusicCanvasEditor';
import { MusicPlayerPanel } from '../../src/features/media/MusicPlayerPanel';
import { DEFAULT_MEDIA_STATE } from '../../src/features/media/mediaState';
import '../../src/styles/tokens.css';
import '../../src/styles/base.css';

Object.assign(globalThis, {IS_REACT_ACT_ENVIRONMENT: true});
const ipc: string[] = [];
mockIPC(command => { ipc.push(command); return command === 'get_media_diagnostics' ? {players: []} : null; });
const fixture = document.getElementById('root')!;
const root = createRoot(fixture);
const results = document.getElementById('results')!;
const previous = localStorage.getItem(STORAGE_KEY);
let settings = {...DEFAULT_SETTINGS, musicCustomLayout: {...DEFAULT_SETTINGS.musicCustomLayout, enabled: true}};
let plays = 0;
const media = {...DEFAULT_MEDIA_STATE, available: true, title: 'Test track', artist: 'Artist',
  durationMs: 180000, canSeek: true, volume: 0.5};
function Editor() {
  const [current, update] = useState(settings);
  return <MusicCanvasEditor layout={current.musicCustomLayout} fontScale={1} onChange={musicCustomLayout => {
    settings = {...current, musicCustomLayout}; saveSettings(settings); update(settings);
  }}/>;
}
const get = <T extends HTMLElement>(selector: string) => fixture.querySelector<T>(selector)!;
const assert = (value: unknown, label: string) => { if (!value) throw new Error(label); };
function point(el: HTMLElement, type: string, x: number, y: number) {
  return act(async () => { el.dispatchEvent(new PointerEvent(type, {pointerId: 3, clientX: x, clientY: y, bubbles: true})); });
}
function key(el: HTMLElement, value: string) {
  return act(async () => { el.dispatchEvent(new KeyboardEvent('keydown', {key: value, bubbles: true})); });
}
async function setField(name: string, value: number) {
  const input = get<HTMLInputElement>(`[data-field="${name}"]`);
  await act(async () => {input.focus(); input.value = String(value); input.blur();});
}
try {
  fixture.style.width = '320px';
  await act(async () => root.render(<I18nProvider><Editor/></I18nProvider>));
  const play = get('[data-editor-element="play"]');
  const start = play.getBoundingClientRect();
  await point(play, 'pointerdown', start.x + 10, start.y + 10);
  await point(play, 'pointermove', start.x - 15, start.y + 120);
  await point(play, 'pointerup', start.x - 15, start.y + 120);
  const first = settings.musicCustomLayout.elements!.find(p => p.element === 'play')!;
  assert(first.x < 203 && first.y > 300, 'Pointer moves play target in design coordinates');
  await key(play, 'ArrowRight');
  assert(settings.musicCustomLayout.elements![0].x === first.x + 1, 'Arrow key moves one design pixel');
  const progress = get('[data-editor-element="progress"]');
  await act(async () => progress.click());
  await setField('width', 225);
  await setField('x', 56);
  await setField('y', 270);
  const saved = normalizeSettings(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).musicCustomLayout;
  const bar = saved.elements!.find(p => p.element === 'progress')!;
  assert(bar.width === 225 && bar.x === 56 && bar.y === 270, 'Numeric edit survives save and normalize');
  assert(ipc.length === 0 && plays === 0, 'Canvas interaction is inert');
  for (const width of [320, 520]) for (const font of [100, 120, 150]) {
    fixture.style.width = width + 'px';
    fixture.style.setProperty('--island-font-scale', String(font / 100));
    await act(async () => root.render(<I18nProvider><MusicPlayerPanel customLayout={saved}
      mediaState={media} isTrackChanging={false} commandError={null} onPlayPause={() => plays++}
      onNext={() => {}} onPrevious={() => {}} onOpenSettings={() => {}} onSeek={() => {}}
      lyricsSettings={{lyricsFolder: '', lyricsOnline: false, lyricsOffsetMs: 0, islandFontPercent: font}}/></I18nProvider>));
    const frame = get('.music-free').getBoundingClientRect();
    const playButton = get<HTMLButtonElement>('[data-music-element="play"] button');
    const button = playButton.getBoundingClientRect();
    assert(Math.abs(button.x - frame.x - (first.x + 1) * width / 400) < 1 && button.y === frame.y + first.y,
      `Playback action is at the saved position ${width}/${font}`);
    assert(frame.bottom >= button.bottom && button.width > 20, 'Measured height includes lowest actionable element');
    const bounds = get('.music-progress__hit').getBoundingClientRect();
    assert(Math.abs(bounds.width - 225 * width / 400) < 1 && Math.abs(bounds.x - frame.x - 56 * width / 400) < 1,
      'Seek target follows visible progress width and position');
    assert(document.elementFromPoint(button.x + button.width / 2, button.y + button.height / 2)?.closest('button') === playButton,
      'Actual play target receives pointer hit');
    await act(async () => playButton.click());
    assert(get<HTMLButtonElement>('[data-music-action="favorite"]').disabled, 'Favorite stays disabled');
    const volume = get('[data-music-action="volume"]');
    await act(async () => volume.click());
    const pop = get('.music-player__volume').getBoundingClientRect();
    assert(pop.top >= frame.top && pop.bottom <= frame.bottom, 'Volume popup remains inside custom layout');
    await act(async () => volume.click());
  }
  assert(plays === 6, 'Real play handler fires at all sizes');
  for (const width of [320, 520]) for (const scale of [0.85, 1, 1.2]) {
    fixture.style.width = `${width}px`;
    fixture.style.transform = `scale(${scale})`;
    fixture.style.transformOrigin = 'top left';
    await act(async () => root.render(<I18nProvider><Editor key={`${width}-${scale}`}/></I18nProvider>));
    const cover = get('[data-editor-element="cover"]');
    const before = cover.getBoundingClientRect();
    await point(cover, 'pointerdown', before.x + 5, before.y + 5);
    await point(cover, 'pointermove', before.x + 25, before.y + 25);
    await point(cover, 'pointerup', before.x + 25, before.y + 25);
    const after = cover.getBoundingClientRect();
    assert(Math.abs(after.x - before.x - 20) < 1.5 && Math.abs(after.y - before.y - 20) < 1.5,
      `Scaled editor follows the pointer by 20 screen pixels at width ${width}, scale ${scale} (${after.x - before.x}/${after.y - before.y})`);
  }
  fixture.style.transform = '';
  results.textContent = 'PASS drag, keyboard, width, persistence, hit testing, font scaling, popup, native floor';
  document.documentElement.dataset.testResult = 'passed';
} catch (error) {
  results.textContent = 'FAIL ' + String(error);
  document.documentElement.dataset.testResult = 'failed';
} finally {
  if (previous === null) localStorage.removeItem(STORAGE_KEY); else localStorage.setItem(STORAGE_KEY, previous);
}
