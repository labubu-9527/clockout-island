import { useEffect, useState } from "react";
import { Check, Globe2, KeyRound } from "lucide-react";
import { useTranslation } from "../../i18n";
import { hasWeatherSecret, saveWeatherSecret, testQweatherConnection } from "./api";
import { normalizeQweatherHost, normalizeWeatherSettings, type WeatherSettings } from "./model";
import { readWeatherJson, saveWeatherSettings, WEATHER_SETTINGS_KEY } from "./storage";

export function WeatherSourceSettings({ settings }: { settings: WeatherSettings }) {
  const text = useTranslation().weather;
  const active = settings.provider ?? "open-meteo";
  const [draft, setDraft] = useState(active);
  const [host, setHost] = useState(settings.qweatherHost ?? "");
  const [secret, setSecret] = useState("");
  const [hasSecret, setHasSecret] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  useEffect(() => { let cancelled = false; void hasWeatherSecret().then(value => { if (!cancelled) setHasSecret(value); }).catch(() => {}); return () => { cancelled = true; }; }, []);
  const run = async (apply: boolean) => {
    setBusy(true); setFeedback("");
    try {
      const normalizedHost = normalizeQweatherHost(host);
      if (draft === "qweather") {
        if (!normalizedHost || (!hasSecret && !secret.trim())) throw new Error(text.credentialsRequired);
        await testQweatherConnection(normalizedHost, secret.trim() || undefined);
        if (apply && secret.trim()) { await saveWeatherSecret(secret.trim()); setHasSecret(true); setSecret(""); }
      }
      if (apply && !saveWeatherSettings({ ...normalizeWeatherSettings(readWeatherJson(WEATHER_SETTINGS_KEY)), provider: draft, ...(draft === "qweather" ? { qweatherHost: normalizedHost } : {}) })) throw new Error(text.saveFailed);
      setFeedback(apply ? text.applied : text.testSuccess);
    } catch (error) { setFeedback(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  };
  return <section className="weather-source">
    <div className="weather-source__heading"><h3>{text.sourceTitle}</h3><span>{text.activeSource} {active === "qweather" ? text.qweather : text.openMeteo}</span></div>
    <div className="weather-source__tiles">
      <button type="button" className="weather-source__tile" disabled={busy} aria-pressed={draft === "open-meteo"} onClick={() => { setDraft("open-meteo"); setFeedback(""); }}><Globe2 size={19} aria-hidden="true" /><span><strong>{text.openMeteo}<small>{text.defaultSource}</small></strong><span>{text.openMeteoHint}</span></span>{draft === "open-meteo" && <Check size={16} aria-hidden="true" />}</button>
      <button type="button" className="weather-source__tile" disabled={busy} aria-pressed={draft === "qweather"} onClick={() => { setDraft("qweather"); setFeedback(""); }}><KeyRound size={19} aria-hidden="true" /><span><strong>{text.qweather}</strong><span>{text.qweatherHint}</span></span>{draft === "qweather" && <Check size={16} aria-hidden="true" />}</button>
    </div>
    {draft === "qweather" && <div className="weather-source__credentials">
      <label>{text.apiHost}<input disabled={busy} value={host} onChange={event => setHost(event.target.value)} placeholder={text.hostPlaceholder} autoComplete="off" maxLength={250} /></label>
      <label>{text.apiKey}<input disabled={busy} type="password" value={secret} onChange={event => setSecret(event.target.value)} placeholder={hasSecret ? text.keySaved : text.keyPlaceholder} autoComplete="new-password" maxLength={2048} /></label>
      <p>{text.secretHint}</p>
    </div>}
    <div className="weather-source__actions"><span role="status">{feedback || text.sourceDraftHint}</span>{draft === "qweather" && <button className="weather-settings-page__button" type="button" disabled={busy} onClick={() => void run(false)}>{text.testConnection}</button>}<button type="button" className="weather-settings-page__button is-primary" disabled={busy} onClick={() => void run(true)}>{busy ? text.working : draft === "qweather" ? text.saveApply : text.apply}</button></div>
  </section>;
}
