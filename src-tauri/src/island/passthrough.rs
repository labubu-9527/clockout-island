//! Lets clicks fall through the transparent stage everywhere outside the island shape.

use std::{thread, time::Duration};
use tauri::{Emitter, WebviewWindow};
use windows::Win32::Foundation::HWND;

use super::{
    geometry::{tucked_top_offset, STAGE_WINDOW_WIDTH},
    state::{game_quiet, read_window_state, CornerShape, IslandMode, IslandWindowState},
};
use crate::win32;

/// Logical px beside the collapsed bar that still count as on it, before the island scale.
const COLLAPSED_HIT_SLOP: f64 = 4.0;

// Mirrored by ISLAND_HOVER_CHANGED_EVENT in src/windows/island/api.ts. The payload says
// whether the cursor is over the island shape. The webview's own mouseleave is unreliable
// here, because the window stops receiving the cursor as soon as it leaves the shape.
pub(crate) const ISLAND_HOVER_CHANGED_EVENT: &str = "island-hover-changed";

pub(crate) fn start_cursor_passthrough_loop(window: WebviewWindow) {
    thread::spawn(move || {
        let mut ignoring_cursor = false;
        let mut was_inside = false;
        // Asked once: every `window.hwnd()` is a round trip to the main event loop, which at
        // this loop's 83 Hz kept the main thread busy even with the cursor nowhere near. The
        // handle stays the same for the window's life.
        let hwnd = window.hwnd().ok();

        loop {
            // A press that started on the island (selecting text, dragging a slider or a
            // scrollbar) keeps the window taking the mouse until it is released: passing clicks
            // through mid-drag ended the gesture and dropped the selection being made.
            let (click_inside, hover_inside) = hwnd.map(cursor_regions).unwrap_or((true, true));
            let holding_island = !ignoring_cursor && win32::input::is_left_button_down();
            let is_inside = click_inside || holding_island;
            let is_hovered = hover_inside || holding_island;
            let should_ignore = !is_inside;

            if should_ignore != ignoring_cursor
                && window.set_ignore_cursor_events(should_ignore).is_ok()
            {
                ignoring_cursor = should_ignore;
            }

            if is_hovered != was_inside {
                was_inside = is_hovered;
                let _ = window.emit(ISLAND_HOVER_CHANGED_EVENT, is_hovered);
                // Once per hover: a dock that raised itself over the island gives way. Not over
                // a game: reordering topmost windows there can knock it out of full screen.
                if let Some(hwnd) = hwnd.filter(|_| is_hovered && !game_quiet()) {
                    win32::taskbar_edge::raise_topmost(hwnd);
                }
            }

            thread::sleep(Duration::from_millis(12));
        }
    });
}

fn cursor_regions(hwnd: HWND) -> (bool, bool) {
    let Some(window_rect) = win32::window::window_rect(hwnd) else {
        return (true, true);
    };
    let Some(cursor) = win32::window::cursor_position() else {
        return (true, true);
    };

    let window_width = (window_rect.right - window_rect.left).max(1) as f64;
    let physical_scale = window_width / STAGE_WINDOW_WIDTH;
    let local_x = (cursor.x - window_rect.left) as f64;
    let local_y = (cursor.y - window_rect.top) as f64;
    let state = read_window_state();
    // Tucked over a game: the edge strip lets everything through, so the cursor reaching the
    // top of the screen never brings the island out or activates it (#73).
    if state.is_tucked && game_quiet() {
        return (false, false);
    }

    (point_in_island(state, physical_scale, local_x, local_y),
        point_in_hover_region(state, physical_scale, local_x, local_y))
}

/// Hover crosses the rail's transparent gap without making that gap a click target.
pub(super) fn point_in_hover_region(state: IslandWindowState, dpi: f64, x: f64, y: f64) -> bool {
    if state.click_through { return false; }
    if point_in_island(state, dpi, x, y) { return true; }
    let Some((rail_width, rail_height)) = state.message_rail_size() else { return false; };
    let body_right = (STAGE_WINDOW_WIDTH + state.active_size().0) / 2.0;
    // Begin inside the rounded body edge so a diagonal crossing cannot briefly close the panel.
    let corner = state.top_corner_radius().max(state.bottom_corner_radius()) * state.active_scale();
    x >= (body_right - corner) * dpi
        && x <= (body_right + 8.0 * state.expanded_scale + rail_width) * dpi
        && y >= 0.0 && y <= rail_height * dpi
}

/// Physical stage coordinates, shared by the live cursor loop and the DPI tests.
pub(super) fn point_in_island(state: IslandWindowState, physical_scale: f64, local_x: f64, local_y: f64) -> bool {
    let window_width = STAGE_WINDOW_WIDTH * physical_scale;
    // A game-mode message preview is only shown: the cursor goes on to the game.
    if state.click_through {
        return false;
    }
    if let Some((width, height)) = state.tuck_style.hot_zone_size().filter(|_| state.is_tucked) {
        let scale = state.collapsed_scale * physical_scale;
        let left = (window_width - width * scale) / 2.0;
        // Line keeps the stage at the work-area top; hidden slides it up. The rounded native
        // offset makes the hot zone start exactly at the screen edge either way.
        let top = -f64::from(tucked_top_offset(state, physical_scale));
        return local_x >= left && local_x < left + width * scale
            && local_y >= top && local_y < top + height * scale;
    }

    let (logical_width, logical_height) = state.active_size();
    let island_width = logical_width * physical_scale;
    let island_height = logical_height * physical_scale;
    let island_left = (window_width - island_width) / 2.0;
    let island_top = 0.0;
    let radius = state.bottom_corner_radius() * state.active_scale() * physical_scale;
    let top_radius = state.top_corner_radius() * state.active_scale() * physical_scale;

    // The collapsed bar takes its whole box and a little beside it, rounded corners included. The
    // first button and the last sit in those corners, and some users found the left half of the
    // Agent icon and the minimize button did nothing (2026-11-19): with the corners cut exactly,
    // a click a pixel or two off the curve fell through to the window behind.
    if matches!(state.mode, IslandMode::Collapsed) && !state.is_tucked {
        let slop = COLLAPSED_HIT_SLOP * state.active_scale() * physical_scale;
        if local_x >= island_left - slop
            && local_x <= island_left + island_width + slop
            && local_y >= island_top
            && local_y <= island_top + island_height
        {
            return true;
        }
    }

    let rail_hit = state.message_rail_size().is_some_and(|(width, height)| {
        let scale = state.expanded_scale * physical_scale;
        point_in_notch(local_x, local_y, island_left + island_width + 8.0 * scale, 0.0,
            width * physical_scale, height * physical_scale, 18.0 * scale, 18.0 * scale, CornerShape::Round)
    });
    rail_hit || point_in_notch(
        local_x,
        local_y,
        island_left,
        island_top,
        island_width,
        island_height,
        radius,
        top_radius,
        state.active_corner_shape(),
    )
}

#[expect(
    clippy::too_many_arguments,
    reason = "a point and the notch's rectangle, two radii and their shape, all plain values"
)]
pub(super) fn point_in_notch(
    x: f64,
    y: f64,
    left: f64,
    top: f64,
    width: f64,
    height: f64,
    radius: f64,
    top_radius: f64,
    shape: CornerShape,
) -> bool {
    let right = left + width;
    let bottom = top + height;

    if x < left || x > right || y < top || y > bottom {
        return false;
    }

    // As CSS does, corners that would overlap shrink in proportion: a floating collapsed bar
    // shorter than its two radii becomes a pill.
    let (radius, top_radius) = {
        let fit = (height / (radius + top_radius)).min(1.0);
        (radius * fit, top_radius * fit)
    };
    let top_radius = top_radius.min(width / 2.0);
    if y < top + top_radius && (x < left + top_radius || x > right - top_radius) {
        let center_x = x.max(left + top_radius).min(right - top_radius);
        let dx = x - center_x;
        let dy = y - (top + top_radius);
        return shape.contains(dx, dy, top_radius);
    }

    let radius = radius.min(width / 2.0).min(height);
    if y <= bottom - radius || (x >= left + radius && x <= right - radius) {
        return true;
    }
    let center_x = if x < left + radius {
        left + radius
    } else if x > right - radius {
        right - radius
    } else {
        x
    };
    let center_y = y.min(bottom - radius);
    let dx = x - center_x;
    let dy = y - center_y;

    shape.contains(dx, dy, radius)
}
