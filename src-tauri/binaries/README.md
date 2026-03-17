`pnpm build:tauri` will try to copy your current local `node` binary here as `src-tauri/binaries/node`.

If you want to override that, set:

```bash
TAURI_BUNDLED_NODE_PATH=/absolute/path/to/node pnpm build:tauri
```

You can also place the binary here manually before building a release app.

Requirements:

- macOS executable name: `node`
- executable bit set: `chmod +x src-tauri/binaries/node`
- architecture must match your release target, or be a universal binary

The bundled `node` binary is intentionally not committed because of size and licensing/runtime management concerns.
