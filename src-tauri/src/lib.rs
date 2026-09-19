use std::fs;
use std::collections::HashMap;
use tauri::Manager;

mod sidecar;
mod tray;

const PROVIDER_CONFIG_FILE: &str = "provider-config.json";
const SETTINGS_SNAPSHOT_FILE: &str = "settings.json";

fn provider_config_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    app.path()
        .app_local_data_dir()
        .map(|dir| dir.join(PROVIDER_CONFIG_FILE))
        .map_err(|error| format!("Failed to resolve provider configuration directory: {error}"))
}

fn read_provider_config_file(path: &std::path::Path) -> Result<Option<String>, String> {
    match fs::read_to_string(path) {
        Ok(config) => Ok(Some(config)),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(format!("Failed to read provider configuration: {error}")),
    }
}

fn write_provider_config_file(path: &std::path::Path, config: &str) -> Result<(), String> {
    if config.len() > 1_000_000 {
        return Err("Provider configuration exceeds the 1 MB limit".to_string());
    }
    serde_json::from_str::<serde_json::Value>(&config)
        .map_err(|error| format!("Provider configuration is not valid JSON: {error}"))?;

    let parent = path
        .parent()
        .ok_or_else(|| "Provider configuration path has no parent directory".to_string())?;
    fs::create_dir_all(parent)
        .map_err(|error| format!("Failed to create configuration directory: {error}"))?;

    let temporary_path = path.with_extension("json.tmp");
    fs::write(&temporary_path, config)
        .map_err(|error| format!("Failed to write provider configuration: {error}"))?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(&temporary_path, fs::Permissions::from_mode(0o600))
            .map_err(|error| format!("Failed to secure provider configuration: {error}"))?;
    }

    fs::rename(&temporary_path, &path)
        .map_err(|error| format!("Failed to finalize provider configuration: {error}"))
}

#[tauri::command]
fn read_provider_config(app: tauri::AppHandle) -> Result<Option<String>, String> {
    read_provider_config_file(&provider_config_path(&app)?)
}

#[tauri::command]
fn write_provider_config(app: tauri::AppHandle, config: String) -> Result<(), String> {
    write_provider_config_file(&provider_config_path(&app)?, &config)
}

fn settings_snapshot_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    app.path()
        .app_local_data_dir()
        .map(|dir| dir.join(SETTINGS_SNAPSHOT_FILE))
        .map_err(|error| format!("Failed to resolve settings directory: {error}"))
}

#[tauri::command]
fn read_settings_snapshot(app: tauri::AppHandle) -> Result<HashMap<String, String>, String> {
    let path = settings_snapshot_path(&app)?;
    match fs::read_to_string(path) {
        Ok(contents) => serde_json::from_str(&contents).map_err(|error| format!("Failed to parse settings: {error}")),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(HashMap::new()),
        Err(error) => Err(format!("Failed to read settings: {error}")),
    }
}

#[tauri::command]
fn write_settings_snapshot(app: tauri::AppHandle, settings: HashMap<String, String>) -> Result<(), String> {
    let config = serde_json::to_string(&settings).map_err(|error| format!("Failed to serialize settings: {error}"))?;
    write_provider_config_file(&settings_snapshot_path(&app)?, &config)
}

#[tauri::command]
fn get_server_port(state: tauri::State<'_, sidecar::ServerState>) -> u16 {
    state.port
}

pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build());

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    let builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
        // Focus existing window when a second instance tries to launch
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.set_focus();
        }
    }));

    let run_result = builder
        .setup(|app| {
            let handle = app.handle().clone();

            // The tray is helpful but non-essential; don't abort app launch if it fails.
            if let Err(error) = tray::setup_tray(&handle) {
                eprintln!("Failed to initialize EchoType tray: {error}");
            }

            // In dev mode, Next.js dev server is managed by beforeDevCommand
            // In production, we start the standalone server as a sidecar
            if cfg!(dev) {
                app.manage(sidecar::ServerState { port: 3000 });
            } else {
                let port = sidecar::start_server(&handle)?;
                app.manage(sidecar::ServerState { port });

                // Navigate the bootstrap window to the local standalone server.
                if let Some(window) = app.get_webview_window("main") {
                    let url = format!("http://127.0.0.1:{port}")
                        .parse()
                        .map_err(|e| format!("Invalid sidecar URL: {e}"))?;
                    window
                        .navigate(url)
                        .map_err(|e| format!("Failed to navigate to sidecar: {e}"))?;
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_server_port,
            read_provider_config,
            write_provider_config,
            read_settings_snapshot,
            write_settings_snapshot
        ])
        .run(tauri::generate_context!());

    if let Err(error) = run_result {
        eprintln!("EchoType failed to launch: {error}");
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn provider_configuration_is_written_and_restored_from_a_file() {
        let directory = std::env::temp_dir().join(format!(
            "echotype-provider-config-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        std::fs::create_dir_all(&directory).unwrap();
        let path = directory.join(PROVIDER_CONFIG_FILE);
        let config =
            r#"{"activeProviderId":"openai","providers":{"openai":{"auth":{"apiKey":"test"}}}}"#;

        write_provider_config_file(&path, config).unwrap();

        assert_eq!(
            read_provider_config_file(&path).unwrap().as_deref(),
            Some(config)
        );
        assert!(write_provider_config_file(&path, "not-json").is_err());
        std::fs::remove_dir_all(directory).unwrap();
    }
}
