import { useEffect, useRef, useState } from 'react';
import { locateWeatherCity, type WeatherCity } from './api';
import { validLocationCache, type LocationCache } from './location.ts';
import { readWeatherJson, saveWeatherLocation, subscribeWeatherLocation, WEATHER_LOCATION_KEY } from './storage';

export function useWeatherLocation(enabled: boolean, language: string, identity: string) {
  const [reading, setReading] = useState<{ language: string; city: WeatherCity | null; locating: boolean; failed: boolean }>({ language, city: null, locating: false, failed: false });
  const refreshRef = useRef<() => void>(() => {});
  useEffect(() => {
    if (!enabled) { refreshRef.current = () => {}; return; }
    let cancelled = false;
    let busy = false;
    let lastAttempt = 0;
    let revision = 0;
    const stored = readWeatherJson(WEATHER_LOCATION_KEY);
    // Expired but structurally valid history remains available if a fresh location fails.
    const historical = validLocationCache(stored, language, (stored as LocationCache | null)?.locatedAt) && stored.locatedAt <= Date.now() ? stored : null;
    let cache = historical;
    const unsubscribe = subscribeWeatherLocation(() => {
      const shared = readWeatherJson(WEATHER_LOCATION_KEY);
      if (cancelled || !validLocationCache(shared, language)) return;
      revision++;
      cache = shared;
      setReading({ language, city: shared.city, locating: false, failed: false });
    });
    const locate = async (force = false) => {
      const now = Date.now();
      if (cancelled || busy || now - lastAttempt < 10000 || (!force && validLocationCache(cache, language, now))) return;
      busy = true; lastAttempt = now;
      const requestRevision = revision;
      setReading(current => ({ language, city: current.language === language ? current.city : null, locating: true, failed: false }));
      try {
        const city = await locateWeatherCity(language);
        if (!validLocationCache({ city, language, locatedAt: Date.now() }, language)) throw new Error('Invalid location');
        if (cancelled || revision !== requestRevision) return;
        cache = { city, language, locatedAt: Date.now() };
        saveWeatherLocation(cache);
        setReading({ language, city, locating: false, failed: false });
      } catch {
        if (!cancelled && revision === requestRevision) setReading(current => ({ ...current, locating: false, failed: true }));
      } finally { busy = false; }
    };
    refreshRef.current = () => { void locate(true); };
    void Promise.resolve().then(() => {
      if (cancelled) return;
      setReading({ language, city: cache?.city ?? null, locating: false, failed: false });
      void locate();
    });
    const timer = window.setInterval(() => { void locate(); }, 60000);
    return () => { cancelled = true; unsubscribe(); window.clearInterval(timer); refreshRef.current = () => {}; };
  }, [enabled, language, identity]);
  return { city: enabled && reading.language === language ? reading.city : null, locating: enabled && reading.locating,
    locationFailed: enabled && reading.failed, refreshLocation: () => refreshRef.current() };
}
