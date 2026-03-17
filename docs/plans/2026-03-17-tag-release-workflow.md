# EchoType Tag Release Workflow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 让 EchoType 在推送 `v1.2.3` 这样的 tag 或发布 GitHub Release 时，自动构建 unsigned macOS 安装包并上传到 Release。

**Architecture:** 使用一个独立的 GitHub Actions workflow 处理 release 构建，不影响现有 CI。构建前通过一个本地脚本把 tag 版本同步到 `package.json`、`src-tauri/tauri.conf.json` 和 `src-tauri/Cargo.toml`，确保产物版本与 tag 一致。

**Tech Stack:** GitHub Actions, GitHub CLI, Node.js, Tauri v2, macOS runner

---

### Task 1: 增加版本同步脚本

**Files:**
- Create: `scripts/set-release-version.mjs`

**Step 1: 接收 tag 或裸版本**

- 支持 `v1.2.3` 和 `1.2.3`
- 输出标准化版本 `1.2.3`

**Step 2: 更新版本文件**

- 修改 `package.json`
- 修改 `src-tauri/tauri.conf.json`
- 修改 `src-tauri/Cargo.toml`

### Task 2: 增加自动 release workflow

**Files:**
- Create: `.github/workflows/release-desktop.yml`

**Step 1: 配置触发器**

- `push.tags: ['v*']`
- `release.types: [published]`

**Step 2: 在 macOS runner 上构建**

- 安装 pnpm / Node / Rust
- 安装依赖
- 根据 tag 同步版本
- 执行 `pnpm tauri:build:unsigned`

**Step 3: 创建或复用 GitHub Release**

- tag push 时自动创建 release
- release 事件时复用现有 release

**Step 4: 上传产物**

- 上传 `.dmg`
- 把 `.app` 打成 `.zip` 后上传

### Task 3: 文档更新

**Files:**
- Update: `docs/mac-unsigned-distribution.md`

**Step 1: 说明自动触发方式**

- 写明 `git tag v1.2.3 && git push origin v1.2.3`
- 写明 workflow 产物位置和 Release 行为

### Task 4: 最小验证

**Files:**
- Verify: `.github/workflows/release-desktop.yml`
- Verify: `scripts/set-release-version.mjs`

**Step 1: 差异检查**

Run: `git diff --check -- .github/workflows/release-desktop.yml scripts/set-release-version.mjs docs/mac-unsigned-distribution.md`

Expected: 无 patch 格式错误

**Step 2: 本地版本脚本检查**

Run: `node scripts/set-release-version.mjs v1.2.3 --dry-run`

Expected: 输出将要写入的版本，不修改文件
