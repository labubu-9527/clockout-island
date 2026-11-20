//! Network-exit geolocation: fixed endpoints, direct attempts before system-proxy fallback.
use super::{read_response, valid_text, validate_coordinates, WeatherCity};
use serde_json::Value;
use std::{future::Future, time::Duration};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Source { IpWho, FreeIp }

impl Source {
    fn url(self, language: &str) -> String {
        match self {
            Self::IpWho => format!("https://ipwho.is/?lang={language}"),
            Self::FreeIp => "https://free.freeipapi.com/api/v1/json".into(),
        }
    }
}

fn field(value: &Value, key: &str) -> String {
    value.get(key).and_then(Value::as_str).filter(|text| valid_text(text))
        .unwrap_or_default().trim().to_owned()
}

fn timezone(value: &str) -> String {
    // Providers return IANA identifiers; malformed or absent hints use a portable safe default.
    let segments: Vec<_> = value.split('/').collect();
    if value == "UTC" || (value.len() <= 256 && segments.len() >= 2 && segments.len() <= 3
        && matches!(segments[0], "Africa" | "America" | "Antarctica" | "Arctic" | "Asia" | "Atlantic" | "Australia" | "Europe" | "Indian" | "Pacific" | "Etc")
        && segments.iter().all(|part| !part.is_empty() && *part != "." && *part != ".."
            && part.bytes().all(|b| b.is_ascii_alphabetic() || matches!(b, b'_' | b'-' | b'+') || b.is_ascii_digit()))) {
        value.to_owned()
    } else { "UTC".into() }
}

fn parse_location(value: Value, source: Source) -> Result<WeatherCity, String> {
    if value.get("success").and_then(Value::as_bool) == Some(false) {
        return Err("Location service returned invalid location details.".into());
    }
    let latitude = value.get("latitude").and_then(Value::as_f64).ok_or("Missing location latitude.")?;
    let longitude = value.get("longitude").and_then(Value::as_f64).ok_or("Missing location longitude.")?;
    validate_coordinates(latitude, longitude)?;
    let (city, region, country, zone) = match source {
        Source::IpWho => (field(&value, "city"), field(&value, "region"), field(&value, "country"),
            value.get("timezone").map_or(String::new(), |v| field(v, "id"))),
        Source::FreeIp => (field(&value, "cityName"), field(&value, "regionName"), field(&value, "countryName"),
            value.get("timeZones").and_then(Value::as_array).and_then(|v| v.first())
                .and_then(Value::as_str).unwrap_or_default().to_owned()),
    };
    if city.is_empty() && region.is_empty() || country.is_empty() {
        return Err("Location service returned incomplete region details.".into());
    }
    Ok(WeatherCity { id: 1, name: if city.is_empty() { region.clone() } else { city },
        admin1: region, country, latitude, longitude, timezone: timezone(&zone) })
}

async fn locate_with<F, Fut>(mut fetch: F) -> Result<WeatherCity, String>
where F: FnMut(Source, bool) -> Fut, Fut: Future<Output = Result<Value, String>> {
    for direct in [true, false] {
        for source in [Source::IpWho, Source::FreeIp] {
            if let Ok(city) = fetch(source, direct).await.and_then(|value| parse_location(value, source)) {
                return Ok(city);
            }
        }
    }
    Err("Unable to locate your city. Check the network or choose a city manually.".into())
}

fn location_client(direct: bool) -> Result<reqwest::Client, String> {
    let builder = reqwest::Client::builder().connect_timeout(Duration::from_secs(5))
        .timeout(Duration::from_secs(8)).redirect(reqwest::redirect::Policy::none());
    // Reqwest's system-proxy feature is enabled by the existing updater dependency.
    let builder = if direct { builder.no_proxy() } else { builder };
    builder.build().map_err(|_| "Unable to initialize location connection.".into())
}

#[tauri::command]
pub async fn locate_weather_city(language: String) -> Result<WeatherCity, String> {
    let language = match language.as_str() {
        "zh" | "zh-CN" => "zh-CN", "en" | "en-US" => "en",
        _ => return Err("Unsupported location language.".into()),
    };
    let direct_client = location_client(true)?;
    let proxy_client = location_client(false)?;
    locate_with(|source, direct| {
        let client = if direct { &direct_client } else { &proxy_client };
        async move {
            let response = client.get(source.url(language)).send().await
                .map_err(|_| "Location service connection failed.".to_owned())?;
            read_response(response).await.map_err(|_| "Location service returned invalid data.".to_owned())
        }
    }).await
}

#[cfg(test)]
mod tests;
