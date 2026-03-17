use std::net::TcpListener;
use std::path::PathBuf;
use std::process::Command;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Manager};

pub struct ServerState {
    pub port: u16,
}

fn is_dev_build() -> bool {
    cfg!(dev) || cfg!(debug_assertions)
}

/// Find an available TCP port
fn find_free_port() -> Result<u16, Box<dyn std::error::Error>> {
    let listener = TcpListener::bind("127.0.0.1:0")?;
    let port = listener.local_addr()?.port();
    drop(listener);
    Ok(port)
}

/// Get the path to the bundled Node.js binary
fn get_node_binary_path(app: &AppHandle) -> Result<PathBuf, Box<dyn std::error::Error>> {
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("Failed to get resource dir: {}", e))?;

    let node_path = resource_dir.join("binaries").join("node");

    if node_path.exists() {
        return Ok(node_path);
    }

    if is_dev_build() {
        return which_node().ok_or_else(|| "Node.js not found. Please install Node.js.".into());
    }

    Err(format!(
        "Bundled Node.js not found at {:?}. Release builds must include src-tauri/binaries/node in the app resources.",
        node_path
    )
    .into())
}

/// Try to find system Node.js
fn which_node() -> Option<PathBuf> {
    Command::new("which")
        .arg("node")
        .output()
        .ok()
        .and_then(|output| {
            if output.status.success() {
                let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !path.is_empty() {
                    return Some(PathBuf::from(path));
                }
            }
            None
        })
}

/// Get the path to the standalone Next.js server
fn get_server_path(app: &AppHandle) -> Result<PathBuf, Box<dyn std::error::Error>> {
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("Failed to get resource dir: {}", e))?;

    // In production build, the standalone server is bundled as a resource
    let server_path = resource_dir.join("standalone").join("server.js");

    if server_path.exists() {
        return Ok(server_path);
    }

    if is_dev_build() {
        // Fallback: check relative to the project root (dev build)
        let project_server = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .unwrap()
            .join(".next")
            .join("standalone")
            .join("server.js");

        if project_server.exists() {
            return Ok(project_server);
        }
    }

    Err(
        "Standalone server not found in bundled resources. Run 'pnpm build:tauri' and ensure .next/standalone is packaged into the app."
            .into(),
    )
}

/// Wait for the server to be ready by polling the health endpoint
fn wait_for_server(port: u16, timeout: Duration) -> Result<(), Box<dyn std::error::Error>> {
    let start = Instant::now();
    let url = format!("http://127.0.0.1:{}", port);

    loop {
        if start.elapsed() > timeout {
            return Err(format!(
                "Server failed to start within {} seconds",
                timeout.as_secs()
            )
            .into());
        }

        match reqwest::blocking::Client::new()
            .get(&url)
            .timeout(Duration::from_secs(2))
            .send()
        {
            Ok(resp) if resp.status().is_success() || resp.status().is_redirection() => {
                return Ok(());
            }
            _ => {
                std::thread::sleep(Duration::from_millis(200));
            }
        }
    }
}

/// Start the Next.js standalone server and return the port
pub fn start_server(app: &AppHandle) -> Result<u16, Box<dyn std::error::Error>> {
    let port = find_free_port()?;
    let node_path = get_node_binary_path(app)?;
    let server_path = get_server_path(app)?;

    // Set the working directory to the standalone directory
    let working_dir = server_path
        .parent()
        .ok_or("Invalid server path")?
        .to_path_buf();

    // Spawn the server process
    let mut child = Command::new(&node_path)
        .arg(&server_path)
        .current_dir(&working_dir)
        .env("PORT", port.to_string())
        .env("HOSTNAME", "127.0.0.1")
        .env("NODE_ENV", "production")
        .spawn()
        .map_err(|e| format!("Failed to start server: {}. Node path: {:?}", e, node_path))?;

    // Wait for the server to be ready (30 second timeout)
    match wait_for_server(port, Duration::from_secs(30)) {
        Ok(()) => {
            // Store the child process handle for cleanup
            // The process will be killed when the app exits
            std::thread::spawn(move || {
                let _ = child.wait();
            });
            Ok(port)
        }
        Err(e) => {
            let _ = child.kill();
            Err(e)
        }
    }
}
