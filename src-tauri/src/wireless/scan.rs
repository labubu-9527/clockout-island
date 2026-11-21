//! Connected-endpoint enumeration and GATT reads, adapted from DotIsle (MIT).
use super::WirelessDevice;
use crate::win32::wireless::pnp_levels;
use std::{
    collections::BTreeMap,
    time::{Duration, Instant},
};
use windows::{
    core::{Interface, GUID},
    Devices::{
        Bluetooth::{
            BluetoothCacheMode, BluetoothConnectionStatus, BluetoothDevice, BluetoothLEDevice,
            BluetoothMajorClass, BluetoothMinorClass,
            GenericAttributeProfile::GattCommunicationStatus,
        },
        Enumeration::DeviceInformation,
    },
    Foundation::IClosable,
    Storage::Streams::DataReader,
};

struct CloseOnDrop(IClosable);
impl CloseOnDrop {
    fn for_object(object: &impl Interface) -> windows::core::Result<Self> {
        object.cast().map(Self)
    }
}
impl Drop for CloseOnDrop {
    fn drop(&mut self) {
        let _ = self.0.Close();
    }
}

// WinRT operations can remain Started when a Bluetooth endpoint disappears.
// Bound each operation and the complete scan; cancellation never starts another
// worker, so an unresponsive driver cannot cause a growing thread pool.
macro_rules! wait_until {
    ($operation:expr, $deadline:expr) => {{
        let operation = $operation;
        let deadline = $deadline.min(Instant::now() + Duration::from_secs(3));
        (|| loop {
            if operation.Status()?.0 != 0 {
                return operation.GetResults();
            }
            if Instant::now() >= deadline {
                let _ = operation.Cancel();
                return Err(windows::core::Error::from_hresult(windows::core::HRESULT(
                    0x800705B4_u32 as i32,
                )));
            }
            std::thread::sleep(Duration::from_millis(20));
        })()
    }};
}

fn category(name: &str) -> String {
    let name = name.to_lowercase();
    if ["mouse", "鼠标", "trackpad"]
        .iter()
        .any(|s| name.contains(s))
    {
        "mouse"
    } else if ["keyboard", "键盘"].iter().any(|s| name.contains(s)) {
        "keyboard"
    } else if ["controller", "gamepad", "手柄", "xbox", "dualsense"]
        .iter()
        .any(|s| name.contains(s))
    {
        "gamepad"
    } else if ["head", "buds", "pods", "耳机", "bose", "sony", "beats"]
        .iter()
        .any(|s| name.contains(s))
    {
        "headphones"
    } else {
        "device"
    }
    .into()
}
// Device metadata is authoritative; product names need not contain "headphones".
fn classified_category(
    major: BluetoothMajorClass,
    minor: BluetoothMinorClass,
) -> Option<&'static str> {
    if major == BluetoothMajorClass::AudioVideo {
        if [
            BluetoothMinorClass::AudioVideoWearableHeadset,
            BluetoothMinorClass::AudioVideoHandsFree,
            BluetoothMinorClass::AudioVideoHeadphones,
        ]
        .contains(&minor)
        {
            return Some("headphones");
        }
        if minor == BluetoothMinorClass::AudioVideoLoudspeaker {
            return Some("speaker");
        }
    }
    if major == BluetoothMajorClass::Peripheral
        && [
            BluetoothMinorClass::PeripheralJoystick,
            BluetoothMinorClass::PeripheralGamepad,
        ]
        .contains(&minor)
    {
        return Some("gamepad");
    }
    None
}
fn ble_level(device: &BluetoothLEDevice, deadline: Instant) -> Option<u8> {
    let services = wait_until!(
        device
            .GetGattServicesForUuidWithCacheModeAsync(
                GUID::from_u128(0x0000180f_0000_1000_8000_00805f9b34fb),
                BluetoothCacheMode::Cached
            )
            .ok()?,
        deadline
    )
    .ok()?;
    if services.Status().ok()? != GattCommunicationStatus::Success {
        return None;
    }
    let services = services.Services().ok()?;
    for i in 0..services.Size().ok()? {
        let service = services.GetAt(i).ok()?;
        let _service_guard = CloseOnDrop::for_object(&service).ok()?;
        let result = (|| {
            let chars = wait_until!(
                service
                    .GetCharacteristicsForUuidWithCacheModeAsync(
                        GUID::from_u128(0x00002a19_0000_1000_8000_00805f9b34fb),
                        BluetoothCacheMode::Cached
                    )
                    .ok()?,
                deadline
            )
            .ok()?;
            if chars.Status().ok()? != GattCommunicationStatus::Success {
                return None;
            }
            let chars = chars.Characteristics().ok()?;
            for j in 0..chars.Size().ok()? {
                let characteristic = chars.GetAt(j).ok()?;
                // Read the standard battery characteristic, not a permanently cached value.
                let result = wait_until!(
                    characteristic
                        .ReadValueWithCacheModeAsync(BluetoothCacheMode::Uncached)
                        .ok()?,
                    deadline
                )
                .ok()?;
                if result.Status().ok()? != GattCommunicationStatus::Success {
                    continue;
                }
                let buffer = result.Value().ok()?;
                if buffer.Length().ok()? < 1 {
                    continue;
                }
                let value = DataReader::FromBuffer(&buffer).ok()?.ReadByte().ok()?;
                if value <= 100 {
                    return Some(value);
                }
            }
            None
        })();
        if result.is_some() {
            return result;
        }
    }
    None
}

// Battery properties often live on a Hands-Free/HID sibling, not the first
// Bluetooth node. Match every address node and its non-null physical container.
fn pnp_telemetry(
    levels: &[(String, Option<u8>, Option<String>)],
    address: &str,
) -> (Option<u8>, Option<String>) {
    let containers: Vec<&str> = levels
        .iter()
        .filter(|(id, _, _)| id.contains(address))
        .filter_map(|(_, _, c)| c.as_deref())
        .collect();
    let level = levels
        .iter()
        .filter(|(id, _, c)| {
            id.contains(address) || c.as_deref().is_some_and(|c| containers.contains(&c))
        })
        .find_map(|(_, level, _)| *level);
    (level, containers.first().map(|c| (*c).to_owned()))
}
fn merge_endpoint(
    devices: &mut BTreeMap<String, WirelessDevice>,
    id: String,
    name: String,
    kind: Option<String>,
    pnp: Option<u8>,
    ble: Option<u8>,
) {
    let entry = devices.entry(id.clone()).or_insert_with(|| WirelessDevice {
        id,
        kind: category(&name),
        name,
        updated_at: super::timestamp(),
        battery_percent: None,
    });
    if let Some(kind) = kind {
        entry.kind = kind;
    }
    entry.battery_percent = pnp.or(entry.battery_percent).or(ble);
}

fn finish_enumeration(
    devices: BTreeMap<String, WirelessDevice>,
    transports: [Result<(), String>; 2],
) -> Result<Vec<WirelessDevice>, String> {
    if devices.is_empty() {
        for result in transports {
            result?;
        }
    }
    Ok(devices.into_values().collect())
}

pub(super) fn scan(deadline: Instant) -> Result<Vec<WirelessDevice>, String> {
    let _apartment =
        crate::win32::com::WinRtApartment::multithreaded().map_err(|err| err.to_string())?;
    let levels = pnp_levels(deadline);
    let mut devices = BTreeMap::<String, WirelessDevice>::new();
    let mut transports = std::array::from_fn(|_| Err("Bluetooth scan timed out".to_owned()));
    for (le, status) in [false, true].into_iter().zip(&mut transports) {
        if Instant::now() >= deadline {
            break;
        }
        let selector = if le {
            BluetoothLEDevice::GetDeviceSelectorFromConnectionStatus(
                BluetoothConnectionStatus::Connected,
            )
        } else {
            BluetoothDevice::GetDeviceSelectorFromConnectionStatus(
                BluetoothConnectionStatus::Connected,
            )
        };
        let enumeration = selector.and_then(|selector| {
            let operation = DeviceInformation::FindAllAsyncAqsFilter(&selector)?;
            let items = wait_until!(operation, deadline)?;
            let count = items.Size()?;
            Ok((items, count))
        });
        let (items, count) = match enumeration {
            Ok(items) => {
                *status = Ok(());
                items
            }
            Err(error) => {
                *status = Err(error.to_string());
                continue;
            }
        };
        for i in 0..count.min(64) {
            if Instant::now() >= deadline {
                break;
            }
            let Ok(info) = items.GetAt(i) else { continue };
            let Ok(id) = info.Id() else { continue };
            let name = info.Name().map(|s| s.to_string()).unwrap_or_default();
            let read = (|| -> windows::core::Result<(u64, Option<u8>, Option<String>)> {
                if le {
                    let device = wait_until!(BluetoothLEDevice::FromIdAsync(&id)?, deadline)?;
                    let _device_guard = CloseOnDrop::for_object(&device)?;
                    if device.ConnectionStatus()? != BluetoothConnectionStatus::Connected {
                        return Err(windows::core::Error::from_hresult(windows::core::HRESULT(
                            0x8007048F_u32 as i32,
                        )));
                    }
                    let address = device.BluetoothAddress()?;
                    let level = pnp_telemetry(&levels, &format!("{address:012x}"))
                        .0
                        .or_else(|| ble_level(&device, deadline));
                    Ok((address, level, None))
                } else {
                    let device = wait_until!(BluetoothDevice::FromIdAsync(&id)?, deadline)?;
                    let _device_guard = CloseOnDrop::for_object(&device)?;
                    let connected =
                        device.ConnectionStatus()? == BluetoothConnectionStatus::Connected;
                    let address = device.BluetoothAddress()?;
                    let kind = device
                        .ClassOfDevice()
                        .ok()
                        .and_then(|class| {
                            classified_category(class.MajorClass().ok()?, class.MinorClass().ok()?)
                        })
                        .map(str::to_owned);
                    if !connected {
                        return Err(windows::core::Error::from_hresult(windows::core::HRESULT(
                            0x8007048F_u32 as i32,
                        )));
                    }
                    Ok((address, None, kind))
                }
            })();
            let Ok((address, level, kind)) = read else {
                continue;
            };
            let address_text = format!("{address:012x}");
            let (pnp_level, container_id) = pnp_telemetry(&levels, &address_text);
            let id = container_id.unwrap_or(address_text);
            merge_endpoint(&mut devices, id, name, kind, pnp_level, level);
        }
    }
    if Instant::now() >= deadline {
        return Err("Bluetooth scan timed out".into());
    }
    finish_enumeration(devices, transports)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn empty_classic_does_not_mask_ble_timeout() {
        let unattempted = std::array::from_fn(|_| Err("Bluetooth scan timed out".to_owned()));
        assert_eq!(
            finish_enumeration(BTreeMap::new(), unattempted).unwrap_err(),
            "Bluetooth scan timed out"
        );
        let empty = BTreeMap::new();
        assert_eq!(
            finish_enumeration(empty, [Ok(()), Err("BLE timed out".into())]).unwrap_err(),
            "BLE timed out"
        );
        assert!(finish_enumeration(BTreeMap::new(), [Ok(()), Ok(())])
            .unwrap()
            .is_empty());
        let mut partial = BTreeMap::new();
        merge_endpoint(
            &mut partial,
            "classic".into(),
            "Pad".into(),
            None,
            None,
            None,
        );
        assert_eq!(
            finish_enumeration(partial, [Ok(()), Err("BLE timed out".into())])
                .unwrap()
                .len(),
            1
        );
    }
    #[test]
    fn shared_container_merges_profiles_and_pnp_precedes_ble() {
        let mut devices = BTreeMap::new();
        for (pnp, ble) in [(None, None), (Some(20), None), (None, Some(50))] {
            merge_endpoint(
                &mut devices,
                "container".into(),
                "Pad".into(),
                None,
                pnp,
                ble,
            );
        }
        assert_eq!(devices.len(), 1);
        assert_eq!(devices["container"].battery_percent, Some(20));
    }
    #[test]
    fn battery_on_later_profile_and_hid_sibling_is_not_lost() {
        let root = (
            "bthenum\\dev_aabbccddeeff".into(),
            None,
            Some("physical-a".into()),
        );
        let profile = (
            "bthenum\\aabbccddeeff_handsfree".into(),
            Some(60),
            Some("physical-a".into()),
        );
        assert_eq!(
            pnp_telemetry(&[root.clone(), profile], "aabbccddeeff"),
            (Some(60), Some("physical-a".into()))
        );
        let hid = (
            "hid\\battery-interface".into(),
            Some(76),
            Some("physical-a".into()),
        );
        let unrelated = ("hid\\other".into(), Some(99), Some("physical-b".into()));
        assert_eq!(
            pnp_telemetry(&[root, unrelated, hid], "aabbccddeeff").0,
            Some(76)
        );
        assert_eq!(
            pnp_telemetry(
                &[
                    ("bthenum\\dev_aabbccddeeff".into(), None, None),
                    ("hid\\other".into(), Some(99), None)
                ],
                "aabbccddeeff"
            )
            .0,
            None
        );
    }
}
#[cfg(test)]
mod bounded_wait_tests {
    use super::*;
    use std::cell::Cell;
    struct Status(i32);
    struct Operation {
        completed: bool,
        cancelled: Cell<bool>,
    }
    #[allow(non_snake_case)]
    impl Operation {
        fn Status(&self) -> windows::core::Result<Status> {
            Ok(Status(if self.completed { 1 } else { 0 }))
        }
        fn Cancel(&self) -> windows::core::Result<()> {
            self.cancelled.set(true);
            Ok(())
        }
        fn GetResults(&self) -> windows::core::Result<u8> {
            Ok(76)
        }
    }
    #[test]
    fn stalled_operation_cancels_at_deadline_without_joining() {
        let operation = Operation {
            completed: false,
            cancelled: Cell::new(false),
        };
        let start = Instant::now();
        assert!(wait_until!(&operation, start).is_err());
        assert!(operation.cancelled.get());
        assert!(start.elapsed() < Duration::from_millis(100));
    }
    #[test]
    fn completed_operation_returns_its_real_value() {
        let operation = Operation {
            completed: true,
            cancelled: Cell::new(false),
        };
        assert_eq!(wait_until!(&operation, Instant::now()).unwrap(), 76);
        assert!(!operation.cancelled.get());
    }
}
