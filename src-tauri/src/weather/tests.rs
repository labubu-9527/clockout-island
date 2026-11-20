use super::*;
use serde_json::{json, Value};

fn forecast() -> Value {
    json!({"timezone":"Asia/Shanghai","current":{"time":1795000000,"temperature_2m":18.0,"apparent_temperature":17.0,"relative_humidity_2m":60,"wind_speed_10m":4.5,"weather_code":1,"is_day":1},"hourly":{"time":[1795000000,1795003600],"temperature_2m":[18.0,19.0],"weather_code":[1,2]}})
}

#[test]
fn validates_request_inputs() {
    assert!(validate_coordinates(90.0, -180.0).is_ok());
    for (lat, lon) in [
        (91.0, 0.0),
        (0.0, 181.0),
        (f64::NAN, 0.0),
        (0.0, f64::INFINITY),
    ] {
        assert!(validate_coordinates(lat, lon).is_err());
    }
    assert_eq!(validate_query("  Beijing  ").unwrap(), "Beijing");
    assert!(validate_query(" ").is_err());
    assert!(validate_query(&"x".repeat(101)).is_err());
    assert!(validate_query("a\nb").is_err());
}

#[test]
fn converts_forecast_to_camel_case_dto() {
    let parsed = parse_forecast(forecast()).unwrap();
    assert!(parsed.current.is_day);
    assert_eq!(parsed.hourly.len(), 2);
    let serialized = serde_json::to_value(parsed).unwrap();
    assert_eq!(serialized["current"]["weatherCode"], 1);
    assert_eq!(serialized["current"]["time"], 1795000000i64);
}

#[test]
fn rejects_invalid_forecast_values() {
    for (path, value) in [
        (vec!["current", "temperature_2m"], Value::Null),
        (vec!["current", "relative_humidity_2m"], json!(101)),
        (vec!["current", "weather_code"], json!(4)),
        (vec!["current", "is_day"], json!(2)),
        (vec!["current", "time"], json!("2026-11-19")),
        (vec!["hourly", "weather_code"], json!([1])),
        (vec!["hourly", "temperature_2m"], json!([null, 19])),
        (vec!["hourly", "time"], json!([1795003600, 1795000000])),
    ] {
        let mut response = forecast();
        response[path[0]][path[1]] = value;
        assert!(parse_forecast(response).is_err(), "{path:?}");
    }
}

#[test]
fn accepts_empty_city_results_and_missing_admin() {
    assert!(parse_cities(json!({})).unwrap().is_empty());
    let result = parse_cities(json!({"results":[{"id":1,"name":"Test","country":"China","latitude":30,"longitude":120,"timezone":"Asia/Shanghai"}]})).unwrap();
    assert_eq!(result[0].admin1, "");
    assert!(parse_cities(json!({"results":null})).is_err());
    assert!(parse_cities(json!({"results":[{"id":1}]})).is_err());
}

#[test]
fn qweather_host_restricts_secret_destination() {
    assert!(super::qweather::validate_host("abc.qweatherapi.com").is_ok());
    for host in [
        "http://abc.qweatherapi.com",
        "https://abc.qweatherapi.com/path",
        "abc.qweatherapi.com.evil.test",
        "https://user@abc.qweatherapi.com",
        "qweatherapi.com",
        "abc.qweatherapi.com:444",
    ] {
        assert!(super::qweather::validate_host(host).is_err(), "{host}");
    }
}

#[test]
fn qweather_geo_and_icon_conversion() {
    let cities = super::qweather::parse_cities(json!({"code":"200","location":[{"id":"101010100","name":"Beijing","adm1":"Beijing","country":"China","lat":"39.90","lon":"116.40","tz":"Asia/Shanghai"}]})).unwrap();
    assert_eq!(cities[0].id, 101010100);
    assert!(super::qweather::parse_cities(json!({"code":"401"})).is_err());
    assert_eq!(super::qweather::weather_code("305").unwrap(), 61);
    assert_eq!(super::qweather::weather_code("401").unwrap(), 73);
    assert_eq!(super::qweather::weather_code("313").unwrap(), 66);
    assert_eq!(super::qweather::weather_code("399").unwrap(), 61);
    assert_eq!(super::qweather::weather_code("499").unwrap(), 71);
    assert!(super::qweather::weather_code("999").is_err());
}

fn qweather_forecast() -> (Value, Value, Value) {
    (
        json!({"now":{"obsTime":"2026-11-19T15:00+08:00","temp":"18","feelsLike":"17","humidity":"60","windSpeed":"4.5","icon":"100"}}),
        json!({"hourly":[{"fxTime":"2026-11-19T16:00+08:00","temp":"19","icon":"101"}]}),
        json!({"daily":[{"fxDate":"2026-11-19","tempMax":"21","tempMin":"12","iconDay":"100"}]}),
    )
}
#[test]
fn qweather_parses_local_dates_and_rejects_bad_numbers() {
    let (now, hours, days) = qweather_forecast();
    let parsed = super::qweather::parse_forecast(now.clone(), hours.clone(), days.clone()).unwrap();
    assert_eq!(parsed.current.time, 1795071600);
    assert_eq!(parsed.daily[0].time, 1795017600);
    assert_eq!(parsed.timezone, "+08:00");
    assert_eq!(parsed.daily[0].temperature_max, 21.0);
    let mut bad = now.clone();
    bad["now"]["humidity"] = json!("NaN");
    assert!(super::qweather::parse_forecast(bad, hours.clone(), days.clone()).is_err());
    let mut bad_days = days;
    bad_days["daily"][0]["tempMin"] = json!("30");
    assert!(super::qweather::parse_forecast(now, hours, bad_days).is_err());
}
#[test]
fn open_meteo_daily_forecast_validates_parallel_arrays() {
    let mut value = forecast();
    value["daily"] = json!({"time":[1795000000],"temperature_2m_max":[20],"temperature_2m_min":[10],"weather_code":[1]});
    assert_eq!(parse_forecast(value.clone()).unwrap().daily.len(), 1);
    value["daily"]["temperature_2m_min"] = json!([]);
    assert!(parse_forecast(value).is_err());
}


#[test]
fn daily_sun_times_are_optional_validated_and_serialized() {
    let mut value = forecast();
    value["daily"] = json!({"time":[1795000000],"temperature_2m_max":[20],"temperature_2m_min":[10],"weather_code":[1],"sunrise":[1795003600],"sunset":[1795040000]});
    let dto = serde_json::to_value(parse_forecast(value.clone()).unwrap()).unwrap();
    assert_eq!(dto["daily"][0]["sunrise"], 1795003600_i64);
    assert_eq!(dto["daily"][0]["sunset"], 1795040000_i64);
    value["daily"]["sunrise"] = json!([]);
    assert!(parse_forecast(value.clone()).is_err());
    value["daily"]["sunrise"] = json!([null]);
    value["daily"]["sunset"] = json!([null]);
    let dto = serde_json::to_value(parse_forecast(value.clone()).unwrap()).unwrap();
    assert!(dto["daily"][0].get("sunrise").is_none());
    value["daily"]["sunrise"] = json!([-1]);
    assert!(parse_forecast(value).is_err());
}

#[test]
fn qweather_sun_times_use_forecast_day_and_local_offset() {
    let (now, hours, mut days) = qweather_forecast();
    days["daily"][0]["sunrise"] = json!("06:30");
    days["daily"][0]["sunset"] = json!("17:45");
    let parsed = super::qweather::parse_forecast(now.clone(), hours.clone(), days.clone()).unwrap();
    let dto = serde_json::to_value(parsed).unwrap();
    assert_eq!(dto["daily"][0]["sunrise"], 1795041000_i64);
    assert_eq!(dto["daily"][0]["sunset"], 1795081500_i64);
    days["daily"][0]["sunrise"] = json!("25:00");
    assert!(super::qweather::parse_forecast(now, hours, days).is_err());
}

#[test]
fn qweather_documented_sun_timestamps_keep_their_own_date_and_offset() {
    for (sunrise, sunset, expected_rise, expected_set) in [
        ("2024-08-11T04:22Z", "2024-08-11T12:31Z", 1723350120_i64, 1723379460_i64),
        ("2024-08-11T04:22+08:00", "2024-08-11T18:31+08:00", 1723321320, 1723372260),
        ("2026-03-08T07:15-04:00", "2026-03-08T18:45-04:00", 1772968500, 1773009900),
    ] {
        let (mut now, hours, mut days) = qweather_forecast();
        // A future day's timestamps may have a different UTC offset after daylight saving changes.
        now["now"]["obsTime"] = json!("2026-03-07T15:00-05:00");
        days["daily"][0]["sunrise"] = json!(sunrise);
        days["daily"][0]["sunset"] = json!(sunset);
        let parsed = super::qweather::parse_forecast(now, hours, days).unwrap();
        assert_eq!(parsed.daily[0].sunrise, Some(expected_rise), "{sunrise}");
        assert_eq!(parsed.daily[0].sunset, Some(expected_set), "{sunset}");
    }
}
