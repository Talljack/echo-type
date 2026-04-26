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
const TRAY_ICON_BYTES: &[u8] = include_bytes!("../icons/32x32.png");

fn load_tray_icon(app: &AppHandle) -> Result<Image<'static>, Box<dyn std::error::Error>> {
    if let Ok(icon) = Image::from_bytes(TRAY_ICON_BYTES) {
        return Ok(icon);
    }

    app.default_window_icon()
        .map(|icon| icon.clone().to_owned())
        .ok_or_else(|| "Failed to load tray icon bytes and no default window icon was available".into())
}

pub fn setup_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let show_hide = MenuItemBuilder::with_id(SHOW_HIDE_ID, "Hide Window").build(app)?;
    let dashboard = MenuItemBuilder::with_id(DASHBOARD_ID, "Dashboard").build(app)?;
    let settings = MenuItemBuilder::with_id(SETTINGS_ID, "Settings")
        .accelerator("CmdOrCtrl+,")
        .build(app)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit = MenuItemBuilder::with_id(QUIT_ID, "Quit")
        .accelerator("CmdOrCtrl+Q")
        .build(app)?;

    let menu = MenuBuilder::new(app)
        .item(&show_hide)
        .item(&dashboard)
        .item(&settings)
        .item(&separator)
        .item(&quit)
        .build()?;

    let icon = load_tray_icon(app)?;

    let show_hide_for_tray = show_hide.clone();
    let show_hide_for_menu = show_hide.clone();

    TrayIconBuilder::new()
        .icon(icon)
        .tooltip("EchoType")
        .menu(&menu)
        .on_tray_icon_event(move |tray_icon, event| {
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
                        let _ = show_hide_for_tray.set_text("Show Window");
                    } else {
                        let _ = window.show();
                        let _ = window.set_focus();
                        let _ = show_hide_for_tray.set_text("Hide Window");
                    }
                }
            }
        })
        .on_menu_event(move |app, event| match event.id().as_ref() {
            SHOW_HIDE_ID => {
                if let Some(window) = app.get_webview_window("main") {
                    if window.is_visible().unwrap_or(false) {
                        let _ = window.hide();
                        let _ = show_hide_for_menu.set_text("Show Window");
                    } else {
                        let _ = window.show();
                        let _ = window.set_focus();
                        let _ = show_hide_for_menu.set_text("Hide Window");
                    }
                }
            }
            DASHBOARD_ID => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                    let _ = window.eval("window.location.pathname = '/dashboard';");
                }
            }
            SETTINGS_ID => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                    let _ = window.eval("window.location.pathname = '/settings';");
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
