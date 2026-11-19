//! Safe wrappers for the two system-wide readings the island shows on its collapsed bar.

use std::mem::size_of;
use windows::Win32::Foundation::FILETIME;
use windows::Win32::System::SystemInformation::{GlobalMemoryStatusEx, MEMORYSTATUSEX};
use windows::Win32::System::Threading::GetSystemTimes;

/// Cumulative 100ns ticks. `kernel` includes `idle`, which the caller accounts for.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub(crate) struct CpuTimes {
    pub(crate) idle: u64,
    pub(crate) kernel: u64,
    pub(crate) user: u64,
}

fn filetime_ticks(value: FILETIME) -> u64 {
    ((value.dwHighDateTime as u64) << 32) | value.dwLowDateTime as u64
}

pub(crate) fn read_cpu_times() -> Result<CpuTimes, String> {
    let mut idle = FILETIME::default();
    let mut kernel = FILETIME::default();
    let mut user = FILETIME::default();
    // SAFETY: all three out-pointers reference valid FILETIME locals that stay alive for the call.
    unsafe {
        GetSystemTimes(Some(&mut idle), Some(&mut kernel), Some(&mut user))
            .map_err(|error| format!("GetSystemTimes failed: {error}"))?;
    }
    Ok(CpuTimes {
        idle: filetime_ticks(idle),
        kernel: filetime_ticks(kernel),
        user: filetime_ticks(user),
    })
}

pub(crate) fn memory_load_percent() -> Result<u8, String> {
    let mut status = MEMORYSTATUSEX::default();
    status.dwLength = size_of::<MEMORYSTATUSEX>() as u32;
    // SAFETY: `status` is a valid MEMORYSTATUSEX with dwLength set to its own size.
    unsafe {
        GlobalMemoryStatusEx(&mut status)
            .map_err(|error| format!("GlobalMemoryStatusEx failed: {error}"))?;
    }
    Ok(status.dwMemoryLoad.min(100) as u8)
}
