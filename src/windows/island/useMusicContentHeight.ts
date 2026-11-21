import { useState } from 'react';

/** Only custom music reports content height; presets retain their source geometry. */
export function useMusicContentHeight() {
  const [musicContentHeight, reportMusicContentHeight] = useState<number | null>(null);
  return { musicContentHeight, reportMusicContentHeight };
}
