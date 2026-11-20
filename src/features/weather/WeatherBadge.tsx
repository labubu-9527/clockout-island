import type { WeatherController } from "./useWeather";
import { useTranslation } from "../../i18n";
import { WeatherIcon } from "./WeatherIcon";
import "./Weather.css";
export function WeatherBadge({ weather, onOpen }: { weather: WeatherController; onOpen: () => void }) {
  const text = useTranslation().weather;
  if (!weather.settings.enabled) return null;
  const city = weather.city;
  const current = weather.forecast?.current;
  const label = city ? `${city.name} ${current ? `${Math.round(current.temperature)}°` : "--°"}` : text.choose;
  return <button className="weather-badge" type="button" aria-label={`${text.title} · ${label}`} title={label} onClick={e => { e.stopPropagation(); onOpen(); }}>
    <WeatherIcon code={current?.weatherCode ?? -1} day={current?.isDay} size={15} /><span>{label}</span>
  </button>;
}
