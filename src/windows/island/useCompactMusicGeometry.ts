import { useCallback, useEffect, useRef, useState } from 'react';

export type CompactMusicGeometry = { width: number; height: number };
/** DotIsle compact::Stability: confirm growth for 80ms, contraction for 300ms. */
export function useCompactMusicGeometry() {
  const [geometry, setGeometry] = useState<CompactMusicGeometry>({ width: 260, height: 43 });
  const current = useRef(geometry), candidate = useRef<CompactMusicGeometry | null>(null);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const report = useCallback((next: CompactMusicGeometry) => {
    if (candidate.current?.width === next.width && candidate.current.height === next.height) return;
    candidate.current = next;
    if (pending.current !== null) clearTimeout(pending.current);
    if (current.current.width === next.width && current.current.height === next.height) return;
    pending.current = setTimeout(() => {
      current.current = next;
      setGeometry(next);
      pending.current = null;
    }, next.width < current.current.width || next.height < current.current.height ? 300 : 80);
  }, []);
  useEffect(() => () => { if (pending.current !== null) clearTimeout(pending.current); }, []);
  return { geometry, report };
}
