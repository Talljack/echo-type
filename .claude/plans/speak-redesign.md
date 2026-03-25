# Speak 页面重新设计方案

## 问题分析

当前 Speak 页面 (`/speak`) 复用了 `ContentList` 组件，和 Read 页面功能几乎一致——都是选择一段内容然后朗读。但 Speak 的真正定位应该是 **AI 自由对话**（类似 OpenAI 语音模式），而非朗读练习。

现有的 `/speak/[scenarioId]` 对话页面已经具备了完整的 AI 对话能力（语音输入、流式AI回复、TTS播放、翻译），但入口页面（场景选择）和整体体验还需要重新设计。

## 设计目标

1. **Speak = AI 自由对话**，不再是朗读练习
2. 用户可以直接开始对话（无需选场景）
3. AI 推荐场景供选择（降低"不知道聊什么"的门槛）
4. 保持已有的对话引擎（`/speak/[scenarioId]`）基本不变

## 方案：重新设计 Speak 首页

### 新的页面结构

```
/speak                  → 新首页（对话入口 + 场景推荐）
/speak/free             → 自由对话（无场景约束）
/speak/[scenarioId]     → 场景对话（保持现有，小幅优化）
```

### `/speak` 新首页设计

```
┌─────────────────────────────────────────────┐
│  💬 Speak                                    │
│  Practice English through conversation       │
│                                              │
│  ┌─────────────────────────────────────────┐ │
│  │  🎤  Start Free Conversation            │ │
│  │  Chat with AI about anything you like   │ │
│  │              [ Start Talking ]           │ │
│  └─────────────────────────────────────────┘ │
│                                              │
│  💡 Don't know what to talk about?           │
│  Pick a scenario for guided practice:        │
│                                              │
│  [All] [Daily] [Work] [Travel] [Social]      │
│                                              │
│  ┌──────────────┐  ┌──────────────┐         │
│  │ ☕ Ordering   │  │ 🏨 Hotel     │         │
│  │   Coffee     │  │   Check-in   │         │
│  │ beginner     │  │ intermediate │         │
│  └──────────────┘  └──────────────┘         │
│  ┌──────────────┐  ┌──────────────┐         │
│  │ 🍽 Restaurant│  │ ✈️ Airport   │         │
│  │   Ordering   │  │   & Flights  │         │
│  │ intermediate │  │ intermediate │         │
│  └──────────────┘  └──────────────┘         │
│  ...                                         │
│                                              │
│  📝 Recent Conversations                     │
│  (对话历史列表，后续迭代)                      │
└─────────────────────────────────────────────┘
```

### `/speak/free` 自由对话页面

复用现有 `[scenarioId]` 对话页面的核心逻辑，但：
- 不绑定场景 systemPrompt
- 使用通用英语对话 system prompt
- 没有 ScenarioGoals 组件
- 标题显示 "Free Conversation"
- 顶部可添加 AI 建议的话题标签（可选）

## 实现步骤

### Step 1: 创建新的 Speak 首页
- 重写 `src/app/(app)/speak/page.tsx`
- 顶部放一个突出的 "Start Free Conversation" CTA 卡片（点击跳转 `/speak/free`）
- 下方复用 `ScenarioGrid` 组件展示场景列表（已有，点击跳转 `/speak/[scenarioId]`）

### Step 2: 创建自由对话页面 `/speak/free`
- 新建 `src/app/(app)/speak/free/page.tsx`
- 复用 `[scenarioId]/page.tsx` 的核心对话逻辑，抽取为共享 hook 或组件
- 使用通用英语对话 system prompt（不绑定具体场景）
- API 端 `/api/speak` 支持无场景模式（scenario 可选）

### Step 3: 更新 API `/api/speak/route.ts`
- scenario 参数改为可选
- 无场景时使用通用对话 system prompt：
  ```
  You are a friendly English conversation partner. Help the user practice
  speaking English through natural conversation. Be encouraging, correct
  mistakes gently, and keep the conversation flowing naturally.
  ```

### Step 4: 优化对话页面体验
- 在自由对话页面顶部添加可选的话题建议（如 "Travel", "Hobbies", "News" 等小标签）
- 用户点击标签后 AI 会以该话题开始对话（作为首条 assistant message）

### Step 5: 清理旧逻辑
- 移除 Speak 页面对 `ContentList` 的依赖
- 确保 `/speak/book/[bookId]` 路由仍然可用（如果需要保留）或移除

## 技术细节

### 需要修改的文件
1. `src/app/(app)/speak/page.tsx` — 重写首页
2. `src/app/(app)/speak/free/page.tsx` — 新建自由对话页
3. `src/app/api/speak/route.ts` — 支持无场景对话
4. `src/stores/speak-store.ts` — 可能需要添加 "free" 模式支持
5. `src/app/(app)/speak/[scenarioId]/page.tsx` — 小幅重构，抽取共享逻辑

### 不需要修改的
- `ScenarioGrid`, `ScenarioCard`, `ConversationArea`, `MessageBubble`, `VoiceInputButton` — 直接复用
- TTS/语音识别 hooks — 直接复用
- 翻译功能 — 直接复用

## 优先级

1. **P0**: 新首页 + 自由对话页 + API 支持（核心体验）
2. **P1**: 话题建议标签
3. **P2**: 对话历史持久化（存 IndexedDB）
4. **P3**: AI 动态推荐场景
