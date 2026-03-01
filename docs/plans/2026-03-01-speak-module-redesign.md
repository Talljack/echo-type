# Speak 模块重新设计 — 语音对话练习

> 将 Speak 从"朗读+发音检测"重新设计为 **AI 语音对话练习**，让用户通过真实场景对话来练习口语。

---

## 1. 核心变更

| 变更 | 之前 | 之后 |
|------|------|------|
| `/speak` 路由 | 朗读+发音检测（Speak/Read 合并） | 语音对话练习（场景选择 → AI 对话） |
| `/read` 路由 | 不存在 | 原 Speak/Read 功能迁移至此 |
| 侧边栏 | `Speak / Read` (Mic) | `Speak` (MessageCircle) + `Read` (BookOpen) |
| 数据模型 | ContentItem only | 新增 Scenario 模型 |

---

## 2. 设计概念

### Speak 主页 (`/speak`)
- 顶部标题区：标题 + 描述
- 场景卡片网格：内置预设场景 + 用户自定义场景
- 每个场景卡片显示：图标、名称、描述、难度标签、对话目标
- 右上角"创建场景"按钮
- 场景分类标签过滤（日常、工作、旅行、社交等）

### 语音对话页 (`/speak/[scenarioId]`)
布局参考现有 AI Chat Panel，但为全页面体验：

```
┌─────────────────────────────────────┐
│ ← 返回    场景名称    难度标签       │  Header
├─────────────────────────────────────┤
│ 场景目标提示卡片（可折叠）           │  Goals Card
├─────────────────────────────────────┤
│                                     │
│  🤖 AI: Hi! Welcome to the coffee   │  Conversation
│      shop. What can I get for you?  │  Area
│                                     │  (ScrollArea)
│              You: I'd like a latte  │
│              please.           🎤   │
│                                     │
│  🤖 AI: Sure! What size would you   │
│      like?                          │
│                                     │
├─────────────────────────────────────┤
│         [ 🎤 大麦克风按钮 ]          │  Voice Input
│      点击开始说话 / 再次点击停止      │  Area
└─────────────────────────────────────┘
```

**关键交互：**
1. 用户点击麦克风按钮开始录音
2. 录音中显示脉冲动画 + 实时语音转文字（interim results）
3. 用户再次点击停止录音，语音文本发送给 AI
4. AI 回复以文本气泡显示，同时通过 TTS 朗读
5. 循环对话直到场景完成

---

## 3. 数据模型

### Scenario 类型定义

```typescript
// types/scenario.ts
interface Scenario {
  id: string;                    // nanoid
  title: string;                 // "Ordering Coffee"
  titleZh: string;               // "点咖啡"
  description: string;           // 场景描述
  descriptionZh: string;
  icon: string;                  // lucide icon name
  category: ScenarioCategory;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  goals: string[];               // ["Order a drink", "Ask about sizes", "Pay"]
  goalsZh: string[];
  systemPrompt: string;          // AI 角色设定
  openingMessage: string;        // AI 开场白
  source: 'builtin' | 'custom';
  createdAt: number;
  updatedAt: number;
}

type ScenarioCategory = 'daily' | 'work' | 'travel' | 'social' | 'academic' | 'custom';

// 对话消息
interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'recording'; // recording = 正在录音
  content: string;
  timestamp: number;
}

// 对话会话记录
interface ConversationSession {
  id: string;
  scenarioId: string;
  messages: ConversationMessage[];
  startTime: number;
  endTime?: number;
  completed: boolean;
}
```

### 内置预设场景（10个）

| # | 场景 | 分类 | 难度 | AI 角色 |
|---|------|------|------|---------|
| 1 | Ordering Coffee | daily | beginner | 咖啡店店员 |
| 2 | Grocery Shopping | daily | beginner | 超市收银员 |
| 3 | Asking for Directions | travel | beginner | 路人 |
| 4 | Hotel Check-in | travel | intermediate | 酒店前台 |
| 5 | Restaurant Ordering | daily | intermediate | 餐厅服务员 |
| 6 | Job Interview | work | advanced | 面试官 |
| 7 | Doctor's Appointment | daily | intermediate | 医生 |
| 8 | Making Friends | social | beginner | 新朋友 |
| 9 | Presenting Ideas | work | advanced | 同事 |
| 10 | Airport & Flights | travel | intermediate | 机场工作人员 |

---

## 4. 文件结构

```
src/
├── app/(app)/speak/
│   ├── page.tsx                    # 场景选择主页（新）
│   └── [scenarioId]/
│       └── page.tsx                # 语音对话页（新）
├── app/(app)/read/                 # 原 speak 迁移至此
│   ├── page.tsx                    # 原 speak/page.tsx
│   └── [id]/
│       └── page.tsx                # 原 speak/[id]/page.tsx
├── app/api/speak/
│   └── route.ts                    # 场景对话 API（新）
├── components/speak/
│   ├── scenario-card.tsx           # 场景卡片组件（新）
│   ├── scenario-grid.tsx           # 场景网格（新）
│   ├── conversation-area.tsx       # 对话区域（新）
│   ├── voice-input-button.tsx      # 麦克风按钮（新）
│   ├── message-bubble.tsx          # 消息气泡（新）
│   ├── scenario-goals.tsx          # 场景目标卡片（新）
│   ├── create-scenario-dialog.tsx  # 创建场景对话框（新）
│   ├── pronunciation-feedback.tsx  # 保留，移至 read 使用
│   └── speech-stats.tsx            # 保留，移至 read 使用
├── hooks/
│   └── use-voice-recognition.ts    # 语音识别 hook（新）
├── lib/
│   └── scenarios.ts                # 内置场景数据（新）
├── stores/
│   └── speak-store.ts              # Speak 状态管理（新）
└── types/
    └── scenario.ts                 # 场景类型定义（新）
```

---

## 5. API 设计

### `/api/speak/route.ts`

复用现有 AI 基础设施（`resolveModel`, `resolveApiKey`），但使用场景专用 system prompt：

```typescript
// System prompt 模板
const SPEAK_SYSTEM_PROMPT = `You are playing a role in an English conversation practice scenario.

SCENARIO: {scenario.title}
YOUR ROLE: {scenario.systemPrompt}
CONVERSATION GOALS: {scenario.goals.join(', ')}

RULES:
- Stay in character at all times
- Use natural, conversational English appropriate for the difficulty level
- If the student makes grammar mistakes, gently model the correct form in your response
- Keep responses concise (1-3 sentences) to maintain conversation flow
- Guide the conversation toward completing the scenario goals
- When all goals are met, naturally wrap up the conversation`;
```

请求体：
```typescript
{
  messages: ConversationMessage[],
  scenario: { title, systemPrompt, goals, difficulty },
  provider: string,
  modelId: string
}
```

---

## 6. 实现步骤

### Phase 1: 基础迁移
1. 创建 `/read` 路由，迁移原 `/speak` 的朗读功能
2. 更新侧边栏导航：Speak (MessageCircle) + Read (BookOpen)
3. 更新所有内部链接引用

### Phase 2: 场景系统
4. 定义 Scenario 类型和内置场景数据
5. 创建 speak-store (Zustand)
6. 构建场景选择主页 UI（卡片网格 + 分类过滤）

### Phase 3: 语音对话
7. 创建 `use-voice-recognition` hook（封装 Web Speech API）
8. 构建语音对话页面（消息区 + 麦克风按钮）
9. 创建 `/api/speak` 路由
10. 集成 TTS 朗读 AI 回复

### Phase 4: 增强
11. 创建场景对话框（用户自定义场景）
12. 对话历史保存到 Dexie

---

## 7. UI 规范

遵循现有设计系统：
- **风格**: Glassmorphism (`bg-white/90 backdrop-blur-xl`)
- **主色**: Indigo (`#4F46E5`) 用于 AI 消息、按钮
- **强调色**: Green (`#22C55E`) 用于用户消息、录音状态
- **字体**: Poppins (标题) + Open Sans (正文)
- **动画**: Framer Motion, 150-300ms transitions
- **图标**: Lucide React only
- **组件**: shadcn/ui (Card, Button, ScrollArea, Badge, Dialog)

### 麦克风按钮规范
- 尺寸: 64x64px 圆形
- 默认: `bg-indigo-600` + Mic icon
- 录音中: `bg-red-500` + 脉冲动画 (`scale: [1, 1.08, 1]`, 1.5s loop) + MicOff icon
- 禁用: AI 回复中灰色不可点击

### 消息气泡规范
- AI 消息: 左对齐, `bg-indigo-50 text-indigo-900`, Bot avatar
- 用户消息: 右对齐, `bg-green-500 text-white`, 无 avatar
- 录音中消息: 右对齐, `bg-green-100 text-green-700 italic`, 脉冲边框
