import { MapPin, RefreshCw } from "lucide-react";
import { useLocale, useTranslation } from "../../i18n";
import { WeatherIcon } from "./WeatherIcon";
import { weatherKind } from "./model";
import type { WeatherController } from "./useWeather";

export function WeatherPreview({ weather }: { weather: WeatherController }) {
  const text = useTranslation().weather;
  const { locale } = useLocale();
  const { settings, forecast, failed, loading } = weather;
  const city = weather.city;
  const current = forecast?.current;
  const day = forecast?.daily?.[0];
  const temperature = (value: number | undefined) => value === undefined ? "--" : Math.round(value);
  let updated = "--";
  if (weather.fetchedAt) {
    try { updated = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone: forecast?.timezone }).format(weather.fetchedAt); } catch { /* A malformed cached timezone must not break settings. */ }
  }
  const source = settings.provider === "qweather" ? text.qweather : text.openMeteo;
  return <section className={`weather-preview${!settings.enabled || failed ? " is-offline" : ""}`} aria-label={text.preview}>
    <div className="weather-preview__main">
      <div><p className="weather-preview__city"><MapPin size={14} aria-hidden="true" />{city ? [city.name, city.admin1].filter(Boolean).join(" / ") : text.choose}</p>
        <strong className="weather-preview__temperature">{temperature(current?.temperature)}<span>°C</span></strong>
        <p>{current ? text.kinds[weatherKind(current.weatherCode)] : loading ? text.loading : text.noWeather}</p>
        <small>{text.high} {temperature(day?.temperatureMax)}° / {text.low} {temperature(day?.temperatureMin)}°</small>
      </div>
      <span className="weather-preview__icon"><WeatherIcon code={current?.weatherCode ?? -1} day={current?.isDay} size={92} /></span>
    </div>
    <div className="weather-preview__footer">
      <span>{text.feels}<strong>{temperature(current?.apparentTemperature)}°</strong></span>
      <span>{text.humidity}<strong>{current ? `${current.humidity}%` : "--"}</strong></span>
      <span>{text.wind}<strong>{current ? `${Math.round(current.windSpeed)} km/h` : "--"}</strong></span>
      <span className="weather-preview__updated">{text.updated}<strong>{updated}</strong></span>
      <button type="button" disabled={!settings.enabled || loading || weather.locating} onClick={weather.refresh} aria-label={text.refresh}><RefreshCw size={16} aria-hidden="true" /></button>
    </div>
    <p className="weather-preview__attribution">{text.dataFrom} {source}{weather.locationFailed ? ` \u00b7 ${text.locationFailed}` : failed ? ` · ${text.loadFailed}${forecast ? ` · ${text.stale}` : ""}` : !settings.enabled ? ` · ${text.off}` : ""}</p>
  </section>;
}
