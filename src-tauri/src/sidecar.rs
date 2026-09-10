use std::net::TcpListener;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Manager};

pub struct ServerState {
    pub port: u16,
}

const PREFERRED_LOCALHOST_PORT: u16 = 54576;

fn is_dev_build() -> bool {
    cfg!(dev) || cfg!(debug_assertions)
}

/// Reuse a stable localhost port when available so WebKit media permissions can persist.
fn find_server_port() -> Result<u16, Box<dyn std::error::Error>> {
    if let Ok(listener) = TcpListener::bind(("127.0.0.1", PREFERRED_LOCALHOST_PORT)) {
        drop(listener);
        return Ok(PREFERRED_LOCALHOST_PORT);
    }

    let listener = TcpListener::bind("127.0.0.1:0")?;
    let port = listener.local_addr()?.port();
    drop(listener);
    eprintln!(
        "Preferred EchoType localhost port {PREFERRED_LOCALHOST_PORT} is unavailable, falling back to {port}"
    );
    Ok(port)
}

/// Get the path to the bundled Node.js binary
fn get_node_binary_path(app: &AppHandle) -> Result<PathBuf, Box<dyn std::error::Error>> {
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("Failed to get resource dir: {}", e))?;

    let node_binary = if cfg!(windows) { "node.exe" } else { "node" };
    let node_path = resource_dir.join("binaries").join(node_binary);

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
    let cmd = if cfg!(windows) { "where" } else { "which" };
    Command::new(cmd)
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

fn server_command(
    node_path: &Path,
    server_path: &Path,
    port: u16,
) -> Result<Command, Box<dyn std::error::Error>> {
    // Set the working directory to the standalone directory
    let working_dir = server_path
        .parent()
        .ok_or("Invalid server path")?
        .to_path_buf();

    let mut command = Command::new(node_path);
    command
        // Tauri can return a Windows verbatim path (\\?\...). Node cannot
        // resolve that form as its entry script (#105). The working directory
        // already identifies the standalone bundle, so keep the entry relative.
        .arg("server.js")
        .current_dir(&working_dir)
        .env("PORT", port.to_string())
        // Bind explicitly to IPv4. On Windows, `localhost` may resolve to ::1
        // while the readiness probe and WebView use 127.0.0.1.
        .env("HOSTNAME", "127.0.0.1")
        .env("NODE_ENV", "production");
    Ok(command)
}

/// Start the Next.js standalone server and return the port
pub fn start_server(app: &AppHandle) -> Result<u16, Box<dyn std::error::Error>> {
    let port = find_server_port()?;
    let node_path = get_node_binary_path(app)?;
    let server_path = get_server_path(app)?;

    // Spawn the server process
    let mut child = server_command(&node_path, &server_path, port)?
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::ffi::OsStr;

    #[test]
    fn node_starts_from_a_canonical_directory_with_spaces_and_unicode() {
        let root = std::env::temp_dir().join(format!(
            "echotype-105-{}-{} 空格",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        std::fs::create_dir(&root).unwrap();
        struct Cleanup(PathBuf);
        impl Drop for Cleanup {
            fn drop(&mut self) {
                let _ = std::fs::remove_file(self.0.join("server.js"));
                let _ = std::fs::remove_dir(&self.0);
            }
        }
        let _cleanup = Cleanup(root.clone());
        std::fs::write(
            root.join("server.js"),
            "if (process.env.PORT !== '12345' || process.env.HOSTNAME !== '127.0.0.1' || process.env.NODE_ENV !== 'production') process.exit(1); console.log('sidecar-started');",
        ).unwrap();
        // canonicalize produces a verbatim path on Windows, like resource_dir().
        let server = root.join("server.js").canonicalize().unwrap();
        let node = std::env::var_os("ECHOTYPE_TEST_NODE")
            .map(PathBuf::from)
            .unwrap_or_else(|| PathBuf::from("node"));
        let output = server_command(&node, &server, 12345)
            .unwrap()
            .output()
            .expect("Node.js must be installed to run the sidecar startup regression");
        assert!(
            output.status.success(),
            "{}",
            String::from_utf8_lossy(&output.stderr)
        );
        assert_eq!(
            String::from_utf8_lossy(&output.stdout).trim(),
            "sidecar-started"
        );
    }

    #[test]
    fn entry_argument_is_relative_to_the_standalone_directory() {
        let root = std::env::temp_dir().join("EchoType test 中文");
        let node = root.join("binaries").join("node");
        let server = root.join("standalone").join("server.js");
        let command = server_command(&node, &server, 12345).unwrap();
        assert_eq!(command.get_program(), node.as_os_str());
        assert_eq!(
            command.get_args().collect::<Vec<_>>(),
            [OsStr::new("server.js")]
        );
        assert_eq!(command.get_current_dir(), server.parent());
        let envs = command
            .get_envs()
            .collect::<std::collections::HashMap<_, _>>();
        assert_eq!(envs[OsStr::new("PORT")], Some(OsStr::new("12345")));
        assert_eq!(envs[OsStr::new("HOSTNAME")], Some(OsStr::new("127.0.0.1")));
        assert_eq!(envs[OsStr::new("NODE_ENV")], Some(OsStr::new("production")));
    }

    #[cfg(windows)]
    #[test]
    fn windows_verbatim_drive_and_unc_paths_never_reach_node_arguments() {
        for root in [
            r"\\?\C:\Users\Test User\EchoType",
            r"\\?\UNC\server\share\EchoType",
        ] {
            let root = PathBuf::from(root);
            let node = root.join("binaries").join("node.exe");
            let server = root.join("standalone").join("server.js");
            let command = server_command(&node, &server, 12345).unwrap();
            assert_eq!(
                command.get_args().collect::<Vec<_>>(),
                [OsStr::new("server.js")]
            );
            assert_eq!(command.get_current_dir(), server.parent());
        }
    }
}
