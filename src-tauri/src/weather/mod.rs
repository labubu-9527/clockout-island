//! Fixed-endpoint Open-Meteo weather access and validated frontend DTOs.
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::time::Duration;
pub(crate) mod qweather;
pub(crate) mod location;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WeatherCity {
    pub id: u64,
    pub name: String,
    #[serde(default)]
    pub admin1: String,
    pub country: String,
    pub latitude: f64,
    pub longitude: f64,
    pub timezone: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WeatherCurrent {
    pub time: i64,
    pub temperature: f64,
    pub apparent_temperature: f64,
    pub humidity: f64,
    pub wind_speed: f64,
    pub weather_code: u8,
    pub is_day: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WeatherHour {
    pub time: i64,
    pub temperature: f64,
    pub weather_code: u8,
}

#[derive(Debug, Serialize)]
pub struct WeatherForecast {
    pub timezone: String,
    pub current: WeatherCurrent,
    pub hourly: Vec<WeatherHour>,
    pub daily: Vec<WeatherDay>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WeatherDay {
    pub time: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sunrise: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sunset: Option<i64>,
    pub temperature_max: f64,
    pub temperature_min: f64,
    pub weather_code: u8,
}

fn validate_coordinates(latitude: f64, longitude: f64) -> Result<(), String> {
    if !latitude.is_finite()
        || !longitude.is_finite()
        || !(-90.0..=90.0).contains(&latitude)
        || !(-180.0..=180.0).contains(&longitude)
    {
        return Err("Invalid weather coordinates.".into());
    }
    Ok(())
}

fn validate_query(query: &str) -> Result<&str, String> {
    let query = query.trim();
    if query.is_empty() || query.chars().count() > 100 || query.chars().any(char::is_control) {
        return Err("City search must contain 1–100 characters without control characters.".into());
    }
    Ok(query)
}

fn valid_text(text: &str) -> bool {
    !text.trim().is_empty() && text.len() <= 256 && !text.chars().any(char::is_control)
}

fn parse_cities(value: Value) -> Result<Vec<WeatherCity>, String> {
    if !value.is_object() || value.get("error").and_then(Value::as_bool) == Some(true) {
        return Err("The city service returned an invalid response.".into());
    }
    let Some(results) = value.get("results") else {
        return Ok(Vec::new());
    };
    let cities: Vec<WeatherCity> = serde_json::from_value(results.clone())
        .map_err(|error| format!("Invalid city response: {error}"))?;
    if cities.len() > 20 {
        return Err("Too many city results.".into());
    }
    for city in &cities {
        validate_coordinates(city.latitude, city.longitude)?;
        if city.id == 0
            || !valid_text(&city.name)
            || !valid_text(&city.country)
            || !valid_text(&city.timezone)
            || city.admin1.len() > 256
        {
            return Err("The city service returned invalid city details.".into());
        }
    }
    Ok(cities)
}

#[derive(Deserialize)]
struct ForecastResponse {
    timezone: String,
    current: CurrentResponse,
    hourly: HourlyResponse,
    #[serde(default)]
    daily: Option<DailyResponse>,
}
#[derive(Deserialize)]
struct DailyResponse {
    time: Vec<i64>,
    #[serde(default)]
    sunrise: Option<Vec<Option<i64>>>,
    #[serde(default)]
    sunset: Option<Vec<Option<i64>>>,
    temperature_2m_max: Vec<f64>,
    temperature_2m_min: Vec<f64>,
    weather_code: Vec<u8>,
}
#[derive(Deserialize)]
struct CurrentResponse {
    time: i64,
    temperature_2m: f64,
    apparent_temperature: f64,
    relative_humidity_2m: f64,
    wind_speed_10m: f64,
    weather_code: u8,
    is_day: u8,
}
#[derive(Deserialize)]
struct HourlyResponse {
    time: Vec<i64>,
    temperature_2m: Vec<f64>,
    weather_code: Vec<u8>,
}
fn valid_code(code: u8) -> bool {
    matches!(code, 0..=3 | 45 | 48 | 51 | 53 | 55 | 56 | 57 | 61 | 63 | 65 | 66 | 67 | 71 | 73 | 75 | 77 | 80..=82 | 85 | 86 | 95 | 96 | 99)
}
fn valid_temperature(value: f64) -> bool {
    value.is_finite() && (-150.0..=100.0).contains(&value)
}
fn valid_time(value: i64) -> bool {
    (1..=32_503_680_000).contains(&value)
}

fn parse_forecast(value: Value) -> Result<WeatherForecast, String> {
    let data: ForecastResponse = serde_json::from_value(value)
        .map_err(|error| format!("Invalid weather response: {error}"))?;
    let current = data.current;
    let hours = data.hourly;
    let mut daily = Vec::new();
    if let Some(days) = data.daily {
        let count = days.time.len();
        if count == 0
            || count > 7
            || count != days.temperature_2m_max.len()
            || count != days.temperature_2m_min.len()
            || count != days.weather_code.len()
            || days.sunrise.as_ref().is_some_and(|v| v.len() != count)
            || days.sunset.as_ref().is_some_and(|v| v.len() != count)
        {
            return Err("Invalid daily forecast lengths.".into());
        }
        for (index, (((time, max), min), code)) in days
            .time
            .into_iter()
            .zip(days.temperature_2m_max)
            .zip(days.temperature_2m_min)
            .zip(days.weather_code).enumerate()
        {
            let sunrise = days.sunrise.as_ref().and_then(|v| v[index]);
            let sunset = days.sunset.as_ref().and_then(|v| v[index]);
            if sunrise.is_some_and(|v| !valid_time(v)) || sunset.is_some_and(|v| !valid_time(v))
                || !valid_time(time)
                || !valid_temperature(max)
                || !valid_temperature(min)
                || min > max
                || !valid_code(code)
                || daily
                    .last()
                    .is_some_and(|day: &WeatherDay| day.time >= time)
            {
                return Err("Invalid daily forecast values.".into());
            }
            daily.push(WeatherDay {
                time, sunrise, sunset,
                temperature_max: max,
                temperature_min: min,
                weather_code: code,
            });
        }
    }
    if !valid_text(&data.timezone)
        || !valid_time(current.time)
        || !valid_temperature(current.temperature_2m)
        || !valid_temperature(current.apparent_temperature)
        || !(0.0..=100.0).contains(&current.relative_humidity_2m)
        || !current.wind_speed_10m.is_finite()
        || !(0.0..=1000.0).contains(&current.wind_speed_10m)
        || !valid_code(current.weather_code)
        || current.is_day > 1
        || hours.time.is_empty()
        || hours.time.len() > 192
        || hours.time.len() != hours.temperature_2m.len()
        || hours.time.len() != hours.weather_code.len()
        || hours.time.iter().any(|time| !valid_time(*time))
        || hours.time.windows(2).any(|times| times[0] >= times[1])
        || hours
            .temperature_2m
            .iter()
            .any(|value| !valid_temperature(*value))
        || hours.weather_code.iter().any(|code| !valid_code(*code))
    {
        return Err("The weather service returned unsupported or invalid weather data.".into());
    }
    Ok(WeatherForecast {
        daily,
        timezone: data.timezone,
        current: WeatherCurrent {
            time: current.time,
            temperature: current.temperature_2m,
            apparent_temperature: current.apparent_temperature,
            humidity: current.relative_humidity_2m,
            wind_speed: current.wind_speed_10m,
            weather_code: current.weather_code,
            is_day: current.is_day == 1,
        },
        hourly: hours
            .time
            .into_iter()
            .zip(hours.temperature_2m)
            .zip(hours.weather_code)
            .map(|((time, temperature), weather_code)| WeatherHour {
                time,
                temperature,
                weather_code,
            })
            .collect(),
    })
}

fn client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .timeout(Duration::from_secs(15))
        .connect_timeout(Duration::from_secs(5))
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(|error| format!("Unable to initialize weather connection: {error}"))
}

async fn read_response(response: reqwest::Response) -> Result<Value, String> {
    let mut response = response
        .error_for_status()
        .map_err(|error| format!("Weather service request failed: {error}"))?;
    // Bound decoded data even when a server omits Content-Length.
    let mut bytes = Vec::new();
    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|error| format!("Unable to read weather data: {error}"))?
    {
        if bytes.len() + chunk.len() > 512_000 {
            return Err("Weather response is too large.".into());
        }
        bytes.extend_from_slice(&chunk);
    }
    serde_json::from_slice(&bytes).map_err(|error| format!("Unable to parse weather data: {error}"))
}

#[tauri::command]
pub async fn search_weather_cities(
    query: String,
    language: String,
) -> Result<Vec<WeatherCity>, String> {
    let query = validate_query(&query)?;
    let language = match language.as_str() {
        "zh" | "zh-CN" => "zh",
        "en" | "en-US" => "en",
        _ => return Err("Unsupported city search language.".into()),
    };
    let mut url = reqwest::Url::parse("https://geocoding-api.open-meteo.com/v1/search")
        .map_err(|error| error.to_string())?;
    url.query_pairs_mut().extend_pairs(&[
        ("name", query),
        ("language", language),
        ("count", "10"),
        ("format", "json"),
    ]);
    let response = client()?
        .get(url)
        .send()
        .await
        .map_err(|error| format!("Unable to search cities: {error}"))?;
    parse_cities(read_response(response).await?)
}

#[tauri::command]
pub async fn get_weather_forecast(
    latitude: f64,
    longitude: f64,
) -> Result<WeatherForecast, String> {
    validate_coordinates(latitude, longitude)?;
    let mut url = reqwest::Url::parse("https://api.open-meteo.com/v1/forecast")
        .map_err(|error| error.to_string())?;
    url.query_pairs_mut().extend_pairs(&[("latitude", latitude.to_string()), ("longitude", longitude.to_string()),
            ("current", "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day".into()),
            ("hourly", "temperature_2m,weather_code".into()), ("timezone", "auto".into()),
            ("timeformat", "unixtime".into()), ("forecast_days", "7".into()),
            ("daily", "temperature_2m_max,temperature_2m_min,weather_code,sunrise,sunset".into()),
            ("temperature_unit", "celsius".into()), ("wind_speed_unit", "kmh".into())]);
    let response = client()?
        .get(url)
        .send()
        .await
        .map_err(|error| format!("Unable to load weather: {error}"))?;
    parse_forecast(read_response(response).await?)
}

#[tauri::command]
pub async fn open_weather_page(app: tauri::AppHandle) -> Result<(), String> {
    use tauri::Emitter;
    crate::island::show_island(&app)?;
    app.emit_to("main", "weather-open-requested", ())
        .map_err(|error| format!("Unable to open weather page: {error}"))
}

macro_rules! tauri_commands {
    ($next:ident [$($done:tt)*] $($rest:tt)*) => {
        $next!([$($done)*
            crate::weather::search_weather_cities,
            crate::weather::location::locate_weather_city,
            crate::weather::get_weather_forecast,
            crate::weather::qweather::search_qweather_cities,
            crate::weather::qweather::get_qweather_forecast,
            crate::weather::qweather::has_weather_secret,
            crate::weather::qweather::save_weather_secret,
            crate::weather::qweather::test_qweather_connection,
            crate::weather::open_weather_page,
        ] $($rest)*)
    };
}
pub(crate) use tauri_commands;

#[cfg(test)]
mod tests;
