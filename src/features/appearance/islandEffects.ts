export type MotionCurve = [number, number, number, number];
export type IslandEffectsSettings = {
  musicGlowEnabled: boolean;
  timerGlowEnabled: boolean;
  updateGlowEnabled: boolean;
  musicGlowMode: "breath" | "rhythm";
  motionMode: "curve" | "spring";
  motionDuration: number;
  motionCollapseDuration: number;
  motionCurve: MotionCurve;
  springMass: number;
  springStiffness: number;
  springDamping: number;
  /** Null retains the full-pill corner used by existing installations. */
  pillCornerRadius: number | null;
};

export const DEFAULT_ISLAND_EFFECTS: IslandEffectsSettings = {
  musicGlowEnabled: false, timerGlowEnabled: false, updateGlowEnabled: false,
  musicGlowMode: "breath", motionMode: "spring", motionDuration: 480,
  motionCollapseDuration: 440, motionCurve: [0.2, 0, 0, 1],
  springMass: 1, springStiffness: 380, springDamping: 2 * 0.82 * Math.sqrt(380),
  pillCornerRadius: null,
};

const bounded = (value: unknown, fallback: number, min: number, max: number) =>
  typeof value === "number" && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;

export function normalizeIslandEffects(value: Partial<IslandEffectsSettings> | null | undefined): IslandEffectsSettings {
  const d = DEFAULT_ISLAND_EFFECTS;
  const curve = Array.isArray(value?.motionCurve) && value.motionCurve.length === 4
    ? value.motionCurve.map((item, index) => bounded(item, d.motionCurve[index], 0, 1)) as MotionCurve : [...d.motionCurve] as MotionCurve;
  return {
    musicGlowEnabled: value?.musicGlowEnabled === true, timerGlowEnabled: value?.timerGlowEnabled === true,
    updateGlowEnabled: value?.updateGlowEnabled === true,
    musicGlowMode: value?.musicGlowMode === "rhythm" ? "rhythm" : "breath",
    motionMode: value?.motionMode === "curve" ? "curve" : "spring",
    motionDuration: bounded(value?.motionDuration, d.motionDuration, 250, 1200),
    motionCollapseDuration: bounded(value?.motionCollapseDuration, d.motionCollapseDuration, 150, 700),
    motionCurve: curve, springMass: bounded(value?.springMass, d.springMass, 0.3, 2),
    springStiffness: bounded(value?.springStiffness, d.springStiffness, 100, 1000),
    springDamping: bounded(value?.springDamping, d.springDamping, 10, 80),
    pillCornerRadius: typeof value?.pillCornerRadius === "number" && Number.isFinite(value.pillCornerRadius)
      ? bounded(value.pillCornerRadius, 0, 0, 48) : null,
  };
}

export type IslandGlowKind = "off" | "breath" | "rhythm" | "timer" | "update";
export type GlowSpring = { value: number; velocity: number };

/** DotIsle's closed-form spring: retarget without losing velocity, regardless of frame rate. */
export function stepGlowSpring(state: GlowSpring, target: number, dt: number, reduced = false): GlowSpring {
  if (!Number.isFinite(target)) return { value: 0, velocity: 0 };
  if (reduced || !Number.isFinite(state.value) || !Number.isFinite(state.velocity)
    || (Math.abs(state.value - target) < 0.002 && Math.abs(state.velocity) < 0.02)) {
    return { value: target, velocity: 0 };
  }
  if (!Number.isFinite(dt) || dt <= 0) return state;
  const omega = Math.sqrt(380), damping = 0.82, frequency = omega * Math.sqrt(1 - damping ** 2);
  const elapsed = Math.min(dt, 10), a = state.value - target;
  const b = (state.velocity + damping * omega * a) / frequency;
  const decay = Math.exp(-damping * omega * elapsed);
  const cos = Math.cos(frequency * elapsed), sin = Math.sin(frequency * elapsed);
  return {
    value: target + decay * (a * cos + b * sin),
    velocity: decay * (-damping * omega * (a * cos + b * sin) + frequency * (-a * sin + b * cos)),
  };
}
export function fadingGlowKind(previous: IslandGlowKind, requested: IslandGlowKind, finished: boolean): IslandGlowKind {
  return requested === "off" && !finished ? previous : requested;
}
export function islandGlowKind(settings: IslandEffectsSettings, activity: { music: boolean; timer: boolean; updating: boolean; hidden: boolean }): IslandGlowKind {
  if (activity.hidden) return "off";
  if (settings.updateGlowEnabled && activity.updating) return "update";
  if (settings.musicGlowEnabled && activity.music) return settings.musicGlowMode;
  return settings.timerGlowEnabled && activity.timer ? "timer" : "off";
}

/** Envelope follows output peaks, never microphone samples. */
export function glowStrength(kind: IslandGlowKind, timeMs: number, envelope = 0, reduceMotion = false) {
  if (kind === "off") return 0;
  if (kind === "update") return 0.85;
  if (kind === "rhythm") return 0.12 + 0.88 * Math.max(0, Math.min(1, envelope));
  if (reduceMotion) return 0.6;
  return 0.65 + 0.2 * Math.sin(timeMs / 2400 * Math.PI * 2);
}

/** Closed-form damped spring response, sampled to CSS linear() with an exact endpoint. */
export function springResponse(timeSeconds: number, mass: number, stiffness: number, damping: number) {
  const w = Math.sqrt(stiffness / mass), z = damping / (2 * Math.sqrt(stiffness * mass));
  if (z < 1) {
    const wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * timeSeconds) * (Math.cos(wd * timeSeconds) + z * w / wd * Math.sin(wd * timeSeconds));
  }
  if (Math.abs(z - 1) < 0.001) return 1 - (1 + w * timeSeconds) * Math.exp(-w * timeSeconds);
  const root = Math.sqrt(z * z - 1), r1 = -w * (z - root), r2 = -w * (z + root);
  return 1 - (r2 * Math.exp(r1 * timeSeconds) - r1 * Math.exp(r2 * timeSeconds)) / (r2 - r1);
}

export function motionTiming(settings: IslandEffectsSettings, expanded: boolean, linearSupported = true) {
  if (settings.motionMode === "curve" || !linearSupported) return `cubic-bezier(${settings.motionCurve.join(",")})`;
  const duration = expanded ? settings.motionDuration : settings.motionCollapseDuration;
  const points = Array.from({ length: 61 }, (_, index) => index === 60 ? 1
    : Number(springResponse(index / 60 * duration / 1000, settings.springMass, settings.springStiffness, settings.springDamping).toFixed(5)));
  return `linear(${points.join(",")})`;
}

export function curvePoint(curve: MotionCurve, t: number) {
  const blend = (a: number, b: number) => 3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t ** 2 * b + t ** 3;
  return { x: blend(curve[0], curve[2]), y: blend(curve[1], curve[3]) };
}
