import type { ClockText } from "../../i18n/sections/clock";

export type ClockPeriod = "none" | "ampm" | "detailed";

export interface ClockFormatSettings {
  clockHour12: boolean;
  clockPeriod: ClockPeriod;
  clockShowSeconds: boolean;
}

function detailedPeriod(hour: number, text: ClockText): string {
  if (hour < 5) return text.dawn;
  if (hour < 9) return text.earlyMorning;
  if (hour < 12) return text.morning;
  if (hour < 13) return text.noon;
  if (hour < 18) return text.afternoon;
  if (hour < 23) return text.evening;
  return text.night;
}

/** Date getters deliberately follow the system time zone, including daylight saving changes. */
export function formatClock(date: Date, settings: ClockFormatSettings, text: ClockText): string {
  const hour = date.getHours();
  const pad = (value: number) => String(value).padStart(2, "0");
  const hours = settings.clockHour12 ? String(hour % 12 || 12) : pad(hour);
  const time = `${hours}:${pad(date.getMinutes())}${settings.clockShowSeconds ? `:${pad(date.getSeconds())}` : ""}`;
  const period = settings.clockPeriod === "detailed" ? detailedPeriod(hour, text)
    : settings.clockPeriod === "ampm" ? (hour < 12 ? text.am : text.pm) : "";
  return period ? `${period} ${time}` : time;
}

export function nextClockTickDelay(now: number, showSeconds: boolean): number {
  const interval = showSeconds ? 1000 : 60_000;
  return interval - now % interval;
}
