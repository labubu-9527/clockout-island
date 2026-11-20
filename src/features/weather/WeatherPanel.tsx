import { useState } from "react";
import { MapPin, RefreshCw, Thermometer, Droplets, Wind, Sunrise } from "lucide-react";
import { useLocale, useTranslation } from "../../i18n";
import { weatherKind } from "./model";
import type { WeatherController } from "./useWeather";
import { WeatherIcon } from "./WeatherIcon";
import { WeatherSettings } from "./WeatherSettings";
import { WeatherForecastStrip } from "./WeatherForecastStrip";
import "./Weather.css";
import "./WeatherPanel.css";
export function WeatherPanel({ weather }: { weather: WeatherController }) {
 const text = useTranslation().weather;
 const { locale } = useLocale();
 const [configuring, setConfiguring] = useState(false);
 const [hourly, setHourly] = useState(false);
 const { city, forecast } = weather;
 const current = forecast?.current, day = forecast?.daily?.[0];
 const time = (value?: number) => {
  if (!value) return "--";
  try { return new Intl.DateTimeFormat(locale, { timeZone: forecast?.timezone, hour: "2-digit", minute: "2-digit", hour12: false }).format(value * 1000); } catch { return "--"; }
 };
 return <div className="weather-panel">
  <div className="weather-panel__actions"><span><MapPin size={14} aria-hidden="true" />{city?.name ?? text.title}</span>
   <button type="button" onClick={() => setConfiguring(!configuring)} aria-expanded={configuring}>{text.configure}</button>
   <button type="button" disabled={!weather.settings.enabled || weather.loading || weather.locating} onClick={weather.refresh} aria-label={text.refresh}><RefreshCw size={15} aria-hidden="true" /></button>
  </div>
  {(!weather.settings.enabled || configuring || (!city && !weather.locating)) && <WeatherSettings />}
  {weather.locating && <p role="status" className="weather-empty">{text.locating}</p>}
  {weather.locationFailed && <p className="weather-error" role="alert">{text.locationFailed}</p>}
  {weather.loading && !forecast && <p role="status">{text.loading}</p>}
  {weather.failed && <p className="weather-error" role="alert">{text.loadFailed}{forecast ? ` \u00b7 ${text.stale}` : ""}</p>}
  {weather.settings.enabled && city && current && forecast && <div className="weather-card">
   <div className="weather-card__summary"><div className="weather-card__current"><WeatherIcon code={current.weatherCode} day={current.isDay} size={62} />
    <div><strong>{Math.round(current.temperature)}{"\u00b0"}<small>C</small></strong><p>{text.kinds[weatherKind(current.weatherCode)]}</p>
    <small>{text.high} {day ? Math.round(day.temperatureMax) : "--"}{"\u00b0 \u00b7 "} {text.low} {day ? Math.round(day.temperatureMin) : "--"}{"\u00b0"}</small><p className="weather-card__city">{city.name}</p></div></div>
    <div className="weather-card__metrics"><span><Thermometer size={12} aria-hidden="true" />{text.feels}<strong>{Math.round(current.apparentTemperature)}{"\u00b0"}</strong></span><span><Droplets size={12} aria-hidden="true" />{text.humidity}<strong>{current.humidity}%</strong></span>
    <span><Wind size={12} aria-hidden="true" />{text.wind}<strong>{Math.round(current.windSpeed)} km/h</strong></span><span><Sunrise size={12} aria-hidden="true" />{text.sunriseSunset}<strong>{time(day?.sunrise)} / {time(day?.sunset)}</strong></span></div>
   </div>
   <div className="weather-card__tabs"><button type="button" aria-pressed={!hourly} onClick={() => setHourly(false)}>{text.daily}</button><button type="button" aria-pressed={hourly} onClick={() => setHourly(true)}>{text.hourly}</button></div>
   <WeatherForecastStrip forecast={forecast} hourly={hourly} />
   <footer>{weather.settings.provider === "qweather" ? text.qweather : text.openMeteo}<span>{text.updated} {time(weather.fetchedAt / 1000)}</span></footer>
  </div>}
 </div>;
}
