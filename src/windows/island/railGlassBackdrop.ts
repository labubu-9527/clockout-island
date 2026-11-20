import type { GlassFrame } from './glassFrame';

/** Reuse the window capture; crop in viewport coordinates so the rail's scale does not shift it. */
export function paintRailBackdrop(source: HTMLCanvasElement, frame: GlassFrame, luma: number) {
  const canvas = document.querySelector<HTMLCanvasElement>('.island__glass-backdrop--rail canvas');
  const host = canvas?.parentElement;
  const rail = host?.parentElement;
  const context = canvas?.getContext('2d');
  if (!canvas || !host || !rail || !context) return;
  const rect = rail.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.round(rect.width * ratio));
  const height = Math.max(1, Math.round(rect.height * ratio));
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  const x = frame.width / (frame.right - frame.left);
  const y = frame.height / (frame.bottom - frame.top);
  context.clearRect(0, 0, width, height);
  context.drawImage(source,
    (rect.left * ratio - frame.left) * x, (rect.top * ratio - frame.top) * y,
    rect.width * ratio * x, rect.height * ratio * y, 0, 0, width, height);
  const value = String(luma);
  if (host.style.getPropertyValue('--glass-backdrop-luma') !== value) host.style.setProperty('--glass-backdrop-luma', value);
}
