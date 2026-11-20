import type { Material } from '../appearance/types';

// Ported from DotIsle lyric-native/src/surface.rs::Surface::paint (MIT, d09a751).
// The collapsed plane stays neutral; only the expanded card takes the cover tint.
function mix(a: string, b: string, amount: number) {
  const channels = [1, 3, 5].map(index => Math.round(
    parseInt(a.slice(index, index + 2), 16) * (1 - amount)
    + parseInt(b.slice(index, index + 2), 16) * amount,
  ).toString(16).padStart(2, '0'));
  return `#${channels.join('')}`;
}

export function referenceMusicSurface(material: Material, expanded: boolean, background: string) {
  const glass = material === 'liquidGlass';
  const tint = expanded ? 1 : 0;
  const reflection = glass ? 1 : 0;
  const frost = material === 'frostedGlass' ? 1 : glass && expanded ? 0.28 : 0;
  return {
    top: mix(mix('#1b1f25', background, tint), '#dfefff', 0.08 * reflection),
    bottom: mix('#0c0f14', background, tint * 0.65),
    alpha: glass ? (expanded ? 224 : 196) / 255 : 1,
    frost: Math.floor(frost * 15) / 255,
    reflection: 24 * reflection / 255,
  };
}
