//! The tray icon, which keeps the app watching for replays with its window closed.

use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager};

const TRAY_ID: &str = "main";
const OPEN_ID: &str = "open";
const QUIT_ID: &str = "quit";

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
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }

    tray.build(app)?;
    Ok(())
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
