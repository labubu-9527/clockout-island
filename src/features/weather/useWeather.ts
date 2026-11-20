import { useLocale } from "../../i18n";
import { useWeatherLocation } from "./useWeatherLocation";
import { useEffect, useRef, useState } from "react";
import { getWeatherForecast, getQweatherForecast, type WeatherForecast } from "./api";
import { activeWeatherCity, weatherRequestKey, usableCache, validCache, validForecast, WEATHER_TTL } from "./model.ts";
import { readWeatherJson, saveWeatherCache, useWeatherSettings, WEATHER_CACHE_KEY } from "./storage";

type Reading = { key: string; forecast: WeatherForecast | null; fetchedAt: number; loading: boolean; failed: boolean };
const EMPTY: Reading = { key: "", forecast: null, fetchedAt: 0, loading: false, failed: false };
/** One owner in IslandApp; panels and the badge share this controller. */
export function useWeather() {
  const settings = useWeatherSettings();
  const { locale } = useLocale();
  const location = useWeatherLocation(settings.enabled && settings.locationMode === "auto", locale === "zh-CN" ? "zh" : "en", `${settings.provider}:${settings.qweatherHost}`);
  const city = settings.locationMode === "auto" ? location.city : activeWeatherCity(settings);
  const key = weatherRequestKey(settings, city);
  const [reading, setReading] = useState<Reading>(EMPTY);
  const refreshRef = useRef<() => void>(() => {});
  useEffect(() => {
    if (!settings.enabled || !city) { refreshRef.current = () => {}; return; }
    let cancelled = false;
    let busy = false;
    let lastAttempt = 0;
    let fetchedAt = 0;
    const cached = readWeatherJson(WEATHER_CACHE_KEY);
    const refresh = async (manual = false) => {
      const now = Date.now();
      if (cancelled || busy || now - lastAttempt < 10000 || (!manual && fetchedAt && now - fetchedAt < WEATHER_TTL)) return;
      busy = true;
      lastAttempt = now;
      setReading(current => ({ ...(current.key === key ? current : EMPTY), key, loading: true, failed: false }));
      try {
        const forecast = await (settings.provider === "qweather" ? getQweatherForecast(city, settings.qweatherHost ?? "") : getWeatherForecast(city));
        if (!validForecast(forecast)) throw new Error("Invalid weather response");
        if (cancelled) return;
        fetchedAt = Date.now();
        saveWeatherCache({ cityKey: key, fetchedAt, forecast });
        setReading({ key, forecast, fetchedAt, loading: false, failed: false });
      } catch {
        if (!cancelled) setReading(current => ({ ...current, key, loading: false, failed: true }));
      } finally { busy = false; }
    };
    refreshRef.current = () => { void refresh(true); };
    // Publish cache outside the effect's synchronous phase and discard it on a city change.
    void Promise.resolve().then(() => {
      if (cancelled) return;
      if (validCache(cached, city, key) && cached.fetchedAt <= Date.now()) {
        fetchedAt = cached.fetchedAt;
        setReading({ key, forecast: cached.forecast, fetchedAt, loading: false, failed: false });
      }
      if (!usableCache(cached, city, Date.now(), key)) void refresh();
    });
    const timer = window.setInterval(() => { void refresh(); }, 60000);
    return () => { cancelled = true; window.clearInterval(timer); refreshRef.current = () => {}; };
    // City identity, not object identity, controls request lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.enabled, key]);
  const current = reading.key === key && settings.enabled ? reading : EMPTY;
  return { settings, city, ...current, locating: location.locating, locationFailed: location.locationFailed, refresh: () => { location.refreshLocation(); refreshRef.current(); } };
}
export type WeatherController = ReturnType<typeof useWeather>;
