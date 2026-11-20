import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { getAudioLevel } from "../../features/media/api";
import { useArtworkPalette } from "../../features/media/useArtworkPalette";
import { getUpdateState, subscribeToUpdate } from "../../features/updater/updaterController";
import { fadingGlowKind, glowStrength, islandGlowKind, stepGlowSpring, type IslandEffectsSettings } from "../../features/appearance/islandEffects";
import "./IslandGlow.css";

/** Leaf-only animation: output metering never schedules a React render of the island. */
export function IslandGlow({ settings, music, timer, hidden, artwork }: {
  settings: IslandEffectsSettings; music: boolean; timer: boolean; hidden: boolean; artwork: string | null;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const visibility = useRef({ value: 0, velocity: 0 });
  const envelope = useRef({ value: 0, velocity: 0 });
  const accent = useArtworkPalette(artwork).primary;
  const updating = useSyncExternalStore(subscribeToUpdate, () => ["downloading", "installing"].includes(getUpdateState().stage));
  const kind = islandGlowKind(settings, { music, timer, hidden, updating });
  const [renderKind, setRenderKind] = useState(kind);
  if (kind !== "off" && renderKind !== kind) setRenderKind(fadingGlowKind(renderKind, kind, false));
  useEffect(() => {
    ref.current?.style.setProperty("--island-halo-color", accent);
  }, [accent]);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    if (kind === "off" && renderKind === "off") return;
    let reduce = preference.matches, frame = 0, last = performance.now();
    let peak = 0, reading = false, cancelled = false;
    const meter = kind === "rhythm" ? window.setInterval(() => {
      if (kind !== "rhythm" || reduce || reading || !isTauri()) return;
      reading = true;
      void getAudioLevel().then(level => { if (!cancelled && level) peak = Math.sqrt(Math.max(0, Math.min(1, level.peak))); })
        .catch(() => { if (!cancelled) peak = 0; }).finally(() => { reading = false; });
    }, 25) : null;
    const animate = (now: number) => {
      const dt = Math.max(0, (now - last) / 1000);
      last = now;
      visibility.current = stepGlowSpring(visibility.current, kind === "off" ? 0 : 1, dt, reduce);
      envelope.current = stepGlowSpring(envelope.current, peak, dt, reduce);
      const strength = Math.max(0, Math.min(1, glowStrength(renderKind, now, envelope.current.value, reduce) * visibility.current.value));
      node.style.setProperty("--island-halo-strength", String(strength));
      node.style.setProperty("--island-halo-phase", `${reduce ? 0 : now / 3800 * 360}deg`);
      if (kind === "off" && visibility.current.value === 0 && visibility.current.velocity === 0) {
        setRenderKind("off");
      } else if (!reduce) frame = requestAnimationFrame(animate);
    };
    const preferenceChanged = () => {
      reduce = preference.matches;
      cancelAnimationFrame(frame);
      last = performance.now();
      animate(last);
    };
    preference.addEventListener("change", preferenceChanged);
    animate(last);
    return () => {
      cancelled = true; cancelAnimationFrame(frame); if (meter !== null) window.clearInterval(meter);
      preference.removeEventListener("change", preferenceChanged);
    };
  }, [kind, renderKind]);
  return <span ref={ref} className="island-halo" data-halo-kind={renderKind} aria-hidden="true">
    {[0, 1, 2, 3, 4].map(layer => <span className="island-halo__stroke" key={layer} />)}
  </span>;
}
