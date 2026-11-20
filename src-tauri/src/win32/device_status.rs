//! Keyboard toggle and Windows precision-touchpad switch reads.

use std::sync::atomic::{AtomicBool, Ordering};
use windows::{
    core::w,
    Win32::{
        Foundation::{LPARAM, LRESULT, WPARAM},
        System::Registry::{RegGetValueW, HKEY_CURRENT_USER, RRF_RT_REG_DWORD},
        UI::{
            Controls::{POINTER_DEVICE_INFO, POINTER_DEVICE_TYPE_TOUCH_PAD},
            Input::{
                KeyboardAndMouse::{GetAsyncKeyState, GetKeyState, VK_CAPITAL, VK_NUMLOCK},
                Pointer::GetPointerDevices,
            },
            WindowsAndMessaging::{
                CallNextHookEx, SetWindowsHookExW, UnhookWindowsHookEx, HC_ACTION, HHOOK,
                KBDLLHOOKSTRUCT, WH_KEYBOARD_LL, WM_KEYDOWN, WM_KEYUP, WM_SYSKEYDOWN, WM_SYSKEYUP,
            },
        },
    },
};

/// Keyboard monitoring is confined to the pumping main thread. The callback
/// observes only the two toggle keys and always forwards every event.
#[derive(Clone, Copy)]
struct ToggleKey {
    enabled: bool,
    down: bool,
}

impl ToggleKey {
    fn new(enabled: bool, down: bool) -> Self {
        Self { enabled, down }
    }
    fn event(&mut self, down: bool, accepted: bool) {
        if !accepted {
            return;
        }
        if down && !self.down {
            self.enabled = !self.enabled;
        }
        self.down = down;
    }
}

struct KeyboardObserver {
    hook: HHOOK,
    caps: ToggleKey,
    num: ToggleKey,
}

impl Drop for KeyboardObserver {
    fn drop(&mut self) {
        // SAFETY: this hook is owned by this main-thread guard and removed once.
        let _ = unsafe { UnhookWindowsHookEx(self.hook) };
    }
}

thread_local! {
    static KEYBOARD: std::cell::RefCell<Option<KeyboardObserver>> = const { std::cell::RefCell::new(None) };
}

unsafe extern "system" fn keyboard_hook(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
    // SAFETY: forwards the original callback arguments unchanged. No state is
    // borrowed across the call because downstream hooks may reenter this hook.
    let result = unsafe { CallNextHookEx(None, code, wparam, lparam) };
    if code == HC_ACTION as i32 {
        // SAFETY: for HC_ACTION Windows supplies a KBDLLHOOKSTRUCT valid for
        // the callback duration. It is read only and never retained.
        let event = unsafe { &*(lparam.0 as *const KBDLLHOOKSTRUCT) };
        let message = wparam.0 as u32;
        let down = message == WM_KEYDOWN || message == WM_SYSKEYDOWN;
        let up = message == WM_KEYUP || message == WM_SYSKEYUP;
        if down || up {
            KEYBOARD.with(|state| {
                // A reentrant callback must never panic across the FFI boundary.
                if let Ok(mut state) = state.try_borrow_mut() {
                    if let Some(observer) = state.as_mut() {
                        match event.vkCode {
                            value if value == u32::from(VK_CAPITAL.0) => {
                                observer.caps.event(down, result.0 == 0)
                            }
                            value if value == u32::from(VK_NUMLOCK.0) => {
                                observer.num.event(down, result.0 == 0)
                            }
                            _ => {}
                        }
                    }
                }
            });
        }
    }
    // A downstream remapper can suppress the physical key. Only accepted events
    // alter our model; return its result unchanged so we never consume input.
    result
}

pub(crate) fn set_keyboard_observer(enabled: bool) -> windows::core::Result<()> {
    KEYBOARD.with(|state| {
        let mut state = state.borrow_mut();
        if !enabled {
            *state = None;
            return Ok(());
        }
        if state.is_some() {
            return Ok(());
        }
        let instance = super::message_window::module_instance()?;
        // SAFETY: the static callback has HOOKPROC's ABI and remains loaded for
        // this guard's lifetime; thread zero observes desktop input globally.
        let hook =
            unsafe { SetWindowsHookExW(WH_KEYBOARD_LL, Some(keyboard_hook), Some(instance), 0) }?;
        // SAFETY: valid virtual-key constants; no pointers. Seed once on the
        // message-pumping thread, then observe global transitions independently
        // of whether 岛点下班 or another application owns keyboard focus.
        let (caps, num) = unsafe {
            (
                ToggleKey::new(
                    GetKeyState(i32::from(VK_CAPITAL.0)) & 1 != 0,
                    GetAsyncKeyState(i32::from(VK_CAPITAL.0)) < 0,
                ),
                ToggleKey::new(
                    GetKeyState(i32::from(VK_NUMLOCK.0)) & 1 != 0,
                    GetAsyncKeyState(i32::from(VK_NUMLOCK.0)) < 0,
                ),
            )
        };
        *state = Some(KeyboardObserver { hook, caps, num });
        Ok(())
    })
}

pub(crate) fn keyboard_locks() -> (Option<bool>, Option<bool>) {
    KEYBOARD.with(|state| {
        state.borrow().as_ref().map_or((None, None), |observer| {
            (Some(observer.caps.enabled), Some(observer.num.enabled))
        })
    })
}

fn has_touchpad() -> Option<bool> {
    let mut count = 0;
    // SAFETY: count is writable; null output requests the required element count.
    unsafe { GetPointerDevices(&mut count, None) }.ok()?;
    if count == 0 {
        return Some(false);
    }
    // Bound allocation even if a driver reports an unreasonable device count.
    if count > 1024 {
        return None;
    }
    let mut devices = vec![POINTER_DEVICE_INFO::default(); count as usize];
    // SAFETY: the buffer has count writable elements; Windows receives its capacity
    // through count and reports insufficient buffer if devices arrive concurrently.
    unsafe { GetPointerDevices(&mut count, Some(devices.as_mut_ptr())) }.ok()?;
    Some(
        devices
            .iter()
            .take(count as usize)
            .any(|device| device.pointerDeviceType == POINTER_DEVICE_TYPE_TOUCH_PAD),
    )
}

fn touchpad_switch() -> Option<u32> {
    let mut value = 0u32;
    let mut bytes = std::mem::size_of_val(&value) as u32;
    // SAFETY: constant strings are terminated, value is a writable DWORD, bytes
    // gives its exact capacity, and the type filter rejects non-DWORD data.
    unsafe {
        RegGetValueW(
            HKEY_CURRENT_USER,
            w!(r"Software\Microsoft\Windows\CurrentVersion\PrecisionTouchPad\Status"),
            w!("Enabled"),
            RRF_RT_REG_DWORD,
            None,
            Some((&mut value as *mut u32).cast()),
            Some(&mut bytes),
        )
    }
    .ok()
    .ok()?;
    Some(value)
}

fn decode_touchpad(supported: bool, value: Option<u32>) -> Option<bool> {
    match (supported, value) {
        (true, Some(0)) => Some(false),
        (true, Some(1)) => Some(true),
        _ => None,
    }
}

pub(crate) fn touchpad_enabled() -> Option<bool> {
    // Disabled pads can disappear from enumeration. Once actually detected,
    // retain support for this process so the off transition remains observable.
    static DETECTED: AtomicBool = AtomicBool::new(false);
    let present = has_touchpad()?;
    if present {
        DETECTED.store(true, Ordering::Relaxed);
    }
    decode_touchpad(DETECTED.load(Ordering::Relaxed), touchpad_switch())
}

#[cfg(test)]
#[path = "device_status_tests.rs"]
mod tests;
