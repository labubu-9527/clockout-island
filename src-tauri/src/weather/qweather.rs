//! QWeather uses only validated tenant hosts; credentials never enter DTOs or URLs.
use super::*;
use keyring::{Entry, Error as KeyringError};
use tauri::webview::cookie::time::{format_description::well_known::Rfc3339, OffsetDateTime};

pub(super) fn validate_host(host: &str) -> Result<reqwest::Url, String> {
    let host = host.trim();
    let address = if host.contains("://") {
        host.to_owned()
    } else {
        format!("https://{host}")
    };
    let url = reqwest::Url::parse(&address).map_err(|_| "Invalid QWeather host.")?;
    let domain = url.host_str().unwrap_or_default();
    if url.scheme() != "https"
        || !domain.ends_with(".qweatherapi.com")
        || domain.trim_end_matches(".qweatherapi.com").is_empty()
        || !url.username().is_empty()
        || url.password().is_some()
        || url.port().is_some()
        || url.path() != "/"
        || url.query().is_some()
        || url.fragment().is_some()
        || host.contains(":443")
    {
        return Err("Use your official HTTPS tenant host ending in .qweatherapi.com, without a path or port.".into());
    }
    Ok(url)
}
fn credential() -> Result<Entry, String> {
    Entry::new("com.focusd.island.weather", "qweather")
        .map_err(|error| format!("Unable to open weather credential: {error}"))
}
fn read_secret() -> Result<Option<String>, String> {
    match credential()?.get_password() {
        Ok(secret) => Ok(Some(secret)),
        Err(KeyringError::NoEntry) => Ok(None),
        Err(error) => Err(format!(
            "Unable to read Windows weather credential: {error}"
        )),
    }
}
fn validate_secret(secret: &str) -> Result<&str, String> {
    let secret = secret.trim();
    if secret.is_empty()
        || secret.len() > 2000
        || !secret.is_ascii()
        || secret.chars().any(|c| c.is_control() || c.is_whitespace())
    {
        return Err("Enter a valid QWeather API key.".into());
    }
    Ok(secret)
}
fn required_secret() -> Result<String, String> {
    read_secret()?.ok_or_else(|| "Configure your QWeather API key first.".into())
}
#[tauri::command]
pub async fn has_weather_secret() -> Result<bool, String> {
    Ok(read_secret()?.is_some())
}
#[tauri::command]
pub async fn save_weather_secret(secret: String) -> Result<(), String> {
    credential()?
        .set_password(validate_secret(&secret)?)
        .map_err(|error| format!("Unable to save Windows weather credential: {error}"))
}
async fn request(
    host: &str,
    path: &str,
    parameters: &[(&str, &str)],
    secret: &str,
) -> Result<Value, String> {
    let mut url = validate_host(host)?;
    url.set_path(path);
    url.query_pairs_mut()
        .extend_pairs(parameters.iter().copied());
    let response = client()?
        .get(url)
        .header("X-QW-Api-Key", validate_secret(secret)?)
        .send()
        .await
        .map_err(|_| "Unable to connect to QWeather. Check the host and network.".to_string())?;
    let value = read_response(response).await?;
    match value.get("code").and_then(Value::as_str) {
        Some("200") => Ok(value),
        Some("204") if path == "/geo/v2/city/lookup" => Ok(value),
        Some(code) if code.len() <= 3 && code.chars().all(|c| c.is_ascii_digit()) => Err(format!(
            "QWeather returned error {code}. Check your host, key and API subscription."
        )),
        _ => Err("QWeather returned an invalid response.".into()),
    }
}
fn text<'a>(value: &'a Value, field: &str) -> Result<&'a str, String> {
    value
        .get(field)
        .and_then(Value::as_str)
        .filter(|s| valid_text(s))
        .ok_or_else(|| format!("Invalid QWeather field: {field}"))
}
fn number(value: &Value, field: &str) -> Result<f64, String> {
    text(value, field)?
        .parse::<f64>()
        .ok()
        .filter(|v| v.is_finite())
        .ok_or_else(|| format!("Invalid QWeather number: {field}"))
}
fn datetime(value: &str) -> Result<OffsetDateTime, String> {
    // QWeather uses ISO 8601 minute precision, whereas RFC3339 requires seconds.
    let normalized = if value.is_ascii()
        && value.len() >= 17
        && matches!(value.as_bytes()[16], b'+' | b'-' | b'Z')
    {
        format!("{}:00{}", &value[..16], &value[16..])
    } else {
        value.to_owned()
    };
    OffsetDateTime::parse(&normalized, &Rfc3339).map_err(|_| "Invalid QWeather timestamp.".into())
}
fn timestamp(value: &str) -> Result<i64, String> {
    let time = datetime(value)?.unix_timestamp();
    if !valid_time(time) {
        return Err("Invalid QWeather timestamp.".into());
    }
    Ok(time)
}
pub(super) fn parse_cities(value: Value) -> Result<Vec<WeatherCity>, String> {
    match value.get("code").and_then(Value::as_str) {
        Some("204") => return Ok(Vec::new()),
        Some("200") => {}
        _ => return Err("QWeather city lookup failed.".into()),
    }
    let locations = value
        .get("location")
        .and_then(Value::as_array)
        .filter(|v| v.len() <= 20)
        .ok_or("Invalid QWeather cities.")?;
    locations
        .iter()
        .map(|city| {
            let latitude = number(city, "lat")?;
            let longitude = number(city, "lon")?;
            validate_coordinates(latitude, longitude)?;
            let id = text(city, "id")?
                .parse::<u64>()
                .ok()
                .filter(|id| *id > 0)
                .ok_or("Invalid QWeather city id.")?;
            Ok(WeatherCity {
                id,
                name: text(city, "name")?.into(),
                admin1: city
                    .get("adm1")
                    .and_then(Value::as_str)
                    .filter(|s| s.is_empty() || valid_text(s))
                    .unwrap_or_default()
                    .into(),
                country: text(city, "country")?.into(),
                latitude,
                longitude,
                timezone: text(city, "tz")?.into(),
            })
        })
        .collect()
}
pub(super) fn weather_code(icon: &str) -> Result<u8, String> {
    match icon.parse::<u16>().map_err(|_| "Invalid QWeather icon.")? {
        100 | 150 => Ok(0),
        101 | 151 => Ok(2),
        102 | 103 | 152 | 153 => Ok(1),
        104 => Ok(3),
        300 | 350 => Ok(80),
        301 | 351 => Ok(81),
        302 | 303 => Ok(95),
        304 => Ok(99),
        305 | 309 | 399 => Ok(61),
        306 => Ok(63),
        313 => Ok(66),
        307 | 308 | 310..=312 => Ok(65),
        314 => Ok(61),
        315 => Ok(63),
        316..=318 => Ok(65),
        400 | 407 | 457 | 499 => Ok(71),
        401 | 408 => Ok(73),
        402 | 403 | 409 | 410 => Ok(75),
        404..=406 | 456 => Ok(77),
        500 | 501 | 509 | 510 | 514 | 515 => Ok(45),
        502..=508 | 511..=513 => Ok(48),
        _ => Err("Unsupported QWeather condition.".into()),
    }
}
fn array<'a>(value: &'a Value, field: &str, max: usize) -> Result<&'a Vec<Value>, String> {
    value
        .get(field)
        .and_then(Value::as_array)
        .filter(|v| !v.is_empty() && v.len() <= max)
        .ok_or_else(|| format!("Invalid QWeather {field}."))
}
fn sun_time(day: &Value, field: &str, date: &str, timezone: &str) -> Result<Option<i64>, String> {
    let Some(value) = day.get(field).filter(|value| !value.is_null()) else { return Ok(None); };
    let clock = value.as_str().ok_or("Invalid QWeather sun time.")?;
    if clock.is_empty() { return Ok(None); }
    // Current API fields include their own date and UTC offset, which can differ from today's
    // observation after a daylight saving transition. Never replace that offset with today's.
    if clock.contains('T') { return timestamp(clock).map(Some); }
    // Keep older HH:mm responses readable using the existing forecast-day offset convention.
    if clock.len() != 5 || !clock.is_ascii() || clock.as_bytes()[2] != b':' {
        return Err("Invalid QWeather sun time.".into());
    }
    timestamp(&format!("{date}T{clock}:00{timezone}")).map(Some)
}

pub(super) fn parse_forecast(
    now: Value,
    hours: Value,
    days: Value,
) -> Result<WeatherForecast, String> {
    let current = now.get("now").ok_or("Missing QWeather current weather.")?;
    let time_text = text(current, "obsTime")?;
    let observation = datetime(time_text)?;
    let offset = observation.offset().whole_seconds();
    let timezone = format!(
        "{}{:02}:{:02}",
        if offset < 0 { "-" } else { "+" },
        offset.abs() / 3600,
        offset.abs() % 3600 / 60
    );
    let temperature = number(current, "temp")?;
    let apparent_temperature = number(current, "feelsLike")?;
    let humidity = number(current, "humidity")?;
    let wind_speed = number(current, "windSpeed")?;
    if !valid_temperature(temperature)
        || !valid_temperature(apparent_temperature)
        || !(0.0..=100.0).contains(&humidity)
        || !(0.0..=1000.0).contains(&wind_speed)
    {
        return Err("Invalid QWeather current values.".into());
    }
    let mut hourly = Vec::new();
    for hour in array(&hours, "hourly", 24)? {
        let time = timestamp(text(hour, "fxTime")?)?;
        let temperature = number(hour, "temp")?;
        if !valid_temperature(temperature)
            || hourly.last().is_some_and(|h: &WeatherHour| h.time >= time)
        {
            return Err("Invalid QWeather hourly values.".into());
        }
        hourly.push(WeatherHour {
            time,
            temperature,
            weather_code: weather_code(text(hour, "icon")?)?,
        });
    }
    let mut daily = Vec::new();
    for day in array(&days, "daily", 7)? {
        let date = text(day, "fxDate")?;
        let time = timestamp(&format!("{date}T00:00:00{timezone}"))?;
        let max = number(day, "tempMax")?;
        let min = number(day, "tempMin")?;
        if !valid_temperature(max)
            || !valid_temperature(min)
            || min > max
            || daily.last().is_some_and(|d: &WeatherDay| d.time >= time)
        {
            return Err("Invalid QWeather daily values.".into());
        }
        daily.push(WeatherDay {
            time,
            sunrise: sun_time(day, "sunrise", date, &timezone)?,
            sunset: sun_time(day, "sunset", date, &timezone)?,
            temperature_max: max,
            temperature_min: min,
            weather_code: weather_code(text(day, "iconDay")?)?,
        });
    }
    let icon = text(current, "icon")?;
    let is_day = match icon.parse::<u16>() {
        Ok(150..=153 | 350 | 351 | 456 | 457) => false,
        _ => (6..18).contains(&observation.hour()),
    };
    Ok(WeatherForecast {
        timezone,
        current: WeatherCurrent {
            time: timestamp(time_text)?,
            temperature,
            apparent_temperature,
            humidity,
            wind_speed,
            weather_code: weather_code(icon)?,
            is_day,
        },
        hourly,
        daily,
    })
}
#[tauri::command]
pub async fn search_qweather_cities(
    query: String,
    language: String,
    host: String,
) -> Result<Vec<WeatherCity>, String> {
    let query = validate_query(&query)?;
    let language = match language.as_str() {
        "zh" | "zh-CN" => "zh",
        "en" | "en-US" => "en",
        _ => return Err("Unsupported city search language.".into()),
    };
    parse_cities(
        request(
            &host,
            "/geo/v2/city/lookup",
            &[("location", query), ("lang", language), ("number", "10")],
            &required_secret()?,
        )
        .await?,
    )
}
#[tauri::command]
pub async fn get_qweather_forecast(
    latitude: f64,
    longitude: f64,
    host: String,
) -> Result<WeatherForecast, String> {
    validate_coordinates(latitude, longitude)?;
    let location = format!("{longitude:.2},{latitude:.2}");
    let secret = required_secret()?;
    let now = request(
        &host,
        "/v7/weather/now",
        &[("location", &location)],
        &secret,
    )
    .await?;
    let hourly = request(
        &host,
        "/v7/weather/24h",
        &[("location", &location)],
        &secret,
    )
    .await?;
    let daily = request(&host, "/v7/weather/7d", &[("location", &location)], &secret).await?;
    parse_forecast(now, hourly, daily)
}
#[tauri::command]
pub async fn test_qweather_connection(host: String, secret: Option<String>) -> Result<(), String> {
    let secret = match secret {
        Some(secret) => {
            validate_secret(&secret)?;
            secret
        }
        None => required_secret()?,
    };
    request(
        &host,
        "/geo/v2/city/lookup",
        &[("location", "101010100"), ("number", "1")],
        &secret,
    )
    .await?;
    Ok(())
}
