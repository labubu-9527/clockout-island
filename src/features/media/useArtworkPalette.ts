import { useEffect, useState } from 'react';
import { NEUTRAL_COVER_PALETTE, referenceCoverPalette } from './referenceCoverPalette';

const recent = new Map<string, ReturnType<typeof referenceCoverPalette>>();
/** DotIsle quantizes the scaled 192px cover once per change, never per animation frame. */
export function useArtworkPalette(source: string | null) {
  const [loaded, setLoaded] = useState<{ source: string; palette: typeof NEUTRAL_COVER_PALETTE } | null>(null);
  useEffect(() => {
    if (!source || recent.has(source)) return;
    let cancelled = false;
    const image = new Image();
    const finish = (palette: typeof NEUTRAL_COVER_PALETTE) => {
      if (cancelled) return;
      recent.set(source, palette);
      if (recent.size > 8) recent.delete(recent.keys().next().value ?? source);
      setLoaded({ source, palette });
    };
    image.onload = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 192;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) { finish(NEUTRAL_COVER_PALETTE); return; }
        context.drawImage(image, 0, 0, 192, 192);
        finish(referenceCoverPalette(context.getImageData(0, 0, 192, 192).data));
      } catch { finish(NEUTRAL_COVER_PALETTE); }
    };
    image.onerror = () => finish(NEUTRAL_COVER_PALETTE);
    image.src = source;
    return () => { cancelled = true; };
  }, [source]);
  return source ? loaded?.source === source ? loaded.palette : recent.get(source) ?? NEUTRAL_COVER_PALETTE : NEUTRAL_COVER_PALETTE;
}
