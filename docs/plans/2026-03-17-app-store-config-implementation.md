# EchoType App Store Config Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 EchoType 补齐 Mac App Store 最小工程配置，并让生产 sidecar 只依赖应用包内资源。

**Architecture:** 保持现有 `Next.js standalone + Tauri + Node sidecar` 架构不变。通过新增 App Store 专用配置文件、声明 Tauri 资源打包、以及在 Rust sidecar 中对发布模式执行 fail-fast，先把工程推进到“可签名验证”的状态。

**Tech Stack:** Tauri v2, Rust, Next.js standalone, macOS App Sandbox

---

### Task 1: 补齐 App Store 配置文件

**Files:**
- Create: `src-tauri/tauri.appstore.conf.json`
- Create: `src-tauri/Info.plist`
- Create: `src-tauri/Entitlements.plist`
- Modify: `.gitignore`

**Step 1: 写入 App Store 基础配置**

- 新增 `src-tauri/tauri.appstore.conf.json`
- 设置 `bundle.macOS.entitlements`
- 设置 `bundle.macOS.minimumSystemVersion`
- 注入 `Info.plist`

**Step 2: 写入最小 `Info.plist`**

- 增加出口合规字段
- 增加麦克风与语音识别权限文案

**Step 3: 写入最小 `Entitlements.plist`**

- 开启 `com.apple.security.app-sandbox`
- 开启网络客户端/服务端权限
- 开启麦克风和用户选择文件读写权限
- 用 `__TEAM_ID__` 占位，避免提交真实团队信息

**Step 4: 忽略本机发布材料**

- 在 `.gitignore` 中忽略本机的 profile 和本地覆盖配置

### Task 2: 声明生产资源打包

**Files:**
- Modify: `src-tauri/tauri.conf.json`

**Step 1: 配置 `bundle.resources`**

- 将 `../.next/standalone/` 打包到资源目录的 `standalone/`
- 将 `binaries/` 打包到资源目录的 `binaries/`

**Step 2: 保持现有开发/构建行为不变**

- 不改 `beforeDevCommand`
- 不改现有窗口与插件配置

### Task 3: 收紧 sidecar 生产逻辑

**Files:**
- Modify: `src-tauri/src/sidecar.rs`

**Step 1: 区分开发和发布模式**

- 开发模式允许继续 fallback 到系统 `node`
- 发布模式只允许使用包内 `binaries/node`

**Step 2: 增加更明确的错误信息**

- 找不到 Node 时，直接报出资源路径和修复方向
- 找不到 standalone server 时，保留现有构建提示

### Task 4: 最小验证

**Files:**
- Verify: `src-tauri/tauri.conf.json`
- Verify: `src-tauri/src/sidecar.rs`
- Verify: `src-tauri/Info.plist`
- Verify: `src-tauri/Entitlements.plist`

**Step 1: 检查差异和格式**

Run: `git diff --check -- .gitignore src-tauri/tauri.conf.json src-tauri/src/sidecar.rs src-tauri/Info.plist src-tauri/Entitlements.plist src-tauri/tauri.appstore.conf.json`

Expected: 无空格或 patch 格式错误

**Step 2: 做一次最小构建前静态检查**

Run: `cargo check --manifest-path src-tauri/Cargo.toml`

Expected: Rust 代码可编译
