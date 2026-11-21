export function startSwipe(x: number, y: number, time: number) {
  return { x, y, active: false, distance: 0, peak: 0, velocity: 0, lastMove: time, offset: 0 };
}

type Swipe = ReturnType<typeof startSwipe>;

export function moveSwipe(swipe: Swipe, x: number, y: number, time: number) {
  const dx = x - swipe.x;
  const distance = swipe.y - y;
  if (!swipe.active) {
    if (distance <= Math.abs(dx) * 1.25) return Math.hypot(dx, distance) >= 3 ? "drag" : "pending";
    if (distance <= 8) return "pending";
    swipe.active = true;
  }
  if (distance !== swipe.distance) {
    const elapsed = time - swipe.lastMove;
    if (elapsed > 0) swipe.velocity = (elapsed < 100 ? 0.45 * swipe.velocity : 0) + 550 * (distance - swipe.distance) / elapsed;
    swipe.lastMove = time;
    swipe.distance = distance;
    swipe.peak = Math.max(swipe.peak, distance);
  }
  const d = Math.max(0, distance);
  swipe.offset = -72 * d / (72 + d);
  return "swipe";
}

export function shouldHide(swipe: Swipe, time: number, atTop: boolean) {
  return swipe.active && swipe.distance > 0 && swipe.peak - swipe.distance < 8 &&
    (swipe.distance >= 40 || atTop || (swipe.distance > 18 && swipe.velocity > 360 && time - swipe.lastMove < 100));
}
