import { SettingsChoice } from "../../components/settings/SettingsChoice";
import { SettingsRow } from "../../components/settings/SettingsRow";
import { activeWeatherCity } from "./model.ts";
import { useEffect, useState } from "react";
import { Check, Search } from "lucide-react";
import { SettingsGroup } from "../../components/settings/SettingsGroup";
import { SettingsToggleRow } from "../../components/settings/SettingsToggleRow";
import { useLocale } from "../../i18n";
import { searchWeatherCities, searchQweatherCities, type WeatherCity } from "./api";
import { saveWeatherSettings, useWeatherSettings } from "./storage";
import { useTranslation } from "../../i18n";
import "./Weather.css";
export function WeatherSettings({ hideToggle = false }: { hideToggle?: boolean }) {
  const settings = useWeatherSettings();
  const text = useTranslation().weather;
  const { locale } = useLocale();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<{ query: string; source: string; cities: WeatherCity[]; failed: boolean } | null>(null);
  const [savingFailed, setSavingFailed] = useState(false);
  const term = query.trim();
  const source = `${settings.provider ?? "open-meteo"}:${settings.qweatherHost ?? ""}:${locale}`;
  const selectedCity = activeWeatherCity(settings);
  const save = (enabled: boolean, city = selectedCity) => setSavingFailed(!saveWeatherSettings({ ...settings, enabled, ...(settings.provider === "qweather" ? { qweatherCity: city } : { city }) }));
  useEffect(() => {
    if ((!settings.enabled && !hideToggle) || term.length < 2) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (settings.provider === "qweather" ? searchQweatherCities(term, locale === "zh-CN" ? "zh" : "en", settings.qweatherHost ?? "") : searchWeatherCities(term, locale === "zh-CN" ? "zh" : "en")).then(cities => {
        if (!cancelled) setResult({ query: term, source, cities, failed: false });
      }).catch(() => { if (!cancelled) setResult({ query: term, source, cities: [], failed: true }); });
    }, 400);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [term, locale, settings.enabled, settings.provider, settings.qweatherHost, hideToggle, source]);
  const currentResult = result?.query === term && result.source === source ? result : null;
  return <SettingsGroup title={hideToggle ? text.choose : text.title} footer={settings.provider === "qweather" ? text.qweatherHint : text.source}>
    {!hideToggle && <SettingsToggleRow title={text.enabled} description={text.description} checked={settings.enabled} onChange={enabled => save(enabled)} />}
    <SettingsRow title={text.locationMode} description={text.locationHint} control={<SettingsChoice value={settings.locationMode ?? "auto"} ariaLabel={text.locationMode} options={[{ value: "auto", label: text.automatic }, { value: "manual", label: text.manual }]} onChange={locationMode => setSavingFailed(!saveWeatherSettings({ ...settings, locationMode }))} />} />
    {savingFailed && <p className="weather-error" role="alert">{text.saveFailed}</p>}
    {(settings.enabled || hideToggle) && settings.locationMode === "manual" && <div className="weather-search">
      {selectedCity && <p>{text.selected} · <strong>{selectedCity.name}</strong> · {[selectedCity.admin1, selectedCity.country].filter(Boolean).join(" · ")}</p>}
      <label className="weather-search__label"><Search size={15} aria-hidden="true" /><span>{text.search}</span>
        <input value={query} maxLength={100} placeholder={text.placeholder} onChange={e => setQuery(e.target.value)} />
      </label>
      {term.length >= 2 && <div aria-live="polite">
        {!currentResult && <p>{text.searching}</p>}
        {currentResult?.failed && <p className="weather-error">{text.searchFailed}</p>}
        {currentResult && !currentResult.failed && currentResult.cities.length === 0 && <p>{text.noResults}</p>}
        {currentResult?.cities.map(city => <button className="weather-city" key={city.id} type="button" aria-pressed={selectedCity?.id === city.id} onClick={() => setSavingFailed(!saveWeatherSettings({ ...settings, enabled: hideToggle ? settings.enabled : true, locationMode: "manual", ...(settings.provider === "qweather" ? { qweatherCity: city } : { city }) }))}>
          <span><strong>{city.name}</strong><small>{[city.admin1, city.country].filter(Boolean).join(" · ")}</small></span>
          {selectedCity?.id === city.id && <Check size={16} aria-hidden="true" />}
        </button>)}
      </div>}
    </div>}
  </SettingsGroup>;
}
