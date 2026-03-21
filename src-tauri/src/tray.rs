use tauri::{
    image::Image,
    menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem},
    tray::TrayIconBuilder,
    AppHandle, Manager,
};

const SHOW_HIDE_ID: &str = "show_hide";
const DASHBOARD_ID: &str = "dashboard";
const SETTINGS_ID: &str = "settings";
const QUIT_ID: &str = "quit";

pub fn setup_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let show_hide = MenuItemBuilder::with_id(SHOW_HIDE_ID, "Hide Window").build(app)?;
    let dashboard = MenuItemBuilder::with_id(DASHBOARD_ID, "Dashboard").build(app)?;
    let settings = MenuItemBuilder::with_id(SETTINGS_ID, "Settings").build(app)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit = MenuItemBuilder::with_id(QUIT_ID, "Quit").build(app)?;

    let menu = MenuBuilder::new(app)
        .item(&show_hide)
        .item(&dashboard)
        .item(&settings)
        .item(&separator)
        .item(&quit)
        .build()?;

    let icon = Image::from_path("icons/32x32.png")
        .or_else(|_| app.default_window_icon().cloned().ok_or("no default icon"))
        .map_err(|e| format!("Failed to load tray icon: {e}"))?;

    TrayIconBuilder::new()
        .icon(icon)
        .tooltip("EchoType")
        .menu(&menu)
        .on_tray_icon_event(|tray_icon, event| {
            if let tauri::tray::TrayIconEvent::Click {
                button: tauri::tray::MouseButton::Left,
                button_state: tauri::tray::MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray_icon.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    if window.is_visible().unwrap_or(false) {
                        let _ = window.hide();
                    } else {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            }
        })
        .on_menu_event(|app, event| match event.id().as_ref() {
            SHOW_HIDE_ID => {
                if let Some(window) = app.get_webview_window("main") {
                    if window.is_visible().unwrap_or(false) {
                        let _ = window.hide();
                    } else {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            }
            DASHBOARD_ID => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                    let _ = window.eval("window.location.hash = '#/dashboard';");
                }
            }
            SETTINGS_ID => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                    let _ = window.eval("window.location.hash = '#/settings';");
                }
            }
            QUIT_ID => {
                app.exit(0);
            }
            _ => {}
        })
        .build(app)?;

    Ok(())
}
