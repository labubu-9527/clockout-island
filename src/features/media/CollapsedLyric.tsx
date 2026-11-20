import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { MediaState } from "./api";
import { songOffsetKey, wordFill, type LyricWord } from "./lyrics/lrc";
import { lyricClockAt } from "./lyrics/lyricClock";
import { useLyricClock } from "./lyrics/useLyricClock";
import { useLyrics, type LyricsSettings } from "./lyrics/useLyrics";
import { useSongOffset } from "./lyrics/useSongOffset";
import { capsuleGroupMetrics, compactSecondary } from "./compactLyrics";
import "./CollapsedLyric.css";

/** Snapshot the lyric clock on mount; CSS fills every frame without re-rendering the island. */
function CollapsedSungWords({ words, mediaState, offsetMs, playing }: {
  words: LyricWord[]; mediaState: MediaState; offsetMs: number; playing: boolean;
}) {
  const [start] = useState(() => lyricClockAt(null, mediaState, Date.now(), offsetMs).position);
  return words.map((word, index) => {
    const { delayMs, durationMs } = wordFill(word, start);
    const style = { animationDelay: `${delayMs}ms`, animationDuration: `${durationMs}ms`,
      animationPlayState: playing ? "running" : "paused" } as CSSProperties;
    return <span className="collapsed-lyric__word" key={index} style={style}>{word.text}</span>;
  });
}

/**
 * The line being sung, for the collapsed island; the song's title and artist when it has no
 * lyrics or between lines. It wakes on its own for each line, so only this leaf re-renders while a
 * song plays; a new line replaces the last at once (the music page lets it rise in).
 * Keep prefetching while expanded; only the visible leaf drives the line-change clock.
 */
export function CollapsedLyric({
  mediaState,
  lyricsSettings,
  active,
  onGeometry,
}: {
  mediaState: MediaState;
  lyricsSettings: LyricsSettings & { lyricsOffsetMs: number; islandFontPercent?: number; fontFamily?: string };
  active: boolean;
  onGeometry?: (geometry: { width: number; height: number }) => void;
}) {
  const { lines } = useLyrics(mediaState, lyricsSettings);
  const [songOffsetMs] = useSongOffset(lines ? songOffsetKey(mediaState) : null);
  const offsetMs = lyricsSettings.lyricsOffsetMs + songOffsetMs;
  const { index, playing } = useLyricClock(lines, mediaState, offsetMs, active);
  const song = [mediaState.title, mediaState.artist].filter(Boolean).join(" · ");
  const line = lines && index >= 0 ? lines[index] : null;
  const words = lyricsSettings.lyricWordFill === true && line?.text ? line.words : undefined;
  const secondary = line ? compactSecondary(line.text, line.translation, lines?.[index + 1]?.text ?? "") : "";
  const ref = useRef<HTMLSpanElement>(null);
  const primary = line?.text || song;
  const fontPercent = lyricsSettings.islandFontPercent ?? 100;
  const fontFamily = lyricsSettings.fontFamily;
  useLayoutEffect(() => {
    if (!active || !ref.current || !onGeometry) return;
    const context = document.createElement('canvas').getContext('2d');
    if (!context) return;
    const style = getComputedStyle(ref.current);
    context.font = `500 ${style.fontSize} ${style.fontFamily}`;
    const first = context.measureText(primary).width;
    const font = parseFloat(style.fontSize);
    context.font = `400 ${Math.max(9, Math.min(11.5, font * 0.78))}px ${style.fontFamily}`;
    const second = context.measureText(secondary).width;
    const metrics = capsuleGroupMetrics(font, window.devicePixelRatio || 1);
    onGeometry({ width: Math.max(140, Math.min(420, Math.ceil(Math.max(first, second) + 76))),
      height: secondary ? metrics.height : Math.max(40, metrics.primary + 6) });
  }, [active, primary, secondary, fontPercent, fontFamily, onGeometry]);

  return (
    <span ref={ref} className={`collapsed-lyric${secondary ? " collapsed-lyric--double" : ""}`}>
      <span className="collapsed-lyric__primary">{words ? <CollapsedSungWords
      key={`${index}:${mediaState.updatedAt}:${offsetMs}:${active}:${playing}`}
      words={words} mediaState={mediaState} offsetMs={offsetMs} playing={playing && active}
    /> : line?.text || song}</span>
      {secondary && <span className="collapsed-lyric__secondary">{secondary}</span>}
    </span>
  );
}
