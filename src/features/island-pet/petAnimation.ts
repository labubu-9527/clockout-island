// Adapted from xiaotang-daozai pet.rs / pet_expressions.rs (MIT, src/assets/pet/LICENSE).
import type { PetState } from "./petState";

export const EXPRESSIONS = ["wink", "smug", "blush", "delighted", "side-glance", "praised", "heart", "giggle", "shy-peek", "scan", "peek", "search"] as const;
export type Expression = typeof EXPRESSIONS[number];
export type MusicPose = "microphone" | "hum" | "sideSing" | "squint" | "highNote" | "smile";
const TIMES = [0.35, 0.12, 0.12, 0.12, 0.13, 0.13, 0.14, 0.4, 0.18, 0.14, 0.12, 0.12, 0.12, 0.14, 0.14, 0.45];
const LOOK_TIMES = [0.35, 0.13, 0.15, 0.18, 0.35, 0.28, 0.16, 0.11, 0.11, 0.16, 0.35, 0.28, 0.16, 0.14, 0.2, 0.35];
const MUSIC: Expression[] = ["wink", "delighted", "smug", "blush", "heart", "scan", "side-glance", "giggle", "praised", "peek", "shy-peek", "search"];
const POSES: MusicPose[] = ["microphone", "hum", "sideSing", "squint", "highNote", "smile"];
const IDLE: Expression[] = ["scan", "delighted", "peek", "smug", "search", "giggle", "praised", "shy-peek"];
const HOVER: Expression[] = ["wink", "blush", "side-glance", "shy-peek"];
const frameTimes = (expression: Expression) => EXPRESSIONS.indexOf(expression) >= 9 ? LOOK_TIMES : TIMES;
export const expressionDuration = (expression: Expression) => frameTimes(expression).reduce((sum, time) => sum + time, 0);
export function expressionFrame(expression: Expression, time: number) {
  let end = 0;
  const times = frameTimes(expression);
  for (let index = 0; index < times.length; index++) {
    end += times[index];
    if (time < end) return index;
  }
  return 15;
}

export function musicSegment(age: number): { pose: MusicPose; elapsed: number; expression: Expression | null; time: number } {
  const cycle = MUSIC.reduce((sum, expression) => sum + 16 + expressionDuration(expression), 0);
  let time = age % cycle;
  for (const [index, expression] of MUSIC.entries()) {
    const pose = POSES[index % POSES.length];
    if (time < 16) return { pose, elapsed: time, expression: null, time: 0 };
    time -= 16;
    if (time < expressionDuration(expression)) return { pose, elapsed: 16, expression, time };
    time -= expressionDuration(expression);
  }
  return { pose: "microphone", elapsed: 0, expression: null, time: 0 };
}

export interface Eye { height: number; spread: number; curve: number; y: number; tilt: number }
const open = (height = 4.4): Eye => ({ height, spread: 0, curve: 0, y: 0, tilt: 0 });
const arc = (spread: number, curve: number): Eye => ({ ...open(0), spread, curve });
export interface PetAnimation {
  state: PetState; age: number; time: number; musicAge: number;
  eyes: Eye[]; gaze: [number, number]; y: number;
  clip: { expression: Expression; time: number } | null;
  wait: number; cooldown: number; hovered: boolean; nextIdle: number; nextHover: number;
}
export function createPetAnimation(): PetAnimation {
  return { state: "idle", age: 0, time: 0, musicAge: 0, eyes: [open(), open()], gaze: [0, 0], y: 0,
    clip: null, wait: 8, cooldown: 0, hovered: false, nextIdle: 0, nextHover: 0 };
}
export const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const approach = (current: number, target: number, rate: number, dt: number) => current + (target - current) * (1 - Math.exp(-rate * dt));
function hash01(n: number) {
  let x = BigInt.asUintN(64, BigInt(n) * 0x9E3779B97F4A7C15n);
  x ^= x >> 31n;
  x = BigInt.asUintN(64, x * 0xBF58476D1CE4E5B9n);
  x ^= x >> 29n;
  return Number(x >> 40n) / 2 ** 24;
}

/** No elapsed time is consumed while the island or document is hidden. */
export function stepPetAnimation(pet: PetAnimation, state: PetState, dt: number, visible: boolean, hovered: boolean, animate = true) {
  if (!visible) return;
  if (pet.state !== state) { pet.state = state; pet.age = 0; pet.clip = null; }
  pet.age += dt;
  pet.time += dt;
  if (state === "music") {
    pet.musicAge += dt;
    const segment = musicSegment(pet.musicAge);
    pet.clip = segment.expression ? { expression: segment.expression, time: segment.time } : null;
  } else if (state === "idle") {
    pet.cooldown = Math.max(0, pet.cooldown - dt);
    if (pet.clip) {
      pet.clip.time += dt;
      if (pet.clip.time >= expressionDuration(pet.clip.expression)) {
        pet.clip = null;
        pet.wait = 22 + pet.nextIdle % 4 * 3;
      }
    }
    if (hovered && !pet.hovered && pet.cooldown <= 0 && !pet.clip) {
      pet.clip = { expression: HOVER[pet.nextHover++ % HOVER.length], time: 0 };
      pet.cooldown = 18;
    }
    if (!hovered && !pet.clip && animate) {
      pet.wait -= dt;
      if (pet.wait <= 0) pet.clip = { expression: IDLE[pet.nextIdle++ % IDLE.length], time: 0 };
    }
  } else { pet.clip = null; pet.wait = 8; pet.cooldown = 0; }
  pet.hovered = hovered;
  let eyes = [open(), open()];
  let y = Math.sin(pet.time * 1.7) * 0.35;
  let look: [number, number] = [0, 0];
  if (state === "idle" && hovered) {
    eyes[0].height = 5.6; eyes[1].height = 6.3;
    eyes[0].y = 0.6; eyes[1].y = -0.6;
  } else if (state === "music") {
    const sway = Math.sin(pet.musicAge * 1.4);
    y = -0.5 + sway * 0.25;
    switch (musicSegment(pet.musicAge).pose) {
      case "microphone": eyes = [arc(2.5, 0.7), arc(2.5, 0.7)]; break;
      case "hum": eyes = [arc(2.5, 0.7), arc(2.5, 0.7)]; y = sway * 0.3; break;
      case "sideSing": eyes = [open(1.6), open(1.6)]; eyes[0].y = -0.5; eyes[1].y = 0.5; look = [0.4, 0]; y = sway * 0.35; break;
      case "squint": eyes = [arc(1.6, 0), arc(1.6, 0)]; y = sway * 0.45; break;
      case "highNote": eyes = [arc(2.3, -0.7), arc(2.3, -0.7)]; eyes[0].tilt = -0.3; eyes[1].tilt = 0.3; y = -1.5 + sway * 0.2; break;
      case "smile": eyes = [arc(2.3, -0.8), arc(2.3, -0.8)]; eyes[0].y = -0.5; eyes[1].y = 0.5; look = [sway * 0.5, 0]; break;
    }
  } else if (state === "agentAttention") {
    eyes = [{ ...open(2.8), spread: -0.6, tilt: -0.7, y: 0.4 }, { ...open(1.8), spread: 0.6, tilt: 0.7, y: 1 }];
  } else if (state === "agentWorking" || state === "focused") { eyes = [open(1.8), open(1.8)]; y = 0; }
  else if (state === "notice") { eyes = [arc(2.6, -1.8), arc(2.6, -1.8)]; y = -Math.abs(Math.sin(pet.age * 7.5)) * 2 * Math.exp(-pet.age * 0.65); }
  if (pet.clip) { eyes = [open(), open()]; look = [0, 0]; y = 0; }
  if (!pet.clip && state !== "music" && state !== "notice") {
    const start = 2 + hash01(Math.floor(pet.time / 5.6)) * 2.7;
    const blink = (pet.time % 5.6 - start) / 0.18;
    if (blink >= 0 && blink < 1) for (const eye of eyes) eye.height *= 1 - Math.sin(blink * Math.PI);
  }
  const eyeDt = state === "music" ? dt * 0.2 : dt;
  for (let i = 0; i < 2; i++) for (const key of ["height", "spread", "curve", "y", "tilt"] as const) {
    pet.eyes[i][key] = approach(pet.eyes[i][key], eyes[i][key], key === "y" || key === "tilt" ? 12 : 17, eyeDt);
  }
  pet.gaze = [approach(pet.gaze[0], look[0], 10, dt), approach(pet.gaze[1], look[1], 10, dt)];
  pet.y = approach(pet.y, y, 14, dt);
}
