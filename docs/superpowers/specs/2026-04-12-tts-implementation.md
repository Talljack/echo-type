# EchoType TTS 实现文档

> **文档类型**: 架构概览  
> **创建日期**: 2026-04-12  
> **目标读者**: 团队开发人员

## 概述

EchoType 的 TTS (Text-to-Speech) 系统采用**多提供商统一接口**的架构设计，支持四种 TTS 提供商，并提供智能降级策略。本文档面向团队开发人员，帮助理解 TTS 架构设计和核心流程，便于后续维护和扩展。

## 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        前端层 (Frontend)                      │
├─────────────────────────────────────────────────────────────┤
│  useTTS Hook (统一接口)                                       │
│  ├─ 语音列表加载                                              │
│  ├─ 语音播放控制 (speak/stop/preview)                        │
│  ├─ 提供商自动切换                                            │
│  └─ 降级策略 (fallback to browser)                           │
├─────────────────────────────────────────────────────────────┤
│  TTS Store (Zustand 状态管理)                                │
│  ├─ 提供商选择 (browser/fish/kokoro/edge)                    │
│  ├─ 语音配置 (voiceURI, speed, pitch, volume)                │
│  └─ API 凭证 (fishApiKey, kokoroServerUrl, etc.)             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      API 路由层 (Next.js)                     │
├─────────────────────────────────────────────────────────────┤
│  /api/tts/fish/voices    → 获取 Fish Audio 语音列表          │
│  /api/tts/fish/speak     → Fish Audio 语音合成               │
│  /api/tts/kokoro/voices  → 获取 Kokoro 语音列表              │
│  /api/tts/kokoro/speak   → Kokoro 语音合成                   │
│  /api/tts/edge/voices    → 获取 Edge TTS 语音列表            │
│  /api/tts/edge/speak     → Edge TTS 语音合成                 │
│  /api/tts/edge/synthesize → Edge TTS 合成 + 词级时间戳       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    第三方服务层 (External)                    │
├─────────────────────────────────────────────────────────────┤
│  Browser Speech API  │  Fish Audio API  │  Kokoro Server    │
│  (本地/云端)          │  (云端)          │  (自建服务器)      │
│                      │                  │                   │
│  Edge TTS API        │                  │                   │
│  (Microsoft 云端)     │                  │                   │
└─────────────────────────────────────────────────────────────┘
```

## 核心组件

### 1. TTS Store (`src/stores/tts-store.ts`)

**职责**: 管理 TTS 全局配置和状态持久化

**核心状态**:
```typescript
{
  voiceSource: 'browser' | 'fish' | 'kokoro' | 'edge',  // 当前选择的提供商
  voiceURI: string,           // 浏览器语音 URI
  speed: number,              // 语速 (0.5 - 2.0)
  pitch: number,              // 音调 (0.5 - 2.0)
  volume: number,             // 音量 (0 - 1)
  fishApiKey: string,         // Fish Audio API 密钥
  fishVoiceId: string,        // Fish Audio 语音 ID
  kokoroServerUrl: string,    // Kokoro 服务器地址
  kokoroVoiceId: string,      // Kokoro 语音 ID
  edgeVoiceId: string,        // Edge TTS 语音 ID
}
```

**持久化**: 所有配置自动保存到 `localStorage`，键名为 `echotype_tts_settings`

### 2. useTTS Hook (`src/hooks/use-tts.ts`)

**职责**: 提供统一的 TTS 操作接口，封装多提供商的复杂性

**核心 API**:
```typescript
const {
  voices,              // 当前提供商的语音列表
  currentVoice,        // 当前选中的语音
  isReady,             // 是否准备就绪
  isSpeaking,          // 是否正在播放
  speak,               // 播放文本
  stop,                // 停止播放
  preview,             // 预览当前语音
  previewVoice,        // 预览指定语音
} = useTTS();
```

**关键功能**:
- 自动加载对应提供商的语音列表
- 智能选择默认语音（优先选择高质量英文语音）
- 统一的播放接口，内部根据提供商类型调用不同实现
- 错误处理和自动降级

### 3. API 路由层 (`src/app/api/tts/`)

**职责**: 服务端代理，隐藏 API 密钥，统一错误处理

**路由结构**:
```
/api/tts/
├── fish/
│   ├── voices/route.ts    # 获取 Fish Audio 语音列表
│   └── speak/route.ts     # Fish Audio 语音合成
├── kokoro/
│   ├── voices/route.ts    # 获取 Kokoro 语音列表
│   └── speak/route.ts     # Kokoro 语音合成
└── edge/
    ├── voices/route.ts    # 获取 Edge TTS 语音列表
    ├── speak/route.ts     # Edge TTS 语音合成
    └── synthesize/route.ts # Edge TTS 合成 + 词级时间戳
```

**通用模式**:
1. 接收前端请求（包含 API 凭证和合成参数）
2. 调用第三方服务 API
3. 返回音频 Blob 或 JSON 数据
4. 统一错误处理，返回友好错误信息

## 数据流详解

### 语音播放流程

```
用户调用 speak(text)
    ↓
useTTS Hook 接收请求
    ↓
resolveTTSSource() 决定使用哪个提供商
    ↓
┌─────────────┬─────────────┬─────────────┬─────────────┐
│   Browser   │    Fish     │   Kokoro    │    Edge     │
└─────────────┴─────────────┴─────────────┴─────────────┘
      ↓              ↓              ↓              ↓
直接调用浏览器   POST 请求到    POST 请求到    POST 请求到
Speech API    /api/tts/fish  /api/tts/kokoro /api/tts/edge
      ↓              ↓              ↓              ↓
立即播放        返回音频 Blob   返回音频 Blob   返回音频 Blob
                    ↓              ↓              ↓
                创建 Audio 对象播放
                    ↓
                更新播放状态 (isSpeaking)
```

### 提供商解析逻辑 (`resolveTTSSource`)

**核心逻辑**:
1. 检查是否需要词级边界事件（Listen 模式需要）
   - 如果需要 → 强制使用 Browser（云端 TTS 不支持实时事件）
2. 检查用户选择的提供商配置是否完整
   - Fish: 需要 API Key + 选择语音
   - Kokoro: 需要服务器 URL + 选择语音
   - Edge: 需要选择语音
3. 如果配置不完整 → 降级到 Browser，并返回原因

**降级原因示例**:
- "Fish Audio is selected but no API key is configured."
- "Kokoro is selected but no server URL is configured."
- "Boundary-based highlighting requires browser speech when Edge TTS is selected."

## 四个 TTS 提供商对比

| 提供商 | 类型 | 优势 | 限制 | 配置要求 | 使用场景 |
|--------|------|------|------|----------|----------|
| **Browser** | 本地/云端混合 | • 免费<br>• 无需配置<br>• 支持词级边界事件 | • 音质一般<br>• 语音选择有限 | 无 | • 默认选项<br>• Listen 模式（需要实时高亮） |
| **Fish Audio** | 云端 | • 音质优秀<br>• 语音丰富<br>• 支持语音克隆 | • 需要 API Key<br>• 按量付费 | API Key + 选择语音 | • 高质量语音需求<br>• 专业场景 |
| **Kokoro** | 自建服务器 | • 可控性强<br>• 支持多语言<br>• 私有化部署 | • 需要自建服务器<br>• 维护成本 | 服务器 URL + 选择语音 | • 私有化部署<br>• 数据安全要求高 |
| **Edge TTS** | 云端 | • 免费<br>• 音质好<br>• 支持词级时间戳 | • 依赖微软服务<br>• 网络要求 | 选择语音 | • 默认推荐<br>• 免费 + 高质量平衡 |

## 关键设计决策

### 1. 为什么使用 Zustand 而不是 Context？

**原因**:
- TTS 配置需要持久化到 `localStorage`
- 多个组件需要共享状态（Listen、Speak、Read、Write、Chat）
- Zustand 提供更简洁的状态管理和自动持久化机制

### 2. 为什么 API 路由在服务端？

**原因**:
- **安全性**: 隐藏 API 密钥（Fish Audio API Key）
- **统一处理**: 统一错误处理和日志记录
- **性能优化**: 支持服务端缓存（Edge TTS 语音列表缓存 1 小时）
- **跨域问题**: 避免浏览器跨域限制

### 3. 为什么需要 `resolveTTSSource()` 函数？

**原因**:
- 用户可能选择了云端 TTS 但没有配置凭证
- Listen 模式需要词级边界事件，必须降级到浏览器 TTS
- 提供清晰的降级原因，提示用户如何修复配置

### 4. 为什么 Edge TTS 有两个合成接口？

**原因**:
- `/api/tts/edge/speak`: 快速播放，只返回音频 Blob
- `/api/tts/edge/synthesize`: 返回音频 + 词级时间戳，用于 ReadAloud 功能的精确高亮

## 扩展指南

### 如何添加新的 TTS 提供商？

假设要添加 Google Cloud TTS：

**步骤 1**: 扩展类型定义
```typescript
// src/stores/tts-store.ts
export type TTSSource = 'browser' | 'fish' | 'kokoro' | 'edge' | 'google';
```

**步骤 2**: 添加状态和配置
```typescript
// src/stores/tts-store.ts
interface TTSSettings {
  // ... 现有字段
  googleApiKey: string;
  googleVoiceId: string;
}
```

**步骤 3**: 创建 API 路由
```typescript
// src/app/api/tts/google/voices/route.ts
// src/app/api/tts/google/speak/route.ts
```

**步骤 4**: 在 useTTS Hook 中添加支持
```typescript
// src/hooks/use-tts.ts
const playGoogleSpeech = useCallback(async (text, voiceId) => {
  // 实现 Google TTS 播放逻辑
}, []);

// 在 speak() 函数中添加分支
if (resolvedPlayback.source === 'google') {
  return await playGoogleSpeech(text, googleVoiceId, overrides);
}
```

**步骤 5**: 更新 `resolveTTSSource()` 逻辑
```typescript
// src/lib/fish-audio-shared.ts
if (requestedSource === 'google') {
  if (!hasGoogleApiKey) {
    return { source: 'browser', reason: 'Google TTS is selected but no API key is configured.' };
  }
  // ...
}
```

**步骤 6**: 更新 UI（设置页面、语音选择器）

## 核心文件清单

| 文件路径 | 职责 |
|---------|------|
| `src/stores/tts-store.ts` | TTS 全局状态管理 |
| `src/hooks/use-tts.ts` | TTS 统一操作接口 |
| `src/lib/fish-audio-shared.ts` | Fish Audio 类型定义 + 提供商解析逻辑 |
| `src/lib/kokoro-shared.ts` | Kokoro 类型定义和工具函数 |
| `src/lib/edge-tts.ts` | Edge TTS 封装（使用 edge-tts-universal） |
| `src/app/api/tts/fish/` | Fish Audio API 路由 |
| `src/app/api/tts/kokoro/` | Kokoro API 路由 |
| `src/app/api/tts/edge/` | Edge TTS API 路由 |
| `src/app/(app)/settings/page.tsx` | TTS 设置 UI |
| `src/components/voice-picker.tsx` | 语音选择器组件 |

## 测试覆盖

| 测试文件 | 覆盖范围 |
|---------|---------|
| `src/__tests__/tts-store.test.ts` | TTS Store 状态管理和持久化 |
| `src/lib/edge-tts.test.ts` | Edge TTS 封装逻辑 |
| `src/app/api/tts/fish/speak/route.test.ts` | Fish Audio 合成 API |
| `src/app/api/tts/kokoro/speak/route.test.ts` | Kokoro 合成 API |
| `src/app/api/tts/edge/synthesize/route.test.ts` | Edge TTS 合成 + 时间戳 API |

## 常见问题

### Q1: 为什么 Listen 模式不能使用云端 TTS？

**A**: Listen 模式需要实时的词级边界事件（word boundary events）来实现逐词高亮。浏览器的 `SpeechSynthesisUtterance` 支持 `onboundary` 事件，但云端 TTS 只能返回完整音频文件，无法提供实时事件流。

**解决方案**: Edge TTS 的 `/api/tts/edge/synthesize` 接口返回词级时间戳，可以配合音频播放实现高亮，但这是预先计算的时间戳，不是实时事件。

### Q2: 如何处理 TTS 播放失败？

**A**: 系统内置自动降级机制：
1. 云端 TTS 失败时，自动降级到浏览器 TTS
2. 降级逻辑在 `useTTS` 的 `speak()` 函数中实现
3. 用户会看到降级后的语音播放，不会完全失败

### Q3: 为什么默认推荐 Edge TTS？

**A**: Edge TTS 是免费 + 高质量的最佳平衡：
- 免费使用，无需 API Key
- 音质接近商业 TTS
- 支持多种英语口音（美式、英式、澳式等）
- 支持词级时间戳（用于 ReadAloud 功能）

### Q4: Fish Audio 和 Kokoro 的区别？

**A**:
- **Fish Audio**: 商业云服务，音质最好，支持语音克隆，按量付费
- **Kokoro**: 开源自建方案，需要自己部署服务器，适合私有化部署

## 性能优化

### 1. 语音列表缓存

- **Browser**: 浏览器自动缓存，通过 `speechSynthesis.getVoices()` 获取
- **Edge TTS**: 服务端缓存 1 小时（`CACHE_TTL_MS = 60 * 60 * 1000`）
- **Fish/Kokoro**: 前端缓存在组件状态中，切换提供商时重新加载

### 2. 音频对象管理

- 使用 `useRef` 管理 `Audio` 对象和 `SpeechSynthesisUtterance`
- 播放新音频前自动清理旧对象（`stop()` 函数）
- 使用 `URL.revokeObjectURL()` 释放 Blob URL 内存

### 3. 请求取消

- 使用 `AbortController` 管理 API 请求
- 用户停止播放或切换语音时，自动取消进行中的请求

## 总结

EchoType 的 TTS 系统通过以下设计实现了灵活性和可靠性：

1. **统一接口**: `useTTS` Hook 封装多提供商复杂性
2. **智能降级**: 自动处理配置缺失和播放失败
3. **状态持久化**: Zustand + localStorage 保存用户配置
4. **服务端代理**: 隐藏 API 密钥，统一错误处理
5. **可扩展性**: 清晰的架构便于添加新提供商

团队成员在维护或扩展 TTS 功能时，建议先理解 `useTTS` Hook 和 `resolveTTSSource()` 的核心逻辑，这是整个系统的关键。
