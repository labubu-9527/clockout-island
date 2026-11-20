use super::decode_touchpad;

#[test]
fn touchpad_requires_hardware_and_a_binary_registry_value() {
    assert_eq!(decode_touchpad(false, Some(0)), None);
    assert_eq!(decode_touchpad(false, Some(1)), None);
    assert_eq!(decode_touchpad(true, None), None);
    assert_eq!(decode_touchpad(true, Some(2)), None);
    assert_eq!(decode_touchpad(true, Some(0)), Some(false));
    assert_eq!(decode_touchpad(true, Some(1)), Some(true));
}

#[test]
fn held_toggle_keys_only_flip_on_first_down() {
    let mut key = super::ToggleKey::new(false, false);
    key.event(true, true);
    assert!(key.enabled);
    key.event(true, true);
    assert!(key.enabled);
    key.event(false, true);
    key.event(true, true);
    assert!(!key.enabled);
    let mut held = super::ToggleKey::new(true, true);
    held.event(true, true);
    assert!(held.enabled);
}

#[test]
#[ignore = "Requires interactive desktop; prints real global keyboard transitions for manual acceptance"]
fn live_keyboard_observer_probe() {
    use std::time::{Duration, Instant};
    let duration = std::env::var("FLY_DEVICE_PROBE_SECONDS")
        .ok()
        .and_then(|value| value.parse::<u64>().ok())
        .unwrap_or(15)
        .min(60);
    super::set_keyboard_observer(true).unwrap();
    let mut previous = super::keyboard_locks();
    println!("DEVICE_PROBE_READY {previous:?}");
    let start = Instant::now();
    while start.elapsed() < Duration::from_secs(duration) {
        super::super::message_window::dispatch_pending_messages();
        let next = super::keyboard_locks();
        if next != previous {
            println!("DEVICE_PROBE_CHANGED {next:?}");
            previous = next;
        }
        std::thread::sleep(Duration::from_millis(10));
    }
    super::set_keyboard_observer(false).unwrap();
    assert_eq!(super::keyboard_locks(), (None, None));
    println!("DEVICE_PROBE_STOPPED");
}

#[test]
#[ignore = "Injects reversible Caps/Num key presses on the interactive desktop; run manually"]
fn global_hook_observes_keys_without_owning_foreground() {
    use std::time::{Duration, Instant};
    use windows::Win32::UI::Input::KeyboardAndMouse::{VIRTUAL_KEY, VK_CAPITAL, VK_NUMLOCK};
    fn pump() {
        let start = Instant::now();
        while start.elapsed() < Duration::from_millis(180) {
            super::super::message_window::dispatch_pending_messages();
            std::thread::sleep(Duration::from_millis(5));
        }
    }
    fn press(key: VIRTUAL_KEY) {
        super::super::input::send_key_down(key);
        super::super::input::send_key_up(key);
    }
    struct Restore(Vec<VIRTUAL_KEY>);
    impl Drop for Restore {
        fn drop(&mut self) {
            for key in self.0.drain(..) {
                press(key);
            }
            pump();
            super::set_keyboard_observer(false).unwrap();
        }
    }
    // This test runs on a worker owning no foreground window. Its pumped
    // hook receives input directed at another application.
    super::set_keyboard_observer(true).unwrap();
    let initial = super::keyboard_locks();
    let mut restore = Restore(Vec::new());
    println!("GLOBAL_HOOK_INITIAL {initial:?}");
    restore.0.push(VK_CAPITAL);
    press(VK_CAPITAL);
    pump();
    assert_eq!(
        super::keyboard_locks(),
        (initial.0.map(|value| !value), initial.1)
    );
    restore.0.push(VK_NUMLOCK);
    press(VK_NUMLOCK);
    pump();
    assert_eq!(
        super::keyboard_locks(),
        (initial.0.map(|value| !value), initial.1.map(|value| !value))
    );
    println!("GLOBAL_HOOK_CHANGED {:?}", super::keyboard_locks());
    // Restore both keys before asserting; Drop also restores during unwinding.
    for key in restore.0.drain(..) {
        press(key);
    }
    pump();
    assert_eq!(super::keyboard_locks(), initial);
    println!("GLOBAL_HOOK_RESTORED {:?}", super::keyboard_locks());
    super::set_keyboard_observer(false).unwrap();
    restore.0.push(VK_CAPITAL);
    press(VK_CAPITAL);
    pump();
    super::set_keyboard_observer(true).unwrap();
    assert_eq!(
        super::keyboard_locks(),
        (initial.0.map(|value| !value), initial.1)
    );
    println!("GLOBAL_HOOK_RESEEDED {:?}", super::keyboard_locks());
    drop(restore);
    assert_eq!(super::keyboard_locks(), (None, None));
}

#[test]
fn consumed_keys_never_change_toggle_or_accepted_repeat_state() {
    let mut key = super::ToggleKey::new(false, false);
    key.event(true, false);
    key.event(false, false);
    assert!(!key.enabled);
    key.event(true, true);
    assert!(key.enabled);
    key.event(false, false);
    key.event(true, true);
    assert!(
        key.enabled,
        "consumed release does not reset Windows accepted down state"
    );
    key.event(false, true);
    key.event(true, false);
    assert!(key.enabled);
    key.event(true, true);
    assert!(
        !key.enabled,
        "first accepted press after a consumed one toggles once"
    );
}
