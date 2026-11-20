import { CloudSun, ExternalLink } from "lucide-react";
import { SettingsSwitch } from "../../components/settings/SettingsSwitch";
import { useTranslation } from "../../i18n";
import { requestOpenWeather } from "./api";
import { saveWeatherSettings } from "./storage";
import { useWeather } from "./useWeather";
import { WeatherSettings } from "./WeatherSettings";
import { WeatherPreview } from "./WeatherPreview";
import { WeatherSourceSettings } from "./WeatherSourceSettings";
import { useState } from "react";
import "./WeatherSettingsPage.css";

export function WeatherSettingsPage({ onOpenWeather }: { onOpenWeather?: () => void }) {
  const weather = useWeather();
  const text = useTranslation().weather;
  const [saveFailed, setSaveFailed] = useState(false);
  return <div className="weather-settings-page">
    <section className="weather-module">
      <span className="weather-module__icon"><CloudSun size={25} aria-hidden="true" /></span>
      <div className="weather-module__heading"><h2>{text.title}</h2><p>{text.moduleDescription}</p></div>
      <span className={`weather-module__status${weather.settings.enabled ? " is-enabled" : ""}`}>{weather.settings.enabled ? text.enabledStatus : text.off}</span>
      <SettingsSwitch id="weather-module-enabled" checked={weather.settings.enabled} onChange={enabled => setSaveFailed(!saveWeatherSettings({ ...weather.settings, enabled }))} />
      <label className="weather-settings-page__sr" htmlFor="weather-module-enabled">{text.enabled}</label>
      <button type="button" className="weather-settings-page__button" disabled={!weather.settings.enabled} onClick={() => { if (onOpenWeather) onOpenWeather(); else void requestOpenWeather().catch(() => setSaveFailed(true)); }}>{text.open}<ExternalLink size={13} aria-hidden="true" /></button>
    </section>
    {saveFailed && <p role="alert" className="weather-error">{text.saveFailed}</p>}
    <WeatherPreview weather={weather} />
    <WeatherSourceSettings settings={weather.settings} />
    <WeatherSettings hideToggle />
  </div>;
}
