# EchoType Mac App Store 发布指南

本文档说明如何把当前基于 Tauri v2 的 EchoType 桌面版发布到 Mac App Store。

截至 2026-03-17，这个仓库已经可以：

- 用 `pnpm tauri:dev` 本地运行桌面版
- 用 `pnpm tauri:build` 构建桌面包
- 用 `scripts/build-tauri.sh` 生成 Next.js standalone 服务端产物

但它还没有完成 Mac App Store 所需的沙盒、签名和提交流程配置，所以还不能直接上传审核。

## 这篇文档适用于什么

适用于：

- 通过 Mac App Store 发布 EchoType 的 macOS 桌面版
- 当前仓库里的 Tauri v2 工程：`src-tauri/`
- 当前的 `Next.js standalone + Node sidecar` 架构

不适用于：

- 官网直发 `.dmg` / notarization-only 分发
- iPhone / iPad App Store 发布

## 如果你已经有 Apple 开发者账号，最短发布路径是什么

你已经有 Apple Developer Program 账号，下一步不是直接上传包，而是按下面这条路径走：

1. 在 App Store Connect 里创建一个 macOS App 记录。
2. 在 Apple Developer 里创建与包名一致的 App ID、证书、Provisioning Profile。
3. 给这个仓库补齐 App Store 专用配置文件：
   - `src-tauri/tauri.appstore.conf.json`
   - `src-tauri/Info.plist`
   - `src-tauri/Entitlements.plist`
4. 修掉当前最关键的上架阻塞项：
   - 生产包不能依赖用户机器上的 `node`
   - 必须验证 App Sandbox 下 `localhost`、文件导入、麦克风/语音相关能力是否正常
5. 构建 `.app`
6. 再把 `.app` 打成签名后的 `.pkg`
7. 用 Transporter、Xcode 或 `altool` 上传到 App Store Connect
8. 填写元数据、隐私信息、截图并提交审核

如果你只想知道一句话版答案：这个项目离“可提交审核”还差一段配置工作，尤其是 App Sandbox 和 Node sidecar 打包路径。

## 当前仓库状态

这个仓库目前已经有：

- Tauri v2 宿主壳
- `src-tauri/icons/` 里的 macOS 图标资源
- `scripts/build-tauri.sh` 生产构建脚本
- Next.js standalone 打包流程

这个仓库目前还没有提交的 App Store 专用文件：

- `src-tauri/tauri.appstore.conf.json`
- `src-tauri/Info.plist`
- `src-tauri/Entitlements.plist`
- 嵌入式 provisioning profile
- App Store 专用签名配置

还有一个最重要的架构问题：

- [`src-tauri/src/sidecar.rs`](/Users/yugangcao/apps/my-apps/echo-type/src-tauri/src/sidecar.rs) 现在会优先找打包进资源目录的 `binaries/node`，找不到时再退回系统里的 `node`
- 这个 fallback 对本地开发有用，但对 Mac App Store 提交不成立
- 上架版本必须只依赖应用包内部自带的 Node runtime，不能要求用户机器额外装 Node.js

## 先确认你的 Apple 侧准备项

在开始构建前，至少要准备好这些：

1. 有效的 Apple Developer Program 会员资格
2. 一个 App Store Connect 的 App 记录
3. 一个显式 App ID，且 Bundle ID 与 [`src-tauri/tauri.conf.json`](/Users/yugangcao/apps/my-apps/echo-type/src-tauri/tauri.conf.json) 里的 `identifier` 完全一致
4. 用于 Mac App Store 的签名证书
5. 对应的 App Store Connect provisioning profile

当前仓库里的 Bundle ID 是：

```json
"identifier": "com.echotype.desktop"
```

如果你不打算改包名，就应该在 Apple 侧也使用 `com.echotype.desktop`。

## 第一步：在 App Store Connect 创建 App

Apple 当前流程要求你在第一次上传前，先在 App Store Connect 创建 App 记录。

EchoType 建议这样填：

- Platform: `macOS`
- Name: `EchoType`
- Primary Language: 你的主语言
- Bundle ID: `com.echotype.desktop`
- SKU: 例如 `echotype-mac`

说明：

- `SKU` 只是你内部使用的唯一标识，不会展示给用户
- `Bundle ID` 一旦和已发布版本绑定，后续不应该随意变

## 第二步：在 Apple Developer 创建签名材料

你需要在 Apple Developer 后台准备：

1. 显式 App ID
2. App Store 签名证书
3. App Store Connect provisioning profile

这些对象之间必须一致：

- Team ID
- Bundle ID
- 证书
- Provisioning Profile

建议把 Team ID 先记下来，后面写 entitlement 要用。

## 第三步：给仓库补齐 App Store 专用配置

建议不要直接改基础配置 [`src-tauri/tauri.conf.json`](/Users/yugangcao/apps/my-apps/echo-type/src-tauri/tauri.conf.json)，而是单独加一份 App Store 专用配置：

`src-tauri/tauri.appstore.conf.json`

示例：

```json
{
  "bundle": {
    "macOS": {
      "entitlements": "./Entitlements.plist",
      "minimumSystemVersion": "12.0",
      "files": {
        "embedded.provisionprofile": "/absolute/path/to/EchoType.provisionprofile",
        "Info.plist": "./Info.plist"
      }
    }
  }
}
```

建议这样做的原因：

- 本地开发仍然保持简单，不影响 `pnpm tauri:dev`
- App Store 特有配置和普通桌面构建隔离开
- 机器相关的 profile 路径可以只放在本机，不污染通用配置

## 第四步：补 `Info.plist`

Tauri 官方的 App Store 指南明确要求补充 `Info.plist`，尤其是出口合规字段。

新增：

`src-tauri/Info.plist`

起步版本：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>ITSAppUsesNonExemptEncryption</key>
    <false/>
  </dict>
</plist>
```

对 EchoType，还建议你评估并补齐这些隐私描述键：

- `NSMicrophoneUsageDescription`
- `NSSpeechRecognitionUsageDescription`

原因：

- EchoType 有听说练习能力
- 仓库依赖了 `react-speech-recognition`
- Mac App Store 审核通常会关注麦克风和语音识别权限说明

这里需要说明一点：

- `NSMicrophoneUsageDescription` 基本可以视为必需
- `NSSpeechRecognitionUsageDescription` 是否必需，要看最终运行时是否真的触发系统语音识别权限
- 由于当前项目是 WebView + Web Speech API 架构，这一项必须在签名后的沙盒构建里实测确认

## 第五步：补 `Entitlements.plist`

Mac App Store 应用必须启用 App Sandbox，并声明所需 capability。

新增：

`src-tauri/Entitlements.plist`

最小示例：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>com.apple.security.app-sandbox</key>
    <true/>
    <key>com.apple.application-identifier</key>
    <string>TEAM_ID.com.echotype.desktop</string>
    <key>com.apple.developer.team-identifier</key>
    <string>TEAM_ID</string>
    <key>com.apple.security.network.client</key>
    <true/>
  </dict>
</plist>
```

把里面的 `TEAM_ID` 换成你自己的 Apple Team ID。

对 EchoType，这里至少要重点评估：

- `com.apple.security.network.client`
  因为 Tauri WebView 需要访问本地启动的 `http://127.0.0.1:<port>` sidecar 服务
- 麦克风相关 entitlement
  因为应用存在语音输入能力
- 文件访问相关 entitlement
  因为应用支持导入文件

注意：

- entitlement 不是越多越好
- 只加你真的需要、且经过验证的项

## 第六步：修掉当前最大的上架阻塞项

这个仓库最关键的问题不是“怎么上传”，而是“上传后的包是否符合 App Store 要求”。

当前 [`src-tauri/src/sidecar.rs`](/Users/yugangcao/apps/my-apps/echo-type/src-tauri/src/sidecar.rs) 的逻辑是：

1. 先找应用资源目录里的 `binaries/node`
2. 找不到就执行 `which node`

这意味着：

- 本地开发很方便
- 但生产发布仍然可能依赖用户本机的 Node

对 App Store 版本，你应该改成：

- 开发模式允许 fallback
- 生产模式禁止 fallback
- 如果打包资源里没有 Node，直接 fail fast

最少要确认这些资源最终真的被打进 `.app`：

- `binaries/node`
- `standalone/server.js`
- `.next/static`
- `public/`

## 第七步：确认 App Sandbox 下能正常运行

Tauri 官方文档明确提醒，提交前一定要验证应用在 App Sandbox 中能正常工作。

EchoType 至少要做这些回归：

1. 应用能启动
2. Node sidecar 能启动
3. WebView 能访问本地 `localhost` 服务
4. AI 相关 API route 正常
5. Dexie / IndexedDB 正常读写
6. 文件导入正常
7. 外链打开正常
8. 麦克风权限弹窗和录音流程正常
9. 语音识别流程正常

如果这里有任何一项失败，不要先上传，先把沙盒问题修掉。

## 构建流程

### 1. 先构建 Next.js standalone 产物

仓库里已经有脚本：

[`scripts/build-tauri.sh`](/Users/yugangcao/apps/my-apps/echo-type/scripts/build-tauri.sh)

它会做这些事：

- 执行 `TAURI_ENV=1 pnpm next build`
- 生成 `.next/standalone`
- 把 `.next/static` 拷进 standalone
- 把 `public/` 拷进 standalone

单独运行：

```bash
pnpm build:tauri
```

### 2. 构建用于 App Store 的 `.app`

建议使用单独的 App Store 配置来打包：

```bash
pnpm tauri build -- --bundles app --target universal-apple-darwin --config src-tauri/tauri.appstore.conf.json
```

说明：

- `universal-apple-darwin` 会同时支持 Intel 和 Apple Silicon
- 如果你只打 Apple Silicon，Tauri 官方建议把 `minimumSystemVersion` 提高到 `12.0`
- 当前仓库基础配置里写的是 `10.15`，这对 App Store 版本未必合适，建议单独放在 App Store 配置里调整

### 3. 把 `.app` 打成签名后的 `.pkg`

Mac App Store 最终上传的通常不是 `.app`，而是签名后的 `.pkg`。

示例：

```bash
xcrun productbuild \
  --sign "3rd Party Mac Developer Installer: YOUR TEAM" \
  --component "src-tauri/target/universal-apple-darwin/release/bundle/macos/EchoType.app" \
  /Applications \
  "EchoType.pkg"
```

如果你不是 universal 构建，请按实际产物路径调整。

## 上传流程

截至 2026-03-17，Apple 官方上传方式包括：

- Xcode
- `altool`
- Transporter

### 方式 A：用 `altool` 上传

```bash
xcrun altool \
  --upload-app \
  --type macos \
  --file "EchoType.pkg" \
  --apiKey "$APPLE_API_KEY_ID" \
  --apiIssuer "$APPLE_API_ISSUER"
```

适合：

- 你已经配置了 App Store Connect API key
- 想把上传流程放进命令行或 CI

### 方式 B：用 Transporter 上传

适合：

- 你想走图形界面
- 你想更方便地看上传日志和报错

### 方式 C：用 Xcode Organizer 上传

适合：

- 你习惯 Apple 原生工具链
- 想在本地图形界面里处理签名和分发

## 上传后的动作

包上传并被 Apple 处理完成后，你还要做这些：

1. 在 App Store Connect 确认 build 已出现
2. 把 build 绑定到目标版本
3. 填写 App 描述、关键词、支持链接、隐私政策
4. 上传截图
5. 回答出口合规问题
6. 填写 App Privacy
7. 如果需要，先走 TestFlight / 内部测试
8. 提交审核

## 针对 EchoType 的首发检查清单

- 已创建 App Store Connect App 记录
- 已创建显式 App ID
- 已准备 App Store 证书和 provisioning profile
- 已新增 `src-tauri/tauri.appstore.conf.json`
- 已新增 `src-tauri/Info.plist`
- 已新增 `src-tauri/Entitlements.plist`
- 生产模式已禁止 fallback 到系统 `node`
- `.app` 内已实际包含 Node binary 和 standalone server
- 沙盒下 `localhost` 通信正常
- 沙盒下文件导入正常
- 沙盒下麦克风/语音流程正常
- 已成功构建 `.app`
- 已成功构建签名 `.pkg`
- 已成功上传到 App Store Connect

## 我对你当前状态的直接建议

如果你现在就要开始发布，建议顺序是：

1. 先在 Apple 后台把 App 记录、证书、profile 建好
2. 然后补齐这三个文件：
   - `src-tauri/tauri.appstore.conf.json`
   - `src-tauri/Info.plist`
   - `src-tauri/Entitlements.plist`
3. 接着修改 `sidecar.rs`，确保生产包不再依赖系统 Node
4. 再做一次真实的签名构建和沙盒回归
5. 最后上传 `.pkg`

如果只完成 Apple 后台配置，而不先处理 sidecar / sandbox，这个包大概率会在提交前或审核时出问题。

## 参考资料

- Apple App Store Connect：Create an app record
  https://developer.apple.com/help/app-store-connect/create-an-app-record/add-a-new-app/
- Apple App Store Connect：Upload builds
  https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/
- Apple Developer：Create an App Store Connect provisioning profile
  https://developer.apple.com/help/account/provisioning-profiles/create-an-app-store-provisioning-profile/
- Apple Developer：App Sandbox entitlement reference
  https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.security.network.client
- Apple Developer：`NSSpeechRecognitionUsageDescription`
  https://developer.apple.com/documentation/bundleresources/information-property-list/nsspeechrecognitionusagedescription
- Apple Developer：`NSMicrophoneUsageDescription`
  https://developer.apple.com/documentation/bundleresources/information_property_list/nsmicrophoneusagedescription
- Tauri v2：Distribute iOS and macOS apps to the App Store
  https://v2.tauri.app/distribute/app-store/
