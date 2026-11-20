import { useTranslation } from "../../i18n";
import { formatClock, type ClockFormatSettings } from "./formatClock";
import { useClockNow } from "./useClockNow";
import "./ClockIndicator.css";

export function ClockIndicator({ settings, active, showTooltip = false }: {
  settings: ClockFormatSettings & { clockEnabled: boolean };
  active: boolean;
  showTooltip?: boolean;
}) {
  const text = useTranslation().clock;
  const running = active && settings.clockEnabled;
  const now = useClockNow(settings.clockShowSeconds, running);
  if (!running) return null;
  return <time className="clock-indicator" dateTime={now.toISOString()} title={showTooltip ? text.localTime : undefined}>
    {formatClock(now, settings, text)}
  </time>;
}
