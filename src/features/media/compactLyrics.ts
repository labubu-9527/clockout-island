// DotIsle lyric-native/compact.rs: shared line metrics and secondary-line policy (MIT).
export function capsuleGroupMetrics(font: number, scale = 1) {
  const round = (value: number) => Math.round(value * scale) / scale;
  const primary = round(font * 1.448), secondary = round(Math.max(9, Math.min(11.5, font * 0.78)) * 1.448);
  return { primary, secondary, height: Math.max(40, primary + secondary + 1 + 6) };
}
export function compactSecondary(current: string, translation: string | undefined, next: string) {
  if (translation?.trim() && translation.trim() !== current.trim()) return translation;
  return /[\u3400-\u9fff\u{20000}-\u{2fa1f}]/u.test(current) ? next : '';
}
