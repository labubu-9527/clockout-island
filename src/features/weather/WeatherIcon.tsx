import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, Moon, Sun } from "lucide-react";
import { weatherKind } from "./model.ts";
export function WeatherIcon({ code, day = true, size = 22 }: { code: number; day?: boolean; size?: number }) {
  const kind = weatherKind(code);
  const Icon = kind === "clear" ? (day ? Sun : Moon) : kind === "rain" ? CloudRain : kind === "snow" ? CloudSnow : kind === "storm" ? CloudLightning : kind === "fog" ? CloudFog : Cloud;
  return <Icon className={`weather-icon weather-icon--${kind}`} size={size} strokeWidth={1.5} absoluteStrokeWidth aria-hidden="true" />;
}
