use super::*;
use serde_json::json;

fn ipwho() -> Value {
    json!({"success":true,"city":"Hangzhou","region":"Zhejiang","country":"China","latitude":30.2,"longitude":120.1,"timezone":{"id":"Asia/Shanghai"}})
}

#[test]
fn validates_location_and_retains_real_names_without_exposing_ip() {
    let city = parse_location(ipwho(), Source::IpWho).unwrap();
    assert_eq!(city.name, "Hangzhou");
    assert_eq!(city.timezone, "Asia/Shanghai");
    assert_eq!(city.id, 1);
    let dto = serde_json::to_value(city).unwrap();
    assert!(dto.get("ip").is_none());
    for (field, invalid) in [("latitude", json!(91)), ("longitude", json!(null)),
        ("country", json!("")), ("success", json!(false))] {
        let mut value = ipwho();
        value[field] = invalid;
        assert!(parse_location(value, Source::IpWho).is_err(), "{field}");
    }
    let city = parse_location(json!({"cityName":"Berlin","regionName":"Berlin","countryName":"Germany",
        "latitude":52.5,"longitude":13.4,"timeZones":["Europe/Berlin"]}), Source::FreeIp).unwrap();
    assert_eq!(city.timezone, "Europe/Berlin");
    assert_eq!(timezone("+08:00"), "UTC");
    assert_eq!(timezone("Asia/../../secret"), "UTC");
}

#[test]
fn direct_sources_precede_proxy_and_invalid_payloads_fall_back() {
    let mut calls = Vec::new();
    let result = tauri::async_runtime::block_on(locate_with(|source, direct| {
        calls.push((source, direct));
        std::future::ready(if calls.len() == 4 { Ok(json!({"cityName":"Berlin","regionName":"Berlin","countryName":"Germany",
            "latitude":52.5,"longitude":13.4})) } else { Err("offline".into()) })
    }));
    assert_eq!(result.unwrap().name, "Berlin");
    assert_eq!(calls, [(Source::IpWho, true), (Source::FreeIp, true), (Source::IpWho, false), (Source::FreeIp, false)]);
    let mut calls = Vec::new();
    let result = tauri::async_runtime::block_on(locate_with(|source, direct| {
        calls.push((source, direct));
        std::future::ready(if calls.len() == 3 { Ok(ipwho()) } else { Ok(json!({})) })
    })).unwrap();
    assert_eq!(result.name, "Hangzhou");
    assert_eq!(calls.len(), 3);
}
