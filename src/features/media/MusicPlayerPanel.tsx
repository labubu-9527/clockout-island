import { useLayoutEffect, useState, type CSSProperties } from "react";
import { Music2, Pause, Play, RefreshCcw, SkipBack, SkipForward } from "lucide-react";
import { useTranslation } from "../../i18n";
import type { MediaState } from "./api";
import { MusicEqualizer } from "./MusicEqualizer";
import { MusicIdle } from "./MusicIdle";
import { MusicProgress } from "./MusicProgress";
import { useArtworkPalette } from "./useArtworkPalette";
import { LyricsView } from "./lyrics/LyricsView";
import { useLyrics, type LyricsSettings } from "./lyrics/useLyrics";
import { LyricsOffsetControl } from "./lyrics/LyricsOffsetControl";
import { songOffsetKey } from "./lyrics/lrc";
import { suggestsChineseSources } from "./lyrics/chineseHint";
import { useSongOffset } from "./lyrics/useSongOffset";
import "./MusicPlayerPanel.css";
import { hasTimeline } from "./trackClock";
import { useMediaDiagnostics } from "./useMediaDiagnostics";
import { MediaNotice, MediaNoticeButton, useMediaNotice } from "./MediaNotice";
import { MusicPlayerToolbar } from "./MusicPlayerToolbar";
import { musicLayoutVariables, type MusicLayout } from "./musicLayouts";
import "./MusicLayouts.css";
import { normalizeMusicCustomLayout, type MusicCustomLayout } from "../appearance";
import { musicModuleGeometry } from "./musicModuleGeometry";
import { MusicCustomLayout as CustomMusicContent } from "./MusicCustomLayout";

const NO_LYRICS = { lyricsFolder: "", lyricsOnline: false, lyricsOffsetMs: 0 };

type MusicPlayerPanelProps = {
  customLayout?: MusicCustomLayout;
  onContentHeight?: (height: number | null) => void;
  layout?: MusicLayout;
  mediaState: MediaState;
  isTrackChanging: boolean;
  commandError: string | null;
  /** Opens Settings > Music, where lyrics sources are switched on. */
  onOpenSettings: () => void;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  /** Moves playback, from the progress bar; without it the bar is read-only. */
  onSeek?: (positionMs: number) => void;
  onCalibrate?: (positionMs: number) => void;
  /** Where lyrics come from and how far they are moved; without it there are none. */
  lyricsSettings?: LyricsSettings & { lyricsOffsetMs: number; islandFontPercent?: number };
};

/**
 * The music page, drawn straight on the island like the Agent page rather than in a card of its
 * own. Artwork sits left of the title, artist and current lyric. Full-width progress and the
 * capability-aware toolbar follow below. The cover keeps its compact size without lyrics.
 * Artwork supplies the atmosphere and control tint. Nothing playing shows MusicIdle,
 * not an empty player.
 */
export function MusicPlayerPanel({
  customLayout,
  onContentHeight,
  layout = "SideBySide",
  mediaState,
  isTrackChanging,
  commandError,
  onOpenSettings,
  onPlayPause,
  onNext,
  onPrevious,
  onSeek,
  onCalibrate,
  lyricsSettings = NO_LYRICS,
}: MusicPlayerPanelProps) {
  const t = useTranslation();
  const { diagnostics } = useMediaDiagnostics(mediaState.activeSessionId ?? mediaState.sourceApp);
  const currentId = mediaState.activeSessionId ?? mediaState.sourceApp;
  const diagnostic = diagnostics.players.find((player) => player.sourceAppId === currentId)
    ?? (!currentId && !mediaState.title ? diagnostics.players.find((player) => !player.hasSession) : undefined);
  const notice = useMediaNotice(diagnostic);
  const onLyricPosition = !hasTimeline(mediaState) ? onCalibrate : mediaState.canSeek ? onSeek : undefined;
  const isPlaying = mediaState.playbackStatus === "playing";
  const hasTrack = Boolean(mediaState.title);
  const { lines: lyrics, notFound, durationMs: lyricsDurationMs } = useLyrics(mediaState, lyricsSettings);
  const chineseHint = suggestsChineseSources(mediaState, lyricsSettings, notFound);
  const [songOffsetMs, setSongOffsetMs] = useSongOffset(lyrics ? songOffsetKey(mediaState) : null);
  const palette = useArtworkPalette(mediaState.thumbnail);
  const [showTranslation, setShowTranslation] = useState(true);
  const source = mediaState.sessions.find((session) => session.id === mediaState.activeSessionId)?.label ?? mediaState.sourceApp;
  const artist = mediaState.artist || t.music.unknownArtist;
  const custom = normalizeMusicCustomLayout(customLayout);
  const customEnabled = hasTrack && custom.enabled;
  const trackDuration = mediaState.durationMs > 0 ? mediaState.durationMs : lyricsDurationMs;
  const fontScale = (lyricsSettings.islandFontPercent ?? 100) / 100;
  const geometry = musicModuleGeometry(custom, { fontScale, hasLyrics: Boolean(lyrics?.length), hasProgress: trackDuration > 0 });
  const customHeight = customEnabled ? geometry.height : null;
  useLayoutEffect(() => { onContentHeight?.(customHeight); }, [customHeight, onContentHeight]);
  useLayoutEffect(() => () => { onContentHeight?.(null); }, [onContentHeight]);

  const prevDisabled = mediaState.available && !mediaState.canPrevious;
  const nextDisabled = mediaState.available && !mediaState.canNext;
  const className = [
    "music-player",
    customEnabled ? "music-player--custom" : "",
    `music-player--layout-${layout}`,
    lyrics ? "music-player--lyrics" : "",
    isPlaying ? "music-player--playing" : "",
    hasTrack ? "" : "music-player--idle",
  ].filter(Boolean).join(" ");
  const style = { ...musicLayoutVariables(layout), "--music-palette-accent": palette.accent, "--music-palette-light-accent": palette.lightAccent } as CSSProperties;
  const playbackStatus = <span className="music-player__status"><i />{isPlaying ? t.music.toolbar.playing : t.music.toolbar.paused}</span>;
  const lyricContent = lyrics && <div className="music-player__lyrics">
    <LyricsView lines={lyrics} mediaState={mediaState} offsetMs={lyricsSettings.lyricsOffsetMs + songOffsetMs}
      wordFillEnabled={lyricsSettings.lyricWordFill === true} showTranslation={showTranslation} onPosition={onLyricPosition} />
    <LyricsOffsetControl offsetMs={songOffsetMs} onChange={setSongOffsetMs} />
  </div>;
  const progress = <MusicProgress mediaState={mediaState} durationMs={trackDuration} onSeek={onSeek} />;
  const translationHidden = customEnabled && !custom.modules.some(slot => slot.kind === "translation" && slot.visible);
  const toolbar = <MusicPlayerToolbar mediaState={mediaState} hasTranslation={!translationHidden && Boolean(lyrics?.some(line => line.translation))}
    translationDisabledHint={translationHidden ? t.music.modules.hiddenTranslation : undefined}
    showTranslation={showTranslation} onTranslationChange={setShowTranslation} onOpenSettings={onOpenSettings}
    transport={<div className="music-player__controls">
      <button className="music-control-button" type="button" aria-label={t.music.previousTrack} disabled={prevDisabled} onClick={onPrevious}>
        <SkipBack size={22} strokeWidth={1.5} fill="currentColor" />
      </button>
      <button className="music-control-button music-control-button--primary" type="button"
        aria-label={isPlaying ? t.music.pause : t.music.play} aria-busy={isTrackChanging} onClick={onPlayPause}>
        {isTrackChanging ? <RefreshCcw className="music-control-button__track-change" size={22} strokeWidth={2} />
          : isPlaying ? <Pause size={26} strokeWidth={1.5} fill="currentColor" />
            : <Play size={26} strokeWidth={1.5} fill="currentColor" className="music-control-button__play-icon" />}
      </button>
      <button className="music-control-button" type="button" aria-label={t.music.nextTrack} disabled={nextDisabled} onClick={onNext}>
        <SkipForward size={22} strokeWidth={1.5} fill="currentColor" />
      </button>
    </div>} />;
  const customHeader = <header className="music-player__head">
    {custom.showCover && <div className="music-player__cover" aria-hidden="true"><div className="music-player__artwork">
      {mediaState.thumbnail ? <img src={mediaState.thumbnail} alt="" draggable={false} /> : <Music2 size={24} aria-hidden="true" />}
    </div></div>}
    <div className="music-player__meta"><span className="music-player__track">{mediaState.title}</span>
      <span className="music-player__artist">{artist}</span></div>
    {notice.player && <div className="music-player__aside"><MediaNoticeButton open={notice.open} onClick={notice.toggle} /></div>}
  </header>;
  const customLyric = (rowMode: "primary" | "secondary") => lyrics && <div className="music-player__lyrics">
    <LyricsView lines={lyrics} mediaState={mediaState} offsetMs={lyricsSettings.lyricsOffsetMs + songOffsetMs}
      wordFillEnabled={lyricsSettings.lyricWordFill === true} showTranslation={showTranslation} rowMode={rowMode} onPosition={onLyricPosition} />
    {rowMode === "primary" && <LyricsOffsetControl offsetMs={songOffsetMs} onChange={setSongOffsetMs} />}
  </div>;

  return (
    <section className={className} style={style} aria-label={t.music.playerLabel}>
      {hasTrack && mediaState.thumbnail && (
        <div className="music-player__atmosphere" aria-hidden="true">
          <img src={mediaState.thumbnail} alt="" draggable={false} />
        </div>
      )}
      {customEnabled ? <CustomMusicContent geometry={geometry} content={{ header: customHeader, lyrics: customLyric("primary"),
        translation: customLyric("secondary"), status: playbackStatus, progress, controls: toolbar }} /> : hasTrack ? (
        <header className="music-player__head">
          <div className="music-player__cover" aria-hidden="true">
            {mediaState.thumbnail && <img className="music-player__glow" src={mediaState.thumbnail} alt="" draggable={false} />}
            <div className="music-player__artwork">
              {mediaState.thumbnail ? <img src={mediaState.thumbnail} alt="" draggable={false} /> : <Music2 size={24} strokeWidth={1.5} absoluteStrokeWidth />}
            </div>
            {layout === "SideBySide" && playbackStatus}
          </div>
          <div className="music-player__meta">
            <span className="music-player__track">{mediaState.title}</span>
            <span className="music-player__artist">{artist}</span>
            {!lyrics && (chineseHint ? (
              <button className="music-player__lyrics-hint" type="button" aria-label={t.music.lyricsChineseHint.label} onClick={onOpenSettings}>
                {t.music.lyricsChineseHint.text}
              </button>
            ) : (
              <span className="music-player__source">{[mediaState.album, source].filter(Boolean).join(" · ")}</span>
            ))}
          </div>
          {layout !== "SideBySide" && playbackStatus}
          {lyricContent}
          <div className="music-player__aside">
            {notice.player && <MediaNoticeButton open={notice.open} onClick={notice.toggle} />}
            <MusicEqualizer playing={isPlaying} />
          </div>
        </header>
      ) : (
        <MusicIdle onResume={onPlayPause} />
      )}

      {notice.open && notice.player && <MediaNotice player={notice.player} onClose={notice.close} />}

      {commandError && <p className="music-player__error" role="alert">{t.music.controlFailed}</p>}

      {/* A player that reports no length (NetEase Cloud Music) borrows the lyrics source's. */}
      {hasTrack && !customEnabled && progress}
      {hasTrack && !customEnabled && toolbar}
    </section>
  );
}
