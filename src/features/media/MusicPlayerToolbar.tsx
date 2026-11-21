import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Heart, Languages, Repeat, Repeat1, Settings2, Shuffle, Volume2, VolumeX } from "lucide-react";
import { useTranslation } from "../../i18n";
import { cycleMediaRepeat, setMediaVolume, toggleMediaShuffle, type MediaState } from "./api";
import "./MusicPlayerToolbar.css";
import type { MusicModuleGeometry } from "./musicModuleGeometry";
import { placeMusicElement } from "./MusicCustomLayout";

/** Capability-aware secondary actions around the primary transport. */
export function MusicPlayerToolbar({ mediaState, transport, hasTranslation, showTranslation, onTranslationChange, onOpenSettings, translationDisabledHint, geometry }: {
  mediaState: MediaState; transport: ReactNode; hasTranslation: boolean; showTranslation: boolean;
  onTranslationChange: (show: boolean) => void; onOpenSettings: () => void;
  translationDisabledHint?: string;
  geometry?: MusicModuleGeometry;
}) {
  const t = useTranslation();
  const text = t.music.toolbar;
  const volumeId = useId();
  const [volumeOpen, setVolumeOpen] = useState(false);
  const [draftVolume, setDraftVolume] = useState<number | null>(null);
  const [answer, setAnswer] = useState<MediaState | null>(null);
  const [error, setError] = useState(false);
  const pending = useRef(false);
  const volumePending = useRef(false);
  const queuedVolume = useRef<number | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; queuedVolume.current = null; };
  }, []);
  const state = answer && answer.activeSessionId === mediaState.activeSessionId && answer.updatedAt >= mediaState.updatedAt ? answer : mediaState;
  const volume = draftVolume ?? state.volume;
  const canVolume = Number.isFinite(state.volume) && state.volume >= 0 && state.volume <= 1;
  const ShuffleIcon = state.shuffleActive ? Shuffle : state.repeatMode === "track" ? Repeat1 : Repeat;
  const modeLabel = state.shuffleActive ? text.shuffle : state.repeatMode === "track" ? text.repeatOne : state.repeatMode === "list" ? text.repeat : text.normal;
  const canMode = state.canShuffle || state.canRepeat;
  const run = async (command: () => Promise<MediaState>) => {
    if (pending.current) return;
    pending.current = true;
    setError(false);
    try { setAnswer(await command()); }
    catch { setError(true); }
    finally { pending.current = false; }
  };
  const mode = () => void run(async () => {
    const target = state.activeSessionId ?? undefined;
    // With both capabilities, cycle normal → shuffle → list → track → normal.
    if (state.canShuffle && !state.shuffleActive && (state.repeatMode === "none" || state.repeatMode === "unknown")) return toggleMediaShuffle(target);
    if (state.canShuffle && state.shuffleActive) {
      const next = await toggleMediaShuffle(target);
      return state.canRepeat ? cycleMediaRepeat(target) : next;
    }
    return cycleMediaRepeat(target);
  });
  const commitVolume = () => {
    if (draftVolume === null) return;
    queuedVolume.current = draftVolume;
    setDraftVolume(null);
    if (volumePending.current) return;
    volumePending.current = true;
    setError(false);
    // Volume is independent of mode changes; retain the last drag while a write is pending.
    void (async () => {
      try {
        while (alive.current && queuedVolume.current !== null) {
          const next = queuedVolume.current;
          queuedVolume.current = null;
          try {
            const response = await setMediaVolume(next);
            if (alive.current) setAnswer(current => !current || response.updatedAt >= current.updatedAt ? response : current);
          } catch { if (alive.current) setError(true); }
        }
      } finally { volumePending.current = false; }
    })();
  };
  const volumeRect = geometry?.elements.find(rect => rect.element === 'volume');
  const popupStyle = geometry && volumeRect ? { top: Math.min(geometry.height - 72,
    volumeRect.y > 76 ? volumeRect.y - 72 : volumeRect.y + volumeRect.height), bottom: 'auto' } : undefined;
  return <div className="music-player__toolbar">
    <div className="music-player__tools">
      {placeMusicElement(geometry, 'mode', <span title={canMode ? modeLabel : text.unsupportedMode}>
        <button className="music-icon-button" type="button" data-music-action="mode" aria-label={`${text.mode}: ${modeLabel}`}
          disabled={!canMode} aria-pressed={Boolean(state.shuffleActive || state.repeatMode === "track")} onClick={mode}>
          <ShuffleIcon size={19} strokeWidth={1.8} />
        </button>
      </span>)}
      {placeMusicElement(geometry, 'favorite', <span title={text.unsupportedFavorite}><button className="music-icon-button" type="button" data-music-action="favorite"
        aria-label={`${text.favorite}: ${text.unsupportedFavorite}`} disabled><Heart size={19} strokeWidth={1.8} /></button></span>)}
      {placeMusicElement(geometry, 'volume', <button className="music-icon-button" type="button" data-music-action="volume" aria-label={text.volume}
        disabled={!canVolume} title={canVolume ? text.volume : text.unavailableVolume}
        aria-expanded={volumeOpen && canVolume} aria-controls={volumeId} onClick={() => setVolumeOpen(!volumeOpen)}>
        {volume > 0 ? <Volume2 size={19} strokeWidth={1.8} /> : <VolumeX size={19} strokeWidth={1.8} />}
      </button>)}
    </div>
    {transport}
    <div className="music-player__tools music-player__tools--end">
      {placeMusicElement(geometry, 'translate', <span title={translationDisabledHint ?? (hasTranslation ? text.translation : text.noTranslation)}><button className="music-icon-button" type="button"
        data-music-action="translation" aria-label={text.translation} aria-pressed={showTranslation && hasTranslation}
        disabled={!hasTranslation} onClick={() => onTranslationChange(!showTranslation)}><Languages size={19} strokeWidth={1.8} /></button></span>)}
      {placeMusicElement(geometry, 'settings', <button className="music-icon-button" type="button" aria-label={t.music.openSettings} onClick={onOpenSettings}><Settings2 size={19} strokeWidth={1.8} /></button>)}
    </div>
    {volumeOpen && canVolume && <div className="music-player__volume" id={volumeId} style={popupStyle} onKeyDown={event => { if (event.key === "Escape") setVolumeOpen(false); }}>
      <label htmlFor={`${volumeId}-range`}>{text.volume}<output>{Math.round(volume * 100)}%</output></label>
      <input id={`${volumeId}-range`} type="range" min="0" max="1" step="0.01" value={volume}
        onChange={event => setDraftVolume(Number(event.target.value))} onPointerUp={commitVolume} onKeyUp={commitVolume} onBlur={commitVolume} />
    </div>}
    {error && <p className="music-player__action-error" role="alert">{t.music.controlFailed}</p>}
  </div>;
}
