import { useEffect, useState } from "react";
import { nextClockTickDelay } from "./formatClock";

/** Keep clock updates in the leaf; reschedule from wall time so wakeups never accumulate drift. */
export function useClockNow(showSeconds: boolean, active: boolean): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!active) return;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const current = new Date();
      setNow(current);
      timer = setTimeout(tick, nextClockTickDelay(current.getTime(), showSeconds));
    };
    const visibilityChanged = () => {
      clearTimeout(timer);
      if (document.visibilityState !== "hidden") timer = setTimeout(tick, 0);
    };
    visibilityChanged();
    document.addEventListener("visibilitychange", visibilityChanged);
    return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", visibilityChanged); };
  }, [active, showSeconds]);
  return now;
}
