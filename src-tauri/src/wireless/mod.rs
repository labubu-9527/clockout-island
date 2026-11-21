mod scan;
use serde::Serialize;
use std::sync::{LazyLock, Mutex};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tokio::sync::watch;

const TIMEOUT: Duration = Duration::from_secs(20);
const CACHE_TTL: Duration = Duration::from_secs(30);
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct WirelessDevice {
    id: String,
    name: String,
    kind: String,
    battery_percent: Option<u8>,
    updated_at: u64,
}
fn timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}
type Snapshot = Result<Vec<WirelessDevice>, String>;
type Pending = (Instant, watch::Receiver<Option<Snapshot>>);
#[derive(Default)]
struct Scanner {
    pending: Option<Pending>,
    cached: Option<(Instant, Vec<WirelessDevice>)>,
}
static SCANNER: LazyLock<Mutex<Scanner>> = LazyLock::new(Mutex::default);

#[tauri::command]
pub(crate) async fn get_wireless_devices(refresh: Option<bool>) -> Snapshot {
    read_snapshot(&SCANNER, refresh.unwrap_or(false), TIMEOUT, scan::scan).await
}

async fn read_snapshot(
    scanner: &'static Mutex<Scanner>,
    refresh: bool,
    timeout: Duration,
    scan: impl FnOnce(Instant) -> Snapshot + Send + std::panic::UnwindSafe + 'static,
) -> Snapshot {
    let (deadline, mut receiver) = {
        let mut state = scanner
            .lock()
            .map_err(|_| "Bluetooth scanner unavailable")?;
        if let Some(pending) = &state.pending {
            pending.clone()
        } else {
            if !refresh {
                if let Some((at, devices)) = &state.cached {
                    if at.elapsed() < CACHE_TTL {
                        return Ok(devices.clone());
                    }
                }
            }
            state.cached = None;
            let deadline = Instant::now() + timeout;
            let (sender, receiver) = watch::channel(None);
            std::thread::Builder::new()
                .name("wireless-battery".into())
                .spawn(move || {
                    let result = std::panic::catch_unwind(|| scan(deadline))
                        .unwrap_or_else(|_| Err("Bluetooth worker interrupted".into()));
                    if let Ok(mut state) = scanner.lock() {
                        if let Ok(devices) = &result {
                            if Instant::now() < deadline {
                                state.cached = Some((Instant::now(), devices.clone()));
                            }
                        }
                        let _ = sender.send(Some(result));
                        state.pending = None;
                    }
                })
                .map_err(|err| err.to_string())?;
            state.pending = Some((deadline, receiver.clone()));
            (deadline, receiver)
        }
    };
    tokio::time::timeout_at(deadline.into(), receiver.changed())
        .await
        .map_err(|_| "Bluetooth scan timed out")?
        .map_err(|_| "Bluetooth worker interrupted")?;
    let result = receiver
        .borrow()
        .clone()
        .ok_or("Bluetooth worker interrupted")?;
    result
}
macro_rules! tauri_commands {
    ($next:ident [$($done:tt)*] $($rest:tt)*) => {
        $next!([$($done)* crate::wireless::get_wireless_devices,] $($rest)*)
    };
}
pub(crate) use tauri_commands;

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{
        atomic::{AtomicUsize, Ordering},
        mpsc,
    };

    #[test]
    fn stalled_worker_remains_single_after_timeout_and_force_refresh() {
        static STATE: LazyLock<Mutex<Scanner>> = LazyLock::new(Default::default);
        static RUNS: AtomicUsize = AtomicUsize::new(0);
        let (release, blocked) = mpsc::channel();
        let timeout = Duration::from_millis(30);
        let result =
            tauri::async_runtime::block_on(read_snapshot(&STATE, true, timeout, move |_| {
                RUNS.fetch_add(1, Ordering::SeqCst);
                blocked.recv().unwrap();
                Ok(vec![])
            }));
        assert!(result.unwrap_err().contains("timed out"));
        let second = tauri::async_runtime::block_on(read_snapshot(&STATE, true, timeout, |_| {
            RUNS.fetch_add(1, Ordering::SeqCst);
            Ok(vec![])
        }));
        assert!(second.unwrap_err().contains("timed out"));
        release.send(()).unwrap();
        assert_eq!(RUNS.load(Ordering::SeqCst), 1);
    }

    #[test]
    fn ordinary_reads_reuse_snapshot_until_forced_refresh() {
        static STATE: LazyLock<Mutex<Scanner>> = LazyLock::new(Default::default);
        let read = |refresh| {
            tauri::async_runtime::block_on(read_snapshot(&STATE, refresh, TIMEOUT, |_| Ok(vec![])))
        };
        assert!(read(false).is_ok());
        let cached = tauri::async_runtime::block_on(read_snapshot(&STATE, false, TIMEOUT, |_| {
            Err("unexpected scan".into())
        }));
        assert!(cached.is_ok());
        let forced = tauri::async_runtime::block_on(read_snapshot(&STATE, true, TIMEOUT, |_| {
            Err("refresh failed".into())
        }));
        assert_eq!(forced.unwrap_err(), "refresh failed");
    }
}
