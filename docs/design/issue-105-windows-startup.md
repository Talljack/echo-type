# Issue 105: Windows sidecar entry path

Issue: https://github.com/Talljack/echo-type/issues/105

Tauri resource paths can use Windows verbatim prefixes. Passing that full path as Node's entry argument triggers the reporter's EISDIR error before the server starts. The existing command already sets its working directory to the standalone folder. Use the relative entry `server.js` instead; retain the executable path, working directory, IPv4 binding and production environment unchanged. No new dependencies, storage changes or release version bump.

Regression coverage:
- Command inspection requires exactly `server.js` and preserves the working directory and environment. It failed against the old absolute-argument implementation before the fix.
- A real Node process runs a fixture from a canonicalized directory with spaces and Unicode. On Windows canonicalization produces the verbatim path implicated in the report.
- Windows-only command tests cover verbatim drive and UNC paths.

Validation on macOS: `cargo test --manifest-path src-tauri/Cargo.toml --lib`, `cargo check --manifest-path src-tauri/Cargo.toml --release`, touched-file rustfmt and diff checks passed. Windows-specific tests and the installed Windows app have not been run locally. Before shipping, run the same Rust tests on Windows with Node installed (or set `ECHOTYPE_TEST_NODE` to the bundled node.exe), then verify the packaged installer starts from a path with spaces/Unicode. No package has been published by this change.
