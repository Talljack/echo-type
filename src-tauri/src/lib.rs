use tauri::Manager;

mod sidecar;

#[tauri::command]
fn get_server_port(state: tauri::State<'_, sidecar::ServerState>) -> u16 {
    state.port
}

pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init());

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    let builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
        // Focus existing window when a second instance tries to launch
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.set_focus();
        }
    }));

    builder
        .setup(|app| {
            let handle = app.handle().clone();

            // In dev mode, Next.js dev server is managed by beforeDevCommand
            // In production, we start the standalone server as a sidecar
            if cfg!(dev) {
                app.manage(sidecar::ServerState { port: 3000 });
            } else {
                let port = sidecar::start_server(&handle)?;
                app.manage(sidecar::ServerState { port });

                // Navigate webview to the sidecar server
                if let Some(window) = app.get_webview_window("main") {
                    let url = format!("http://localhost:{}", port);
                    let _ = window.eval(&format!("window.location.replace('{}')", url));
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_server_port])
        .run(tauri::generate_context!())
        .expect("error while running EchoType");
}
