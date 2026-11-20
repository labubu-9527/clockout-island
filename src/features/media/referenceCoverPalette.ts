// Ported from DotIsle dotisle-themes/{cover_color,dynamic_color}.rs (MIT).
// Use the upstream Material quantizer/HCT implementation, not average RGB/HSL approximations.
import { Hct, QuantizerCelebi, Score, TonalPalette, SchemeContent, hexFromArgb, argbFromRgb, Contrast } from '@material/material-color-utilities';

export function referenceCoverPalette(rgba: ArrayLike<number>) {
  const pixels: number[] = [];
  for (let index = 0; index + 3 < rgba.length; index += 4) {
    if (rgba[index + 3] >= 200) pixels.push(argbFromRgb(rgba[index], rgba[index + 1], rgba[index + 2]));
  }
  const seed = pixels.length ? Score.score(QuantizerCelebi.quantize(pixels, 128),
    { desired: 1, fallbackColorARGB: 0, filter: true })[0] : 0;
  const hct = Hct.fromInt(seed || 0xff1b1f25);
  const tonal = TonalPalette.fromHueAndChroma(hct.hue, seed ? hct.chroma : 4);
  const background = seed ? tonal.tone(24) : 0xff1b1f25;
  let tone = seed ? 80 : 88;
  while (seed && Contrast.ratioOfTones(tone, 24) < 4.5 && tone < 100) tone += 2;
  const roles = new SchemeContent(hct, true, 0);
  return {
    background: hexFromArgb(background),
    accent: hexFromArgb(tonal.tone(tone)),
    lightAccent: hexFromArgb(new SchemeContent(hct, false, 0).onPrimaryContainer),
    primary: hexFromArgb(roles.primary),
    text: hexFromArgb(roles.onSurface),
    secondary: hexFromArgb(roles.onSurfaceVariant),
  };
}
export const NEUTRAL_COVER_PALETTE = referenceCoverPalette([]);
