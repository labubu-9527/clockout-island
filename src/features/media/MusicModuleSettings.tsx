import { useId, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react';
import { defaultMusicCustomLayout, isRequiredMusicModule, moveMusicModule,
  type IslandSettings, type MusicCustomLayout, type MusicModule } from '../appearance';
import { SettingsGroup } from '../../components/settings/SettingsGroup';
import { SettingsRow } from '../../components/settings/SettingsRow';
import { SettingsToggleRow } from '../../components/settings/SettingsToggleRow';
import { SettingsSwitch } from '../../components/settings/SettingsSwitch';
import { useTranslation } from '../../i18n';
import './MusicModuleSettings.css';

export function MusicModuleSettings({ settings, onSettingsChange }: {
  settings: IslandSettings; onSettingsChange: (settings: IslandSettings) => void;
}) {
  const text = useTranslation().music.modules;
  const id = useId();
  const dragSource = useRef<MusicModule | null>(null);
  const handles = useRef(new Map<MusicModule, HTMLButtonElement>());
  const [dragTarget, setDragTarget] = useState<MusicModule | null>(null);
  const layout = settings.musicCustomLayout;
  const update = (musicCustomLayout: MusicCustomLayout) => onSettingsChange({ ...settings, musicCustomLayout });
  const move = (kind: MusicModule, offset: number) => update(moveMusicModule(layout, kind, offset));
  const endDrag = () => { dragSource.current = null; setDragTarget(null); };

  return <SettingsGroup title={text.title} footer={text.description} action={
    <button type="button" className="music-modules-reset" data-module-action="reset"
      onClick={() => update({ ...defaultMusicCustomLayout(), enabled: layout.enabled })}>{text.reset}</button>
  }>
    <SettingsToggleRow title={text.enabled} checked={layout.enabled}
      onChange={enabled => update({ ...layout, enabled })} />
    {layout.enabled && <>
      <div className="music-modules-cover"><SettingsToggleRow title={text.cover} checked={layout.showCover}
        onChange={showCover => update({ ...layout, showCover })} /></div>
      <p id={`${id}-instructions`} className="music-modules-instructions">{text.reorder}</p>
      <div className="music-modules-list" role="list" aria-label={text.title}>
        {layout.modules.map((slot, index) => {
          const name = text.labels[slot.kind];
          const required = isRequiredMusicModule(slot.kind);
          return <div key={slot.kind} role="listitem" data-music-module={slot.kind}
            className={`music-modules-item${dragTarget === slot.kind ? ' is-drop-target' : ''}`}
            onDragOver={event => {
              if (!dragSource.current) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
              setDragTarget(slot.kind);
            }}
            onDrop={event => {
              event.preventDefault();
              const source = dragSource.current;
              if (source) move(source, index - layout.modules.findIndex(item => item.kind === source));
              endDrag();
            }}>
            <SettingsRow labelFor={`${id}-${slot.kind}`} title={<>{name}
              {required && <span className="music-modules-required">{text.required}</span>}</>}
              control={<div className="music-modules-actions">
                <button type="button" className="music-modules-drag" draggable data-module-action="drag"
                  ref={element => { if (element) handles.current.set(slot.kind, element); else handles.current.delete(slot.kind); }}
                  aria-label={text.move(name)} aria-describedby={`${id}-instructions`}
                  onDragStart={event => {
                    dragSource.current = slot.kind;
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('text/plain', slot.kind);
                  }} onDragEnd={endDrag}
                  onKeyDown={event => {
                    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
                    event.preventDefault();
                    move(slot.kind, event.key === 'ArrowUp' ? -1 : 1);
                    handles.current.get(slot.kind)?.focus();
                  }}><GripVertical size={15} aria-hidden="true" /></button>
                <button type="button" data-module-action="up" disabled={index === 0}
                  aria-label={text.moveUp(name)} title={text.moveUp(name)} onClick={() => move(slot.kind, -1)}>
                  <ArrowUp size={14} aria-hidden="true" /></button>
                <button type="button" data-module-action="down" disabled={index === layout.modules.length - 1}
                  aria-label={text.moveDown(name)} title={text.moveDown(name)} onClick={() => move(slot.kind, 1)}>
                  <ArrowDown size={14} aria-hidden="true" /></button>
                <SettingsSwitch id={`${id}-${slot.kind}`} checked={slot.visible} disabled={required}
                  onChange={visible => update({ ...layout,
                    modules: layout.modules.map(item => item.kind === slot.kind ? { ...item, visible } : item) })} />
              </div>} />
          </div>;
        })}
      </div>
    </>}
  </SettingsGroup>;
}
