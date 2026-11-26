//! The tray icon, which keeps the app watching for replays with its window closed.

use std::sync::atomic::{AtomicBool, Ordering};

use sqlx::SqlitePool;
use tauri::image::Image;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager};

const TRAY_ID: &str = "main";
const OPEN_ID: &str = "open";
const QUIT_ID: &str = "quit";

/// The dot's colour, as straight RGB.
const DOT_COLOR: [u8; 3] = [0xe5, 0x48, 0x4d];
/// The dot's radius, as a share of the icon's width.
const DOT_RADIUS: f32 = 0.22;

/// The app's icons, plain and with the dot telling new replays wait to be viewed, for
/// the tray and the window.
struct AppIcons {
    plain: Image<'static>,
    dotted: Image<'static>,
    showing_dot: AtomicBool,
}

/// Whether the tray icon exists and something shows it, so a hidden window can be
/// brought back.
pub fn has_tray(app: &AppHandle) -> bool {
    app.tray_by_id(TRAY_ID).is_some() && has_tray_host()
}

#[cfg(not(target_os = "linux"))]
fn has_tray_host() -> bool {
    true
}

/// The icon builds fine with no StatusNotifier host, like GNOME without the
/// AppIndicator extension, but then never shows.
#[cfg(target_os = "linux")]
fn has_tray_host() -> bool {
    use gtk::gio;
    use gtk::glib::{ToVariant, VariantTy};

    let Ok(bus) = gio::bus_get_sync(gio::BusType::Session, gio::Cancellable::NONE) else {
        return false;
    };

    bus.call_sync(
        Some("org.freedesktop.DBus"),
        "/org/freedesktop/DBus",
        "org.freedesktop.DBus",
        "NameHasOwner",
        Some(&("org.kde.StatusNotifierWatcher",).to_variant()),
        Some(VariantTy::new("(b)").unwrap()),
        gio::DBusCallFlags::NONE,
        -1,
        gio::Cancellable::NONE,
    )
    .ok()
    .and_then(|reply| reply.get::<(bool,)>())
    .is_some_and(|(owned,)| owned)
}

/// Adds the tray icon, whose menu opens the window or quits the app.
pub fn create(app: &AppHandle) -> tauri::Result<()> {
    let plain = app
        .default_window_icon()
        .map(|icon| icon.clone().to_owned());
    if let Some(plain) = &plain {
        app.manage(AppIcons {
            dotted: with_dot(plain),
            plain: plain.clone(),
            showing_dot: AtomicBool::new(false),
        });
    }

    let open = MenuItem::with_id(app, OPEN_ID, "Open SymbioteGG", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, QUIT_ID, "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open, &quit])?;

    let mut tray = TrayIconBuilder::with_id(TRAY_ID)
        .tooltip("SymbioteGG")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            OPEN_ID => show(app),
            QUIT_ID => app.exit(0),
            _ => {}
        })
        // Linux trays only send menu events, so the menu has Open too.
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show(tray.app_handle());
            }
        });
    if let Some(plain) = plain {
        tray = tray.icon(plain);
    }

    tray.build(app)?;
    Ok(())
}

/// Shows the dot on the tray and window icons when a stored replay waits to be viewed, and hides it
/// otherwise.
pub async fn refresh_dot(app: &AppHandle, pool: &SqlitePool) {
    match crate::db::replays::has_new(pool).await {
        Ok(on) => set_dot(app, on),
        Err(e) => log::error!("failed to check for new replays: {e}"),
    }
}

fn set_dot(app: &AppHandle, on: bool) {
    let Some(icons) = app.try_state::<AppIcons>() else {
        return;
    };
    // Linux trays get the whole pixmap again on each change.
    if icons.showing_dot.swap(on, Ordering::Relaxed) == on {
        return;
    }

    let icon = if on { &icons.dotted } else { &icons.plain };
    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        if let Err(e) = tray.set_icon(Some(icon.clone())) {
            log::warn!("failed to update the tray icon: {e}");
        }
    }
    // The taskbar shows the window's icon, except the macOS dock.
    if let Some(window) = app.get_webview_window("main") {
        if let Err(e) = window.set_icon(icon.clone()) {
            log::warn!("failed to update the window icon: {e}");
        }
    }
}

/// Returns `icon` with the dot in its top right corner.
fn with_dot(icon: &Image<'_>) -> Image<'static> {
    let (width, height) = (icon.width(), icon.height());
    let radius = width as f32 * DOT_RADIUS;
    let (center_x, center_y) = (width as f32 - radius, radius);
    let mut rgba = icon.rgba().to_vec();

    for (i, pixel) in rgba.as_chunks_mut::<4>().0.iter_mut().enumerate() {
        let x = (i as u32 % width) as f32 + 0.5;
        let y = (i as u32 / width) as f32 + 0.5;
        let distance = (x - center_x).hypot(y - center_y);
        // Coverage of the pixel's area, so the edges are anti-aliased.
        let dot = (radius - distance + 0.5).clamp(0.0, 1.0);
        if dot == 0.0 {
            continue;
        }

        let alpha = pixel[3] as f32 / 255.0;
        let out_alpha = dot + alpha * (1.0 - dot);
        if out_alpha > 0.0 {
            for (channel, color) in pixel.iter_mut().zip(DOT_COLOR) {
                let blended = color as f32 * dot + *channel as f32 * alpha * (1.0 - dot);
                *channel = (blended / out_alpha).round() as u8;
            }
        }
        pixel[3] = (out_alpha * 255.0).round() as u8;
    }

    Image::new_owned(rgba, width, height)
}

/// Brings the window back, hidden to the tray or minimized.
#[cfg(not(target_os = "linux"))]
pub fn show(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

/// Brings the window back, hidden to the tray or minimized.
///
/// Tauri presents the window with no timestamp, which X11 window managers' focus
/// stealing prevention turns into a taskbar highlight. The X server's current time
/// lets it through. Wayland has no server time, so it keeps the plain request.
#[cfg(target_os = "linux")]
pub fn show(app: &AppHandle) {
    use gtk::prelude::*;

    let Some(window) = app.get_webview_window("main") else {
        return;
    };

    let main = window.clone();
    let presented = main.run_on_main_thread(move || {
        let Ok(gtk_window) = window.gtk_window() else {
            return;
        };

        // Presenting also maps a hidden window and deiconifies a minimized one.
        gtk_window.show();
        let time = gtk_window
            .window()
            .and_then(|gdk_window| gdk_window.downcast::<gdkx11::X11Window>().ok())
            .map_or(gtk::gdk::ffi::GDK_CURRENT_TIME as u32, |x11_window| {
                gdkx11::functions::x11_get_server_time(&x11_window)
            });
        gtk_window.present_with_time(time);
    });
    if let Err(e) = presented {
        log::warn!("failed to bring the window back: {e}");
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn pixel(image: &Image<'_>, x: u32, y: u32) -> [u8; 4] {
        let at = ((y * image.width() + x) * 4) as usize;
        image.rgba()[at..at + 4].try_into().unwrap()
    }

    #[test]
    fn paints_the_dot_in_the_top_right_corner() {
        let icon = Image::new_owned([10, 20, 30, 255].repeat(32 * 32), 32, 32);
        let dotted = with_dot(&icon);

        assert_eq!((dotted.width(), dotted.height()), (32, 32));
        assert_eq!(pixel(&dotted, 25, 6), [0xe5, 0x48, 0x4d, 255]);
        assert_eq!(pixel(&dotted, 16, 16), [10, 20, 30, 255]);
        assert_eq!(pixel(&dotted, 0, 31), [10, 20, 30, 255]);
    }
}
