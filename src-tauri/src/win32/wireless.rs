//! Bluetooth PnP battery properties, adapted from DotIsle (MIT).
use std::time::Instant;
use windows::core::{GUID, PCWSTR};
use windows::Win32::Devices::DeviceAndDriverInstallation::{
    SetupDiDestroyDeviceInfoList, HDEVINFO,
};
struct DeviceInfoSet(HDEVINFO);
impl Drop for DeviceInfoSet {
    fn drop(&mut self) {
        // SAFETY: this guard uniquely owns the handle returned by SetupDiGetClassDevsW.
        let _ = unsafe { SetupDiDestroyDeviceInfoList(self.0) };
    }
}
pub(crate) type Property = (String, Option<u8>, Option<String>);
pub(crate) fn pnp_levels(deadline: Instant) -> Vec<Property> {
    use windows::Win32::{
        Devices::{
            DeviceAndDriverInstallation::*,
            Properties::{
                DEVPKEY_Device_ContainerId, DEVPROPTYPE, DEVPROP_TYPE_BYTE, DEVPROP_TYPE_GUID,
                DEVPROP_TYPE_UINT32,
            },
        },
        Foundation::DEVPROPKEY,
    };
    let key = DEVPROPKEY {
        fmtid: GUID::from_u128(0x104ea319_6ee2_4701_bd47_8ddbf425bbe5),
        pid: 2,
    };
    let mut out = vec![];
    // SAFETY: the set is used only until destroyed below. Every buffer passed to SetupAPI
    // is live for the call and its actual slice length bounds the write.
    unsafe {
        let Ok(set) =
            SetupDiGetClassDevsW(None, PCWSTR::null(), None, DIGCF_ALLCLASSES | DIGCF_PRESENT)
        else {
            return out;
        };
        let _owner = DeviceInfoSet(set);
        let mut i = 0;
        while Instant::now() < deadline {
            let mut dev = SP_DEVINFO_DATA {
                cbSize: std::mem::size_of::<SP_DEVINFO_DATA>() as u32,
                ..Default::default()
            };
            if SetupDiEnumDeviceInfo(set, i, &mut dev).is_err() {
                break;
            }
            i += 1;
            let mut id = [0u16; 1024];
            if SetupDiGetDeviceInstanceIdW(set, &dev, Some(&mut id), None).is_err() {
                continue;
            }
            let id = String::from_utf16_lossy(
                &id[..id.iter().position(|v| *v == 0).unwrap_or(id.len())],
            )
            .to_lowercase();
            if !id.starts_with("bth") && !id.starts_with("hid\\") {
                continue;
            }
            let mut kind = DEVPROPTYPE::default();
            let mut bytes = [0u8; 4];
            let mut len = 0;
            let has_level = SetupDiGetDevicePropertyW(
                set,
                &dev,
                &key,
                &mut kind,
                Some(&mut bytes),
                Some(&mut len),
                0,
            )
            .is_ok();
            let value = if !has_level {
                None
            } else if kind == DEVPROP_TYPE_BYTE && len == 1 {
                Some(bytes[0] as u32)
            } else if kind == DEVPROP_TYPE_UINT32 && len == 4 {
                Some(u32::from_le_bytes(bytes))
            } else {
                None
            };
            let level = value.filter(|v| *v <= 100).map(|v| v as u8);
            let mut raw = [0u8; 16];
            let mut prop = DEVPROPTYPE::default();
            let mut count = 0;
            let container = if SetupDiGetDevicePropertyW(
                set,
                &dev,
                &DEVPKEY_Device_ContainerId,
                &mut prop,
                Some(&mut raw),
                Some(&mut count),
                0,
            )
            .is_ok()
                && prop == DEVPROP_TYPE_GUID
                && count == 16
            {
                let guid = std::ptr::read_unaligned(raw.as_ptr().cast::<GUID>());
                (guid != GUID::zeroed()).then(|| format!("{guid:?}"))
            } else {
                None
            };
            out.push((id, level, container));
        }
    }
    out
}
