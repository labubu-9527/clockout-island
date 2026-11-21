import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { getMonitorTopClientY } from "./api";
import { moveSwipe, shouldHide, startSwipe } from "./swipeUpToHide";

type Press = {
  id: number;
  handle: HTMLElement;
  island: HTMLElement | null;
  swipe: ReturnType<typeof startSwipe>;
  ceiling: Promise<number | null> | null;
};

export function useWindowDragGesture(disabled: boolean, onWindowDragStart: () => void, onHide?: () => void) {
  const didDragRef = useRef(false);
  const press = useRef<Press | null>(null);
  const generation = useRef(0);
  const rebound = useRef<Animation | null>(null);

  const clear = useCallback(() => {
    rebound.current?.cancel();
    rebound.current = null;
    const active = press.current;
    press.current = null;
    if (!active) return;
    active.island?.style.removeProperty("translate");
    if (active.handle.hasPointerCapture(active.id)) active.handle.releasePointerCapture(active.id);
  }, []);
  const cancel = useCallback(() => { generation.current++; clear(); }, [clear]);
  useEffect(() => {
    window.addEventListener("blur", cancel);
    return () => { window.removeEventListener("blur", cancel); cancel(); };
  }, [cancel, disabled, onHide]);

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0 || !event.isPrimary) return;
    cancel();
    didDragRef.current = false;
    const target = event.target;
    if ((disabled && !onHide) || !(target instanceof Element) ||
      target.closest("button:not(.island__open-button), input, textarea, select, a, [contenteditable='true'], [data-window-drag='false']")) return;
    if (window.getSelection()?.containsNode(target, true) && !window.getSelection()?.isCollapsed) return;
    press.current = {
      id: event.pointerId, handle: event.currentTarget, island: target.closest<HTMLElement>(".island"),
      swipe: startSwipe(event.clientX, event.clientY, event.timeStamp),
      ceiling: onHide ? getMonitorTopClientY().catch(() => null) : null,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const active = press.current;
    if (!active || active.id !== event.pointerId || event.buttons !== 1) return;
    const { swipe } = active;
    const action = onHide ? moveSwipe(swipe, event.clientX, event.clientY, event.timeStamp)
      : Math.hypot(event.clientX - swipe.x, event.clientY - swipe.y) >= 3 ? "drag" : "pending";
    if (action === "pending") return;
    didDragRef.current = true;
    event.preventDefault();
    if (action === "drag") {
      clear();
      if (!disabled) onWindowDragStart();
    } else if (active.island) active.island.style.translate = `0 ${swipe.offset}px`;
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    const active = press.current;
    if (!active || active.id !== event.pointerId) return;
    clear();
    if (!active.swipe.active || !onHide) return;
    const { clientX, clientY, timeStamp } = event;
    moveSwipe(active.swipe, clientX, clientY, timeStamp);
    if (shouldHide(active.swipe, timeStamp, false)) { onHide(); return; }
    if (active.island && active.swipe.offset && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      rebound.current = active.island.animate(
        [{ translate: `0 ${active.swipe.offset}px` }, { translate: "0 0" }],
        { duration: 160, easing: "cubic-bezier(0.2, 0.8, 0.3, 1)" },
      );
    }
    const token = generation.current;
    void active.ceiling?.then(top => {
      if (generation.current === token && top !== null && shouldHide(active.swipe, timeStamp, clientY <= top + 0.5)) {
        clear();
        onHide();
      }
    });
  };
  const cancelPointer = (event: ReactPointerEvent<HTMLElement>) => {
    if (press.current?.id === event.pointerId) cancel();
  };
  return { didDragRef, drag: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: cancelPointer, onLostPointerCapture: cancelPointer } };
}
