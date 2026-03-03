# EchoType Vercel 部署文档

本文档基于当前仓库代码整理，目标是把 EchoType 以 `Next.js + Vercel Functions` 的方式部署到线上，并明确哪些功能可以直接上线，哪些功能在 Vercel 上需要额外改造。

## 1. 当前项目适合怎样部署

推荐架构：

- Web 应用：部署到 Vercel
- AI 能力：通过外部模型供应商 API 提供，例如 OpenAI、Anthropic、Google、DeepSeek、Groq
- 用户认证与云数据：后续接入 Supabase
- 浏览器本地学习数据：继续保存在 Dexie / IndexedDB

当前仓库是标准 Next.js App Router 项目，主应用和大多数 API Route 都可以直接部署到 Vercel。Vercel 会自动识别 Next.js，因此这套项目不需要先写 `vercel.json` 才能上线。

## 2. 可以直接部署到 Vercel 的部分

以下能力按当前实现可以直接放到 Vercel：

- 页面路由与 App Router 布局
- AI Chat：`src/app/api/chat/route.ts`
- AI 内容生成：`src/app/api/ai/generate/route.ts`
- OAuth token exchange：`src/app/api/auth/token/route.ts`
- YouTube transcript 获取：`src/app/api/import/youtube/route.ts`
- PDF / DOCX / EPUB / TXT 文本抽取：`src/app/api/import/pdf/route.ts`、`src/app/api/import/extract-text/route.ts`
- 浏览器端语音识别、语音播放、Dexie 本地数据

这些能力主要依赖：

- Next.js Route Handlers
- 外部 HTTP API
- 浏览器能力

它们不依赖持久本地文件系统，因此适合 Vercel 的 Serverless / Functions 运行模型。

## 3. 当前不建议直接部署到 Vercel 的部分

以下能力在当前实现下不适合直接上线到 Vercel，原因不是 Next.js 本身，而是依赖了 Vercel 不提供或不持久的运行时能力。

### 3.1 本地文件写入不是持久存储

受影响文件：

- `src/app/api/import/upload-media/route.ts`
- `src/app/api/tools/extract/route.ts`

这两个接口会把文件写到 `public/media`。按 Vercel 当前文档，Functions 文件系统是只读的，只有 `/tmp` 提供临时可写 scratch space，因此不能把运行时写入内容当成长期媒体存储来用。结果就是：

- 上传后文件可能在后续请求中消失
- 多个实例之间不会共享这些文件
- 重新部署后文件一定不会保留

推荐改法：

- 把媒体上传改成对象存储，例如 Vercel Blob、S3、R2、Supabase Storage
- 数据库里只保存外链 URL 和元数据

### 3.2 `yt-dlp` 依赖已解决 ✅

**状态**: 已实现 Vercel 兼容方案

受影响文件：

- `src/app/api/tools/download/route.ts` — 仍需要 yt-dlp（仅本地可用）
- `src/app/api/tools/extract/route.ts` — **已支持 Vercel**
- `src/lib/youtube-transcript.ts` — **新增**：YouTube Transcript API 客户端

**解决方案**：

当前实现已支持**环境自适应**：

1. **本地开发环境**（有 yt-dlp）：
   - 支持所有平台：YouTube, Bilibili, TikTok, Twitter/X, Facebook, Instagram
   - 可下载音频文件
   - 使用 yt-dlp 提取字幕

2. **Vercel 生产环境**（无 yt-dlp）：
   - **仅支持 YouTube**（使用公开 Transcript API）
   - 无需 API key，无需 yt-dlp 二进制
   - 自动提取视频字幕和元数据
   - 不提供音频下载（Vercel 文件系统限制）

3. **优雅降级**：
   - 非 YouTube 平台在 Vercel 上返回 501 错误，提示仅支持 YouTube
   - 错误信息包含友好提示，告知用户本地开发可支持更多平台

**技术实现**：

```typescript
// 环境检测
const IS_VERCEL = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;

// Vercel 环境：使用 YouTube Transcript API
if (IS_VERCEL && isYouTubeUrl(url)) {
  const result = await extractYouTubeWithTranscriptAPI(url);
  return NextResponse.json(result);
}

// 本地环境：使用 yt-dlp（支持所有平台）
const ytDlpPath = await getYtDlpPath();
if (ytDlpPath) {
  // ... yt-dlp 逻辑
}
```

**YouTube Transcript API 特性**：

- ✅ 无需认证，使用 YouTube 公开 API
- ✅ 支持手动字幕和自动生成字幕
- ✅ 提取时间戳分段（segments with start/duration）
- ✅ 自动解码 HTML 实体
- ✅ 通过 oEmbed API 获取视频元数据（标题、作者、缩略图）

**限制**：

- Vercel 上仅支持 YouTube（其他平台需要 yt-dlp）
- 不提供音频下载（需要对象存储方案）
- 依赖视频有英文字幕（无字幕视频会返回错误）

**推荐**：

对于生产环境，YouTube 是最常用的学习内容来源，当前方案已满足 80% 的使用场景。如需支持其他平台，可考虑：

- 使用第三方 API（如 RapidAPI 的视频下载服务）
- 部署独立的 Worker 服务处理 yt-dlp 任务
- 引导用户使用本地上传功能（`/api/import/transcribe`）

### 3.3 本地模型提供商不能部署到 Vercel

受影响 provider：

- `ollama`
- `lmstudio`

它们依赖本机服务地址，例如 `http://localhost:11434`。部署到 Vercel 后，“本机”变成 Vercel Function 实例，不会存在你的本地 Ollama / LM Studio 服务。

结论：

- 线上环境请使用云端 provider
- 本地 provider 只保留给本地开发或内网部署

## 4. 部署前准备

在开始前，准备以下内容：

1. 一个 Vercel 账号
2. Git 仓库已推送到 GitHub / GitLab / Bitbucket
3. 至少一种可供线上用户自行配置的云端 AI Provider，例如 Groq、OpenAI、Anthropic
4. 如果要走 OAuth 登录模型供应商，还需要对应的 Client ID / Client Secret

当前代码的运行方式是：

- 模型 API Key 由用户在应用的 `/settings` 页面自行配置
- 请求时通过用户保存的 provider 配置或请求头传到对应 Route Handler
- 线上部署本身不再依赖 Vercel 环境变量中的模型 key

这意味着：

- 你可以不在 Vercel 中配置 `OPENAI_API_KEY`、`GROQ_API_KEY` 之类的模型 key
- 只要用户自己在应用里配置了 provider key，`/api/chat`、`/api/ai/generate`、`/api/translate`、`/api/tools/classify`、`/api/recommendations`、`/api/assessment`、`/api/speak`、`/api/import/transcribe` 都可以工作
- 如果你要提供“平台预置账号”或“匿名即用的共享模型 key”，那是额外产品决策，当前仓库默认没有这样做

## 5. Vercel 项目创建步骤

### 5.1 从 Git 导入项目

在 Vercel 控制台中：

1. 点击 `Add New...`
2. 选择 `Project`
3. 选择 EchoType 对应仓库
4. 进入 Import 页面

### 5.2 Build 设置

当前仓库推荐使用以下设置：

- Framework Preset: `Next.js`
- Root Directory: 仓库根目录
- Install Command: `pnpm install --frozen-lockfile`
- Build Command: `pnpm build`
- Output Directory: 留空，使用 Next.js 默认输出

说明：

- 仓库里存在 `pnpm-lock.yaml`，所以应该让 Vercel 使用 pnpm
- 当前 `package.json` 已包含标准 `build` 脚本，不需要额外自定义

### 5.3 Node.js 版本

建议在 Vercel Project Settings 中显式设置：

- Node.js Version: `20.x`

原因：

- 当前项目基于 Next.js 16、React 19、现代 Route Handlers
- 显式锁定 Node LTS 能降低本地与线上差异

## 6. 环境变量

当前线上部署的真实要求是：

- 模型 provider 的 API Key 不需要放到 Vercel Environment Variables
- 用户在应用里自己配置的 key 会作为运行时凭据使用
- Vercel 环境变量主要只用于 OAuth、公开 Client ID，或未来你自己新增的服务端集成

### 6.1 线上通常需要配置的变量

如果你要让用户通过 OAuth 连接 OpenAI / Google，需要额外配置：

```env
NEXT_PUBLIC_OPENAI_CLIENT_ID=
OPENAI_CLIENT_SECRET=
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

注意：

- `NEXT_PUBLIC_*` 会暴露到浏览器，只能放 Client ID 这类公开值
- `*_CLIENT_SECRET` 只能放在服务端环境变量中

### 6.2 可选环境变量

下面这些变量现在更适合本地开发、运维调试或你未来自己扩展“平台托管 key”模式时使用；按当前代码，不是 Vercel 上线的必需项：

```env
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=
DEEPSEEK_API_KEY=
XAI_API_KEY=
GROQ_API_KEY=
CEREBRAS_API_KEY=
MISTRAL_API_KEY=
COHERE_API_KEY=
PERPLEXITY_API_KEY=
TOGETHER_API_KEY=
DEEPINFRA_API_KEY=
FIREWORKS_API_KEY=
OPENROUTER_API_KEY=
ZAI_API_KEY=
MINIMAX_API_KEY=
MOONSHOT_API_KEY=
SILICONFLOW_API_KEY=
```

说明：

- 当前线上运行不会默认读取这些变量作为用户请求的模型凭据
- 如果用户没有在 `/settings` 配好自己的 provider key，对应功能仍会返回未配置错误
- `GROQ_FREE_KEY` 已移除，不应再配置

### 6.3 仅本地开发使用，不建议放到 Vercel

```env
OLLAMA_BASE_URL=http://localhost:11434
LMSTUDIO_API_KEY=
```

这两项对应本地 provider，不适合 Vercel 线上部署。

## 7. 推荐的 Production / Preview 环境策略

建议这样分层：

- Production：正式域名，放正式 OAuth / 平台级服务变量
- Preview：给 PR / 测试分支使用，放测试 OAuth / 平台级服务变量
- Development：本地开发使用

推荐做法：

- OAuth 回调地址分别配置 Production 与 Preview 域名
- 不要把高权限平台密钥同时暴露给所有环境
- 如果未来真的要引入“平台共享模型 key”，要单独做配额、审计和滥用保护，不建议直接复用当前用户自配置模型流

## 8. 当前仓库里已经做的 Vercel 友好配置

为了避免 AI 请求或 Whisper 转写在 Vercel 上过早超时，建议为这些路由显式配置 Node.js runtime 和较长的 `maxDuration`：

- `src/app/api/chat/route.ts`
- `src/app/api/ai/generate/route.ts`
- `src/app/api/import/transcribe/route.ts`

当前仓库已经适合这样配置：

- `runtime = 'nodejs'`
- `maxDuration = 60`

补充说明：

- 按 Vercel 2025 年底到 2026 年初的文档，开启 Fluid Compute 的项目默认函数时长已经是 300 秒
- 这里仍然显式写 `maxDuration = 60`，目的是让这些 AI 路由的行为更可预期，而不是依赖项目级默认值

这比依赖平台默认值更稳，尤其是：

- 流式聊天
- 模型首包较慢
- Whisper 转写

## 9. 推荐部署流程

### 9.1 第一次上线

本地先验证：

```bash
pnpm install
pnpm build
```

然后在 Vercel 控制台导入仓库，按需添加 OAuth 相关环境变量，点击部署。

### 9.2 后续发布

后续只要推送到主分支，Vercel 会自动触发新部署。

推荐分支策略：

- `main` -> Production
- 功能分支 / PR -> Preview

## 10. 如果你想用 Vercel CLI

本地可以这样操作：

```bash
pnpm install
pnpm build
pnpm dlx vercel
pnpm dlx vercel --prod
```

首次执行 CLI 时会要求：

- 登录 Vercel
- 选择团队
- 关联本地目录到项目
- 确认环境变量来源

如果项目已经在控制台导入过，CLI 会直接复用线上项目配置。

## 11. 上线后检查清单

部署完成后，至少检查以下项目：

1. 首页和主要模块页面能正常打开
2. `/settings` 中 provider 配置 UI 正常显示
3. 用户在 `/settings` 中保存 provider key 后，`/api/chat` 可以正常返回流式内容
4. 用户在 `/settings` 中保存 provider key 后，`/api/ai/generate` 可以返回练习内容
5. 用户在 `/settings` 中保存 provider key 后，`/api/import/transcribe` 在 25MB 以内音频上能成功
6. OAuth 回调没有 `redirect_uri_mismatch`
7. 浏览器端 Dexie 数据写入正常

## 12. 常见问题

### 12.1 线上聊天接口返回 401

原因通常是：

- 当前用户没有在 `/settings` 配置对应 provider 的 API key
- 前端选中了某个 provider，但该 provider 对当前用户来说仍是未连接状态
- OAuth provider 尚未完成授权，或 access token 已失效

优先检查：

- `/settings` 中当前默认 provider 是否已保存 key
- 浏览器本地 provider 配置是否被清空
- 请求头里是否带了正确的 provider key
- 如果是 OAuth provider，检查授权回调和 token exchange 是否成功

### 12.2 上传音频后地址能返回，但过一段时间失效

原因：

- 当前实现把文件写入 `public/media`
- Vercel 运行时文件系统不是持久存储

解决：

- 改成对象存储

### 12.3 YouTube / 媒体下载功能在线上不可用

原因：

- 当前代码依赖 `yt-dlp`
- Vercel 运行环境不能假设存在该二进制

解决：

- 拆到独立后端
- 或改成异步 Worker

### 12.4 Ollama 在线上不可用

原因：

- `OLLAMA_BASE_URL` 指向的是本地服务
- Vercel 上不存在你的本地 Ollama 进程

解决：

- 线上只使用云端模型 provider

## 13. 推荐的下一步改造

如果你希望 EchoType 在 Vercel 上完整支持“媒体导入”相关能力，优先做这三件事：

1. 把 `upload-media` 改成对象存储上传
2. 把 `yt-dlp` 能力迁移到独立 Worker / 后端
3. 给 Supabase 增加生产环境配置与云端数据同步

## 14. 结论

EchoType 当前可以按“主站 + AI API”模式稳定部署到 Vercel，但要明确边界：

- 纯 Next.js 页面、AI Chat、AI 生成、Whisper 转写：适合部署
- 本地二进制下载、持久媒体存储、本地模型服务：不适合按当前实现直接部署

如果你要的是“先把主站和 AI 功能上线”，现在已经足够；如果你要的是“所有导入和工具链功能都在线上可用”，还需要补对象存储和独立媒体处理服务。
