import { act } from "react";
import { createRoot } from "react-dom/client";
import { mockIPC } from "@tauri-apps/api/mocks";
import { I18nProvider } from "../../src/i18n";
import { WeatherSettingsPage } from "../../src/features/weather/WeatherSettingsPage";
import { saveWeatherSettings, WEATHER_SETTINGS_KEY } from "../../src/features/weather/storage";
import "../../src/styles/tokens.css";
import "../../src/styles/base.css";
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const calls: { command: string; payload: unknown }[] = [];
let rejectConnection = false;
mockIPC((command, payload) => {
  calls.push({ command, payload });
  if (command === "test_qweather_connection" && rejectConnection) throw new Error("Connection rejected");
  return command === "has_weather_secret" ? true : null;
});
const original = localStorage.getItem(WEATHER_SETTINGS_KEY);
localStorage.setItem(WEATHER_SETTINGS_KEY, JSON.stringify({enabled:false,city:null}));
const root = createRoot(document.getElementById("root")!);
const results = document.getElementById("results")!;
const click = async (element: HTMLElement) => act(async () => element.click());
const type = async (input: HTMLInputElement, value: string) => act(async () => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
let opened = false;
try {
  await act(async () => root.render(<I18nProvider><WeatherSettingsPage onOpenWeather={() => { opened = true; }} /></I18nProvider>));
  const tiles = document.querySelectorAll<HTMLButtonElement>(".weather-source__tile");
  if (tiles.length !== 2) throw new Error("Two selectable providers are required");
  await click(tiles[1]);
  if (tiles[1].getAttribute("aria-pressed") !== "true") throw new Error("QWeather draft must be selected");
  const inputs = document.querySelectorAll<HTMLInputElement>(".weather-source__credentials input");
  if (inputs[1].type !== "password") throw new Error("Key must be a password input");
  if (!document.querySelector(".weather-preview")) throw new Error("Preview must stay visible when disabled");
  await type(inputs[0], "https://Example.qweatherapi.com/");
  await type(inputs[1], "test-secret-value");
  const apply = document.querySelector<HTMLButtonElement>(".weather-source__actions .is-primary")!;
  rejectConnection = true;
  await click(apply);
  if (JSON.parse(localStorage.getItem(WEATHER_SETTINGS_KEY)!).provider === "qweather") throw new Error("Failed test must not apply draft");
  rejectConnection = false;
  await click(apply);
  const saved = localStorage.getItem(WEATHER_SETTINGS_KEY)!;
  if (JSON.parse(saved).qweatherHost !== "example.qweatherapi.com") throw new Error("Host must be normalized");
  if (saved.includes("test-secret-value")) throw new Error("Key must not be in settings");
  if (!calls.some(call => call.command === "save_weather_secret")) throw new Error("Key must be saved through secure IPC");
  await act(async () => { saveWeatherSettings({ ...JSON.parse(saved), enabled: true }); });
  await click(document.querySelector<HTMLButtonElement>(".weather-module > button")!);
  if (!opened) throw new Error("Open must navigate to weather");
  results.textContent = "PASS draft selection, secure key, normalized host, failed apply, preview and navigation";
  document.documentElement.dataset.testResult = "passed";
} catch (error) { results.textContent = `FAIL ${String(error)}`; document.documentElement.dataset.testResult = "failed"; }
window.addEventListener("beforeunload", () => original === null ? localStorage.removeItem(WEATHER_SETTINGS_KEY) : localStorage.setItem(WEATHER_SETTINGS_KEY, original));

