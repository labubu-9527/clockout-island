import { useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { Disc3, Heart, Languages, Play, Repeat, RotateCcw, Settings2, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { useTranslation } from '../../i18n';
import { SettingsGroup } from '../../components/settings/SettingsGroup';
import { canResizeMusicElement, DESIGN_WIDTH, MAX_ELEMENT_Y, normalizeMusicCustomLayout,
  type MusicCustomLayout, type MusicElement, type MusicPlacement } from '../appearance/musicCustomLayout';
import { musicModuleGeometry, musicRectStyle, type MusicRect } from './musicModuleGeometry';
import './MusicCanvasEditor.css';

type Drag = { rect: MusicRect; id: number; startX: number; startY: number; ratioX: number; ratioY: number };
const icons = {cover: Disc3, mode: Repeat, favorite: Heart, translate: Languages, settings: Settings2,
  previous: SkipBack, play: Play, next: SkipForward, volume: Volume2};
const arrows: Record<string, [number, number]> = { ArrowLeft: [-1,0], ArrowRight: [1,0], ArrowDown: [0,1], ArrowUp: [0,-1] };

export function MusicCanvasEditor({ layout, fontScale, onChange }: {
  layout: MusicCustomLayout; fontScale: number; onChange: (layout: MusicCustomLayout) => void;
}) {
  const {music} = useTranslation();
  const text = music.canvas;
  const labels: Record<MusicElement, string> = {cover: music.modules.cover, title: text.track, artist: text.artist,
    lyrics: music.modules.labels.lyrics, translation: music.modules.labels.translation, status: music.toolbar.playing,
    progress: music.progress, mode: music.toolbar.mode, favorite: music.toolbar.unsupportedFavorite, volume: music.toolbar.volume,
    previous: music.previousTrack, play: music.play, next: music.nextTrack, translate: music.toolbar.translation, settings: music.openSettings};
  const [choice, setChoice] = useState<MusicElement>('title');
  const [draft, setDraft] = useState<MusicPlacement | null>(null);
  const drag = useRef<Drag | null>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const withPlacement = (p: MusicPlacement) => normalizeMusicCustomLayout({...layout,
    elements: [...(layout.elements ?? []).filter(item => item.element !== p.element), p]});
  const geometry = musicModuleGeometry(draft ? withPlacement(draft) : layout, {fontScale, hasLyrics: true, hasProgress: true});
  const selected = geometry.elements.find(rect => rect.element === choice) ?? geometry.elements[0];
  const changed = (rect: MusicRect, x: number, y: number, width = rect.width): MusicPlacement => ({
    element: rect.element, x: Math.max(0, Math.min(DESIGN_WIDTH - width, x)), y,
    ...(canResizeMusicElement(rect.element) && {width}),
  });
  const pointerPosition = (event: PointerEvent, d: Drag) => changed(d.rect,
    d.rect.x + (event.clientX - d.startX) * d.ratioX, d.rect.y + (event.clientY - d.startY) * d.ratioY);
  const cancel = () => { drag.current = null; setDraft(null); };
  const field = (key: 'x' | 'y' | 'width', label: string, min: number, max: number) =>
    <label>{label}<input key={`${selected.element}-${selected[key]}`} type="number" min={min} max={max}
      data-field={key} defaultValue={selected[key]} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }}
      onBlur={event => {
        const input = event.currentTarget;
        if (!Number.isFinite(input.valueAsNumber)) { input.value = String(selected[key]); return; }
        const value = Math.max(min, Math.min(max, Math.round(input.valueAsNumber)));
        input.value = String(value);
        if (value !== selected[key]) {
          const next = {...selected, [key]: value};
          onChange(withPlacement(changed(next, next.x, next.y)));
        }
      }} /></label>;
  return <SettingsGroup title={text.title} action={<button type="button" className="music-modules-reset"
    disabled={!layout.elements?.length} onClick={() => onChange(normalizeMusicCustomLayout({...layout, elements: []}))}>{text.resetAll}</button>}>
    <div className="music-editor">
      <div className="music-editor__canvas" ref={canvas} style={{height: geometry.height + 26, '--editor-scale': fontScale} as CSSProperties}>
        {geometry.elements.map(rect => {
          const {element} = rect;
          const Icon = element in icons ? icons[element as keyof typeof icons] : undefined;
          return <button type="button" key={element} data-editor-element={element} style={musicRectStyle(rect)}
            aria-label={labels[element]} title={labels[element]} aria-pressed={element === selected.element}
            onFocus={() => setChoice(element)} onClick={() => setChoice(element)}
            onPointerDown={event => {
              if (event.button !== 0 || drag.current || !canvas.current) return;
              const bounds = canvas.current.getBoundingClientRect();
              if (bounds.width <= 0 || bounds.height <= 0) return;
              setChoice(element);
              // Pointer deltas are in the transformed viewport; saved Y stays in logical pixels.
              drag.current = {rect, id: event.pointerId, startX: event.clientX, startY: event.clientY,
                ratioX: DESIGN_WIDTH / bounds.width, ratioY: canvas.current.clientHeight / bounds.height};
              try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* synthetic or expired pointer */ }
            }}
            onPointerMove={event => {
              const d = drag.current;
              if (d?.id === event.pointerId) setDraft(pointerPosition(event, d));
            }}
            onPointerUp={event => {
              const d = drag.current;
              if (d?.id !== event.pointerId) return;
              if (event.clientX !== d.startX || event.clientY !== d.startY) onChange(withPlacement(pointerPosition(event, d)));
              cancel();
            }} onPointerCancel={cancel} onLostPointerCapture={cancel}
            onKeyDown={event => {
              const delta = arrows[event.key];
              if (!delta) return;
              event.preventDefault();
              const step = event.shiftKey ? 10 : 1;
              onChange(withPlacement(changed(rect, rect.x + delta[0] * step, rect.y + delta[1] * step)));
            }}>
            {Icon ? <Icon size={element === 'cover' ? 32 : 18} aria-hidden="true" /> :
              element === 'progress' ? <span className="music-editor__progress"><i/><small>0:42</small><small>3:24</small></span> : labels[element]}
          </button>;
        })}
      </div>
      <div className="music-editor__inspector">
        <select aria-label={text.selection} value={selected.element} onChange={event => setChoice(event.target.value as MusicElement)}>
          {geometry.elements.map(rect => <option key={rect.element} value={rect.element}>{labels[rect.element]}</option>)}
        </select>
        {field('x', 'X', 0, DESIGN_WIDTH - selected.width)}{field('y', 'Y', 0, MAX_ELEMENT_Y)}
        {canResizeMusicElement(selected.element) && field('width', text.width, 24, DESIGN_WIDTH)}
        <button type="button" aria-label={text.reset} title={text.reset}
          disabled={!layout.elements?.some(p => p.element === selected.element)} onClick={() =>
            onChange(normalizeMusicCustomLayout({...layout, elements: layout.elements?.filter(p => p.element !== selected.element)}))}>
          <RotateCcw size={15} aria-hidden="true"/></button>
      </div>
    </div>
  </SettingsGroup>;
}
