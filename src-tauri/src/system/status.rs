//! CPU and memory usage for the collapsed island's status badge.

use std::sync::{Mutex, PoisonError, OnceLock};
use std::time::{SystemTime, UNIX_EPOCH};
use serde::Serialize;
use crate::win32::system_status::{memory_load_percent, read_cpu_times, CpuTimes};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SystemStatus {
    /// `None` until a second sample exists; the first poll only seeds the baseline.
    pub(crate) cpu_percent: Option<u8>,
    pub(crate) memory_percent: u8,
    pub(crate) updated_at: u64,
}

static PREVIOUS_TIMES: OnceLock<Mutex<Option<CpuTimes>>> = OnceLock::new();

fn previous_times() -> &'static Mutex<Option<CpuTimes>> {
    PREVIOUS_TIMES.get_or_init(|| Mutex::new(None))
}

/// Busy share between two cumulative readings, clamped to 0–100.
pub(crate) fn cpu_usage_percent(previous: CpuTimes, current: CpuTimes) -> Option<u8> {
    let total = current
        .kernel
        .saturating_sub(previous.kernel)
        .saturating_add(current.user.saturating_sub(previous.user));
    let idle = current.idle.saturating_sub(previous.idle);
    if total == 0 || idle > total {
        return None;
    }
    Some((((total - idle) * 100) / total).min(100) as u8)
}

fn now_millis() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as u64)
        .unwrap_or(0)
}

#[tauri::command]
pub(crate) fn get_system_status() -> Result<SystemStatus, String> {
    let current = read_cpu_times()?;
    let memory_percent = memory_load_percent()?;
    // A poisoned lock only means a previous poll panicked; the last sample is still usable.
    let mut previous = previous_times().lock().unwrap_or_else(PoisonError::into_inner);
    let cpu_percent = (*previous).and_then(|before| cpu_usage_percent(before, current));
    *previous = Some(current);
    Ok(SystemStatus {
        cpu_percent,
        memory_percent,
        updated_at: now_millis(),
    })
}

#[cfg(test)]
mod tests {
    use super::cpu_usage_percent;
    use crate::win32::system_status::CpuTimes;

    #[test]
    fn cpu_usage_from_time_delta() {
        let before = CpuTimes { idle: 100, kernel: 180, user: 120 };
        let after = CpuTimes { idle: 150, kernel: 260, user: 190 };
        // total delta = 80 + 70 = 150, idle delta = 50 -> 100/150 = 66%.
        assert_eq!(cpu_usage_percent(before, after), Some(66));
    }

    #[test]
    fn cpu_usage_handles_idle_and_zero_delta() {
        let before = CpuTimes { idle: 100, kernel: 180, user: 120 };
        assert_eq!(cpu_usage_percent(before, before), None);
        let all_idle = CpuTimes { idle: 150, kernel: 230, user: 120 };
        assert_eq!(cpu_usage_percent(before, all_idle), Some(0));
    }

    #[test]
    fn cpu_usage_clamps_inconsistent_counters() {
        let before = CpuTimes { idle: 100, kernel: 180, user: 120 };
        let after = CpuTimes { idle: 900, kernel: 181, user: 121 };
        assert_eq!(cpu_usage_percent(before, after), None);
    }
}
