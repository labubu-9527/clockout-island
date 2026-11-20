//! Read-only device-state sampling. Unknown values deliberately remain nullable.

use crate::win32::{audio::AudioDevices, com::ComApartment, device_status};
use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DeviceStatus {
    caps_lock: Option<bool>,
    num_lock: Option<bool>,
    microphone_muted: Option<bool>,
    touchpad_enabled: Option<bool>,
}

#[tauri::command]
pub(crate) async fn get_device_status(app: tauri::AppHandle) -> Result<DeviceStatus, String> {
    // The passive observer and its snapshot are confined to the main thread.
    let (send, receive) = tokio::sync::oneshot::channel();
    app.run_on_main_thread(move || {
        let _ = send.send(device_status::keyboard_locks());
    })
    .map_err(|error| error.to_string())?;
    let (caps_lock, num_lock) = receive.await.map_err(|error| error.to_string())?;
    let (microphone_muted, touchpad_enabled) = tauri::async_runtime::spawn_blocking(|| {
        let microphone_muted = ComApartment::multithreaded()
            .ok()
            .and_then(|_apartment| AudioDevices::open().ok()?.default_microphone_muted().ok());
        (microphone_muted, device_status::touchpad_enabled())
    })
    .await
    .map_err(|error| error.to_string())?;
    Ok(DeviceStatus {
        caps_lock,
        num_lock,
        microphone_muted,
        touchpad_enabled,
    })
}

#[tauri::command]
pub(crate) async fn set_device_notices_enabled(
    app: tauri::AppHandle,
    enabled: bool,
) -> Result<(), String> {
    let (send, receive) = tokio::sync::oneshot::channel();
    app.run_on_main_thread(move || {
        let result =
            device_status::set_keyboard_observer(enabled).map_err(|error| error.to_string());
        let _ = send.send(result);
    })
    .map_err(|error| error.to_string())?;
    receive.await.map_err(|error| error.to_string())?
}

#[cfg(test)]
mod tests {
    use super::DeviceStatus;

    #[test]
    fn unavailable_devices_are_null_in_the_command_contract() {
        let status = DeviceStatus {
            caps_lock: Some(false),
            num_lock: Some(true),
            microphone_muted: None,
            touchpad_enabled: None,
        };
        assert_eq!(
            serde_json::to_value(status).unwrap(),
            serde_json::json!({
                "capsLock": false, "numLock": true,
                "microphoneMuted": null, "touchpadEnabled": null,
            })
        );
    }
}
