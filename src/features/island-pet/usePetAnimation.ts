import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPetAnimation, stepPetAnimation, type PetAnimation } from "./petAnimation";
import type { PetState } from "./petState";

const subscribeVisibility = (notify: () => void) => {
  document.addEventListener("visibilitychange", notify);
  return () => document.removeEventListener("visibilitychange", notify);
};
const visibleSnapshot = () => document.visibilityState !== "hidden";
const motionQuery = () => matchMedia("(prefers-reduced-motion: reduce)");
const subscribeMotion = (notify: () => void) => {
  const query = motionQuery();
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
};
const motionSnapshot = () => motionQuery().matches;
const snapshot = (pet: PetAnimation): PetAnimation => ({ ...pet, eyes: pet.eyes.map((eye) => ({ ...eye })), clip: pet.clip ? { ...pet.clip } : null });

export function usePetAnimation(state: PetState, active: boolean, hovered: boolean) {
  const visible = useSyncExternalStore(subscribeVisibility, visibleSnapshot, () => false);
  const reduced = useSyncExternalStore(subscribeMotion, motionSnapshot, () => true);
  const model = useRef(createPetAnimation());
  const [pet, setPet] = useState(createPetAnimation);
  useEffect(() => {
    if (!active || !visible) return;
    const current = model.current;
    if (reduced) {
      stepPetAnimation(current, state, 1, true, hovered, false);
      setPet(snapshot(current));
      return;
    }
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      // Stalled compositor frames must not skip a whole expression after resume.
      stepPetAnimation(current, state, Math.min((now - last) / 1000, 0.1), true, hovered);
      last = now;
      setPet(snapshot(current));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, hovered, reduced, state, visible]);
  return { pet, reduced, visible };
}
