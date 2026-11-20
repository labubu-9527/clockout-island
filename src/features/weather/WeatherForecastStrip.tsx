import { useLocale, useTranslation } from '../../i18n';
import type { WeatherForecast } from './api';
import { upcomingHours } from './model';
import { WeatherIcon } from './WeatherIcon';
export function WeatherForecastStrip({ forecast, hourly }: { forecast: WeatherForecast; hourly: boolean }) {
  const { locale } = useLocale();
  const text = useTranslation().weather;
  const days = forecast.daily ?? [];
  const values = days.flatMap(day => [day.temperatureMax, day.temperatureMin]);
  const minimum = Math.min(...values), maximum = Math.max(...values);
  const curve = (high: boolean) => {
    const points = days.map((day, i) => ({ x: (i + .5) * 100 / days.length, y: 12 + (maximum - (high ? day.temperatureMax : day.temperatureMin)) / Math.max(1, maximum - minimum) * 56 }));
    return points.map((point, index) => {
      if (!index) return `M ${point.x} ${point.y}`;
      const previous = points[index - 1], middle = (previous.x + point.x) / 2;
      return `C ${middle} ${previous.y}, ${middle} ${point.y}, ${point.x} ${point.y}`;
    }).join(' ');
  };
  const format = (time: number, options: Intl.DateTimeFormatOptions) => {
    try { return new Intl.DateTimeFormat(locale, { timeZone: forecast.timezone, ...options }).format(time * 1000); } catch { return '--'; }
  };
  if (hourly) return <div className="weather-hours">{upcomingHours(forecast.hourly, Date.now() / 1000).map(hour => <div key={hour.time}>
    <span>{format(hour.time, { hour: '2-digit' })}</span><WeatherIcon code={hour.weatherCode} /><strong>{Math.round(hour.temperature)}°</strong>
  </div>)}</div>;
  if (!days.length) return <p className="weather-empty">{text.noWeather}</p>;
  return <div className="weather-seven"><div className="weather-seven__labels">{days.map(day => <div key={day.time}>
    <span>{format(day.time, { weekday: 'short' })}</span><small>{format(day.time, { month: 'numeric', day: 'numeric' })}</small>
    <WeatherIcon code={day.weatherCode} size={23} /><strong>{Math.round(day.temperatureMax)}°</strong><span className="weather-seven__low">{Math.round(day.temperatureMin)}°</span>
  </div>)}</div><svg className="weather-seven__curves" viewBox="0 0 100 80" preserveAspectRatio="none" aria-hidden="true">
    <path d={curve(true)} className="weather-seven__high-line" /><path d={curve(false)} className="weather-seven__low-line" />
  </svg></div>;
}
