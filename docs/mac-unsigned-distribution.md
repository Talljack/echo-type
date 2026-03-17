# EchoType macOS 无需 Apple 账号的打包与安装

这条流程用于：

- 本机直接安装使用
- 给其他 macOS 用户分发未签名的 `.app` / `.dmg`
- 不依赖 Apple Developer Program、签名证书、notarization 或 App Store Connect

## 构建命令

```bash
pnpm tauri:build:unsigned
```

这个命令会自动做三件事：

1. 构建 Next.js standalone 服务端
2. 把当前机器的 `node` runtime 复制到 `src-tauri/binaries/node`
3. 生成未签名的 `.app` 和 `.dmg`

默认产物位置：

- `src-tauri/target/release/bundle/macos/EchoType.app`
- `src-tauri/target/release/bundle/dmg/EchoType_0.1.0_aarch64.dmg`

## 自动 release 打包

仓库已经支持两种自动触发方式：

- 推送 tag：`v1.2.3`
- 发布 GitHub Release

推荐主流程：

```bash
git tag v1.2.3
git push origin v1.2.3
```

GitHub Actions 会自动：

1. 把版本同步成 `1.2.3`
2. 构建 unsigned macOS `.app` 和 `.dmg`
3. 自动创建或复用对应的 GitHub Release
4. 上传 `.dmg` 和 `.app.zip`

如果你希望本地一条命令完成版本更新、提交、打 tag、推送，可以直接运行：

```bash
pnpm release:tag patch
```

也支持：

```bash
pnpm release:tag minor
pnpm release:tag major
pnpm release:tag 1.2.3
pnpm release:tag v1.2.3
```

这个脚本会：

1. 检查工作区是否干净
2. 检查当前分支是否为 `main`
3. 同步 `package.json`、`src-tauri/tauri.conf.json`、`src-tauri/Cargo.toml` 版本
4. 提交 `chore: release vX.Y.Z`
5. 创建并推送 tag
6. 触发 GitHub Actions 自动打包

预演命令：

```bash
pnpm release:tag patch --dry-run
```

## 如果你想指定自带的 Node

```bash
TAURI_BUNDLED_NODE_PATH=/absolute/path/to/node pnpm tauri:build:unsigned
```

适用于：

- 你想换成另一个 Node 版本
- 你准备打不同架构的包
- 你想改成你自己维护的 runtime

## 本机安装

直接打开：

- `src-tauri/target/release/bundle/macos/EchoType.app`

或者挂载 DMG 后把应用拖进 `Applications`。

## 给别人分发时的注意事项

这是未签名、未 notarize 的 macOS 应用，别人第一次打开时大概率会被 Gatekeeper 拦住。

常见打开方式：

1. 在 Finder 里右键应用，选择 `Open`
2. 如果系统仍然阻止，在“系统设置 -> 隐私与安全性”里允许打开
3. 或者在终端移除隔离属性：

```bash
xattr -dr com.apple.quarantine /Applications/EchoType.app
```

## 当前限制

- 现在打出来的是 `aarch64` 包，适合 Apple Silicon
- 如果要兼容 Intel Mac，需要准备对应架构或 universal 的 Node runtime，再做目标架构构建
- 这条分发链路不解决 App Store、签名、notarization 和自动更新问题

## 什么时候再切回 Apple 发布链路

当你要解决以下问题时，再补 Apple 账号相关配置：

- 用户双击就能直接打开，不被 Gatekeeper 拦
- 要通过官网下载时减少系统警告
- 要提交 Mac App Store
- 要做 notarization / 签名 / 安装包分发
