# EchoType Mobile Native App - 完整设计方案

**日期：** 2026-04-12  
**技术方案：** React Native + Expo  
**目标平台：** iOS 13+ / Android 8.0+

## 一、项目概述

### 1.1 项目目标

将 EchoType Web/Desktop 应用完整移植到移动端原生应用，实现功能完全一致、交互流畅、性能优秀的 iOS 和 Android 应用。

### 1.2 核心要求

- ✅ **功能完整性** - 所有 Web 端功能在移动端完整可用
- ✅ **高可用性** - 离线优先，网络异常时仍可使用核心功能
- ✅ **高交互性** - 符合移动端交互规范，手势流畅，反馈及时
- ✅ **性能优秀** - 启动快速（<3s），操作流畅（60fps），内存占用合理（<200MB）
- ✅ **代码复用** - 最大化复用现有业务逻辑和类型定义

---

## 二、技术栈选型

### 2.1 核心框架

| 技术 | 版本 | 用途 |
|------|------|------|
| React Native | 0.76+ | 跨平台 UI 框架 |
| Expo | SDK 52+ | 开发工具链和原生模块 |
| TypeScript | 5.x | 类型安全 |
| React Navigation | 7.x | 路由导航 |

### 2.2 状态管理

| 技术 | 用途 | 复用性 |
|------|------|--------|
| Zustand | 全局状态管理 | ✅ 可直接复用 18 个 store |
| React Query | 服务端状态缓存 | 🆕 新增（替代部分 useEffect） |

### 2.3 本地存储

| 技术 | 用途 | 说明 |
|------|------|------|
| WatermelonDB | 本地数据库 | 替代 Dexie.js，支持 SQLite |
| AsyncStorage | 简单键值存储 | 用于设置、缓存 |
| Expo SecureStore | 敏感数据加密存储 | API keys, tokens |
| Expo FileSystem | 文件系统访问 | 音频、PDF、导入文件 |

### 2.4 UI 组件库

| 技术 | 用途 |
|------|------|
| React Native Paper | Material Design 组件 |
| React Native Elements | 补充 UI 组件 |
| React Native Reanimated 3 | 高性能动画 |
| React Native Gesture Handler | 手势识别 |
| React Native SVG | 矢量图标 |

### 2.5 音频和语音

| 技术 | 用途 |
|------|------|
| Expo AV | 音频播放 |
| Expo Speech | TTS（系统语音） |
| expo-audio | 录音 |
| @react-native-voice/voice | 语音识别（STT） |

### 2.6 AI 集成

| 技术 | 用途 | 复用性 |
|------|------|--------|
| Vercel AI SDK | AI 提供商统一接口 | ✅ 可直接复用 |
| @ai-sdk/* | 15+ AI 提供商 SDK | ✅ 可直接复用 |

### 2.7 云服务

| 技术 | 用途 | 复用性 |
|------|------|--------|
| Supabase JS Client | 认证 + 云同步 | ✅ 可直接复用 |
| Expo AuthSession | OAuth 流程 | 🆕 新增（替代浏览器 OAuth） |

### 2.8 开发工具

| 技术 | 用途 |
|------|------|
| Expo Go | 开发预览 |
| EAS Build | 云端构建 |
| EAS Submit | 应用商店提交 |
| EAS Update | OTA 热更新 |
| Biome | 代码格式化和 Lint |

---

## 三、架构设计

### 3.1 项目结构

```
echotype-mobile/
├── app/                          # Expo Router 路由（文件系统路由）
│   ├── (tabs)/                   # 底部导航标签页
│   │   ├── dashboard.tsx         # 仪表盘
│   │   ├── listen.tsx            # 听力模块
│   │   ├── speak.tsx             # 口语模块
│   │   ├── read.tsx              # 阅读模块
│   │   ├── write.tsx             # 写作模块
│   │   └── library.tsx           # 内容库
│   ├── (modals)/                 # 模态页面
│   │   ├── settings.tsx          # 设置
│   │   ├── chat.tsx              # AI 助教
│   │   └── review.tsx            # 复习
│   ├── content/[id].tsx          # 内容详情
│   ├── practice/[module]/[id].tsx # 练习页面
│   ├── login.tsx                 # 登录
│   └── _layout.tsx               # 根布局
├── src/
│   ├── components/               # UI 组件
│   │   ├── listen/               # 听力组件
│   │   ├── speak/                # 口语组件
│   │   ├── read/                 # 阅读组件
│   │   ├── write/                # 写作组件
│   │   ├── library/              # 内容库组件
│   │   ├── dashboard/            # 仪表盘组件
│   │   ├── chat/                 # AI 助教组件
│   │   ├── shared/               # 共享组件
│   │   └── ui/                   # 基础 UI 组件
│   ├── stores/                   # Zustand 状态管理（复用 Web 端）
│   │   ├── provider-store.ts
│   │   ├── content-store.ts
│   │   ├── tts-store.ts
│   │   ├── auth-store.ts
│   │   └── ... (18 个 store)
│   ├── database/                 # WatermelonDB 数据库
│   │   ├── schema.ts             # 数据库 schema
│   │   ├── models/               # 数据模型
│   │   │   ├── Content.ts
│   │   │   ├── LearningRecord.ts
│   │   │   ├── TypingSession.ts
│   │   │   └── ...
│   │   └── sync/                 # 云同步逻辑
│   │       ├── engine.ts         # 同步引擎（复用 Web 端逻辑）
│   │       └── mapper.ts         # 数据映射
│   ├── lib/                      # 工具库（大部分复用 Web 端）
│   │   ├── ai/                   # AI 集成
│   │   │   ├── providers.ts      # ✅ 复用
│   │   │   ├── provider-resolver.ts # ✅ 复用
│   │   │   └── provider-capabilities.ts # ✅ 复用
│   │   ├── fsrs.ts               # ✅ 复用 FSRS 算法
│   │   ├── analytics.ts          # ✅ 复用分析逻辑
│   │   ├── tts/                  # TTS 适配层
│   │   │   ├── expo-speech.ts    # 🆕 Expo Speech 适配
│   │   │   ├── edge-tts.ts       # ✅ 复用 Edge TTS
│   │   │   └── fish-audio.ts     # ✅ 复用 Fish Audio
│   │   ├── stt/                  # STT 适配层
│   │   │   ├── native-voice.ts   # 🆕 原生语音识别
│   │   │   └── fallback.ts       # ✅ 复用 AI fallback
│   │   ├── import/               # 内容导入
│   │   │   ├── url.ts            # ✅ 复用 URL 导入
│   │   │   ├── youtube.ts        # ✅ 复用 YouTube 导入
│   │   │   └── pdf.ts            # 🆕 移动端 PDF 处理
│   │   └── i18n/                 # ✅ 复用国际化
│   ├── types/                    # ✅ 完全复用 Web 端类型定义
│   │   ├── content.ts
│   │   ├── chat.ts
│   │   ├── scenario.ts
│   │   └── ...
│   ├── hooks/                    # React Hooks（大部分复用）
│   │   ├── use-tts.ts            # 🔄 适配移动端
│   │   ├── use-voice-recognition.ts # 🔄 适配移动端
│   │   ├── use-typing-reducer.ts # ✅ 复用
│   │   ├── use-translation.ts    # ✅ 复用
│   │   └── ...
│   └── constants/                # 常量配置
│       ├── colors.ts
│       ├── spacing.ts
│       └── typography.ts
├── assets/                       # 静态资源
│   ├── fonts/
│   ├── images/
│   └── sounds/
├── app.json                      # Expo 配置
├── eas.json                      # EAS 构建配置
├── package.json
└── tsconfig.json
```

### 3.2 数据库设计（WatermelonDB）

#### Schema 定义

```typescript
// src/database/schema.ts
import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'contents',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'text', type: 'string' },
        { name: 'type', type: 'string', isIndexed: true },
        { name: 'category', type: 'string', isOptional: true },
        { name: 'tags', type: 'string' }, // JSON array
        { name: 'source', type: 'string', isIndexed: true },
        { name: 'difficulty', type: 'string', isOptional: true },
        { name: 'metadata', type: 'string', isOptional: true }, // JSON
        { name: 'created_at', type: 'number', isIndexed: true },
        { name: 'updated_at', type: 'number', isIndexed: true },
      ],
    }),
    tableSchema({
      name: 'learning_records',
      columns: [
        { name: 'content_id', type: 'string', isIndexed: true },
        { name: 'module', type: 'string', isIndexed: true },
        { name: 'attempts', type: 'number' },
        { name: 'correct_count', type: 'number' },
        { name: 'accuracy', type: 'number' },
        { name: 'wpm', type: 'number', isOptional: true },
        { name: 'last_practiced', type: 'number', isIndexed: true },
        { name: 'next_review', type: 'number', isIndexed: true, isOptional: true },
        { name: 'fsrs_card', type: 'string' }, // JSON
        { name: 'mistakes', type: 'string' }, // JSON array
        { name: 'updated_at', type: 'number', isIndexed: true },
      ],
    }),
    tableSchema({
      name: 'typing_sessions',
      columns: [
        { name: 'content_id', type: 'string', isIndexed: true },
        { name: 'module', type: 'string', isIndexed: true },
        { name: 'start_time', type: 'number', isIndexed: true },
        { name: 'end_time', type: 'number', isOptional: true },
        { name: 'total_chars', type: 'number' },
        { name: 'correct_chars', type: 'number' },
        { name: 'wrong_chars', type: 'number' },
        { name: 'total_words', type: 'number' },
        { name: 'wpm', type: 'number' },
        { name: 'accuracy', type: 'number' },
        { name: 'completed', type: 'boolean', isIndexed: true },
      ],
    }),
    tableSchema({
      name: 'books',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'author', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'chapter_count', type: 'number' },
        { name: 'total_words', type: 'number' },
        { name: 'difficulty', type: 'string' },
        { name: 'tags', type: 'string' }, // JSON array
        { name: 'source', type: 'string' },
        { name: 'cover_emoji', type: 'string' },
        { name: 'metadata', type: 'string', isOptional: true }, // JSON
        { name: 'created_at', type: 'number', isIndexed: true },
        { name: 'updated_at', type: 'number', isIndexed: true },
      ],
    }),
    tableSchema({
      name: 'conversations',
      columns: [
        { name: 'messages', type: 'string' }, // JSON array
        { name: 'created_at', type: 'number', isIndexed: true },
        { name: 'updated_at', type: 'number', isIndexed: true },
      ],
    }),
    tableSchema({
      name: 'favorites',
      columns: [
        { name: 'type', type: 'string', isIndexed: true },
        { name: 'content', type: 'string' }, // JSON
        { name: 'folder_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number', isIndexed: true },
        { name: 'updated_at', type: 'number', isIndexed: true },
      ],
    }),
    tableSchema({
      name: 'favorite_folders',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'color', type: 'string' },
        { name: 'icon', type: 'string' },
        { name: 'created_at', type: 'number', isIndexed: true },
        { name: 'updated_at', type: 'number', isIndexed: true },
      ],
    }),
  ],
});
```


### 3.3 导航结构

#### 底部导航（Tab Navigator）

```
┌─────────────────────────────────────┐
│  Dashboard  Listen  Speak  Read  Write  Library │
└─────────────────────────────────────┘
```

- **Dashboard** - 仪表盘（学习统计、今日计划、最近活动）
- **Listen** - 听力练习列表
- **Speak** - 口语场景列表
- **Read** - 阅读内容列表
- **Write** - 写作练习列表
- **Library** - 内容库（导入、单词本、收藏）

#### 模态页面（Modal）

- **Settings** - 设置（AI 提供商、TTS、语音识别、主题、语言）
- **Chat** - AI 助教（全屏聊天界面）
- **Review** - 今日复习（FSRS 复习队列）

#### 堆栈导航（Stack Navigator）

- **Content Detail** - 内容详情页
- **Practice** - 练习页面（Listen/Speak/Read/Write）
- **Login** - 登录页面

### 3.4 状态管理架构

#### Zustand Store 复用策略

Web 端的 18 个 Zustand store 可以直接复用，只需要适配存储层：

```typescript
// Web 端使用 localStorage
persist(
  (set, get) => ({ ... }),
  { name: 'echotype-provider-store' }
)

// 移动端使用 AsyncStorage
persist(
  (set, get) => ({ ... }),
  {
    name: 'echotype-provider-store',
    storage: createJSONStorage(() => AsyncStorage),
  }
)
```

#### Store 列表（全部复用）

1. `provider-store.ts` - AI 提供商配置
2. `content-store.ts` - 内容管理
3. `tts-store.ts` - TTS 设置
4. `auth-store.ts` - 认证状态
5. `chat-store.ts` - 聊天历史
6. `shortcut-store.ts` - 快捷键（移动端可选）
7. `sync-store.ts` - 云同步状态
8. `appearance-store.ts` - 主题外观
9. `favorite-store.ts` - 收藏管理
10. `daily-plan-store.ts` - 每日计划
11. `language-store.ts` - 界面语言
12. `practice-translation-store.ts` - 练习翻译
13. `pronunciation-store.ts` - 发音设置
14. `shadow-reading-store.ts` - 影子跟读
15. `updater-store.ts` - 更新检查（移动端用 EAS Update）
16. `read-aloud-store.ts` - 朗读设置
17. `assessment-store.ts` - 水平评估
18. `speak-store.ts` - 口语设置

---

## 四、核心功能实现方案

### 4.1 Listen 模块（听力）

#### 功能需求

- ✅ 播放内容音频（TTS 或导入的音频）
- ✅ 逐词高亮显示
- ✅ 播放速度调节（0.5x - 2.0x）
- ✅ 循环播放
- ✅ 进度条拖动
- ✅ 后台播放支持

#### 技术实现

**TTS 优先级：**
1. Edge TTS（免费，质量好）- 通过 API 调用
2. Fish Audio（需要 API key）- 通过 API 调用
3. Expo Speech（系统 TTS）- 本地，离线可用

**音频播放：**
```typescript
import { Audio } from 'expo-av';

// 播放 TTS 生成的音频
const sound = new Audio.Sound();
await sound.loadAsync({ uri: audioUrl });
await sound.playAsync();

// 监听播放进度
sound.setOnPlaybackStatusUpdate((status) => {
  if (status.isLoaded) {
    const progress = status.positionMillis / status.durationMillis;
    // 更新逐词高亮
    updateWordHighlight(progress);
  }
});
```

**逐词高亮：**
- 使用 `word-alignment` 算法（复用 Web 端）
- 根据播放进度计算当前词索引
- 使用 `Text` 组件的 `style` 动态高亮

**后台播放：**
```typescript
import { Audio } from 'expo-av';

// 启用后台播放
await Audio.setAudioModeAsync({
  staysActiveInBackground: true,
  shouldDuckAndroid: true,
  playThroughEarpieceAndroid: false,
});
```

### 4.2 Speak 模块（口语）

#### 功能需求

- ✅ 50+ 场景对话
- ✅ 实时语音识别（STT）
- ✅ 发音评分（音素级别）
- ✅ IPA 音标显示
- ✅ 录音回放
- ✅ 自由对话模式

#### 技术实现

**语音识别（STT）：**
```typescript
import Voice from '@react-native-voice/voice';

// 开始录音识别
Voice.onSpeechResults = (e) => {
  const transcript = e.value[0];
  // 处理识别结果
};

await Voice.start('en-US');
```

**发音评分：**
- 优先使用 SpeechSuper API（需要 API key）
- Fallback 到 AI 提供商（GPT-4/Claude）进行文本对比评分

**录音功能：**
```typescript
import { Audio } from 'expo-av';

const recording = new Audio.Recording();
await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
await recording.startAsync();
// ... 录音中
await recording.stopAndUnloadAsync();
const uri = recording.getURI();
```

### 4.3 Read 模块（阅读）

#### 功能需求

- ✅ 文章阅读
- ✅ 划词翻译
- ✅ 生词收藏
- ✅ 阅读进度追踪
- ✅ 夜间模式

#### 技术实现

**划词翻译：**
```typescript
import * as Clipboard from 'expo-clipboard';

// 长按选中文本
<Text selectable onLongPress={(e) => {
  const selectedText = getSelectedText(e);
  showTranslationPopup(selectedText);
}}>
  {content}
</Text>
```

**翻译 API：**
- 优先使用 AI 提供商翻译（复用 Web 端逻辑）
- Fallback 到免费翻译 API

### 4.4 Write 模块（写作）

#### 功能需求

- ✅ 打字练习
- ✅ WPM 实时计算
- ✅ 错误高亮
- ✅ 准确率统计
- ✅ 错误分析

#### 技术实现

**打字输入：**
```typescript
import { TextInput } from 'react-native';

<TextInput
  multiline
  value={userInput}
  onChangeText={(text) => {
    // 实时对比原文
    const mistakes = compareText(text, originalText);
    setMistakes(mistakes);
    
    // 计算 WPM
    const wpm = calculateWPM(text, startTime);
    setWpm(wpm);
  }}
/>
```

**错误高亮：**
- 使用 `Text` 组件嵌套，对错误字符应用红色样式
- 实时更新，性能优化使用 `React.memo`

### 4.5 Library 模块（内容库）

#### 功能需求

- ✅ URL 导入
- ✅ YouTube 导入
- ✅ PDF 导入
- ✅ 音频导入（转录）
- ✅ 文本导入
- ✅ AI 生成内容
- ✅ 单词本管理
- ✅ 标签管理

#### 技术实现

**URL 导入：**
```typescript
// 复用 Web 端逻辑
import { extractContentFromUrl } from '@/lib/import/url';

const content = await extractContentFromUrl(url);
await database.write(async () => {
  await database.get('contents').create((record) => {
    record.title = content.title;
    record.text = content.text;
    // ...
  });
});
```

**PDF 导入：**
```typescript
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

// 选择 PDF 文件
const result = await DocumentPicker.getDocumentAsync({
  type: 'application/pdf',
});

// 读取文件内容
const base64 = await FileSystem.readAsStringAsync(result.uri, {
  encoding: FileSystem.EncodingType.Base64,
});

// 发送到后端 API 提取文本
const response = await fetch('/api/tools/extract', {
  method: 'POST',
  body: JSON.stringify({ file: base64, type: 'pdf' }),
});
```

**音频导入（转录）：**
```typescript
import * as DocumentPicker from 'expo-document-picker';

// 选择音频文件
const result = await DocumentPicker.getDocumentAsync({
  type: 'audio/*',
});

// 使用 AI 提供商转录（Whisper API）
const transcript = await transcribeAudio(result.uri);
```

### 4.6 Dashboard 模块（仪表盘）

#### 功能需求

- ✅ 学习统计（总内容、总会话、总单词、准确率、WPM）
- ✅ 连续打卡天数
- ✅ 活动热力图（56 天）
- ✅ 复习预测（7 天）
- ✅ 模块练习分布
- ✅ 最近活动
- ✅ 今日计划
- ✅ 今日复习

#### 技术实现

**统计数据计算：**
```typescript
// 复用 Web 端逻辑
import { getActivityHeatmapData, getReviewForecast, getStreakData } from '@/lib/analytics';

const stats = await calculateStats();
const heatmap = await getActivityHeatmapData(56);
const forecast = await getReviewForecast(7);
const streak = await getStreakData();
```

**图表渲染：**
```typescript
import { VictoryChart, VictoryBar, VictoryLine } from 'victory-native';

<VictoryChart>
  <VictoryBar data={heatmapData} />
</VictoryChart>
```

### 4.7 AI Tutor 模块（AI 助教）

#### 功能需求

- ✅ 多轮对话
- ✅ 流式响应
- ✅ 语音输入
- ✅ 内容关联
- ✅ 15+ AI 提供商支持

#### 技术实现

**AI 对话：**
```typescript
// 完全复用 Web 端逻辑
import { streamText } from 'ai';
import { getProviderModel } from '@/lib/ai/provider-resolver';

const { textStream } = await streamText({
  model: getProviderModel(providerId, modelId),
  messages: conversationHistory,
});

for await (const chunk of textStream) {
  appendMessage(chunk);
}
```

**语音输入：**
```typescript
import Voice from '@react-native-voice/voice';

// 语音转文本
Voice.onSpeechResults = (e) => {
  const text = e.value[0];
  sendMessage(text);
};
```

### 4.8 Review 模块（复习）

#### 功能需求

- ✅ FSRS 算法
- ✅ 今日复习队列
- ✅ 复习卡片（Again/Hard/Good/Easy）
- ✅ 复习统计

#### 技术实现

**FSRS 算法：**
```typescript
// 完全复用 Web 端逻辑
import { fsrs, Rating, State } from 'ts-fsrs';

const f = fsrs();
const card = record.fsrsCard;
const now = new Date();

// 用户选择 Good
const scheduling = f.repeat(card, now);
const updatedCard = scheduling[Rating.Good].card;

// 更新数据库
await record.update((r) => {
  r.fsrsCard = updatedCard;
  r.nextReview = updatedCard.due.getTime();
});
```

### 4.9 Settings 模块（设置）

#### 功能需求

- ✅ AI 提供商配置
- ✅ TTS 设置
- ✅ 语音识别设置
- ✅ 主题切换（浅色/深色）
- ✅ 界面语言（中文/英文）
- ✅ 水平评估
- ✅ 数据备份/恢复
- ✅ 关于

#### 技术实现

**主题切换：**
```typescript
import { useColorScheme } from 'react-native';
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from 'react-native-paper';

const colorScheme = useColorScheme();
const theme = colorScheme === 'dark' ? MD3DarkTheme : MD3LightTheme;

<PaperProvider theme={theme}>
  {children}
</PaperProvider>
```

**数据备份：**
```typescript
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// 导出数据库
const dbPath = `${FileSystem.documentDirectory}SQLite/echotype.db`;
const backupPath = `${FileSystem.cacheDirectory}echotype-backup-${Date.now()}.db`;
await FileSystem.copyAsync({ from: dbPath, to: backupPath });
await Sharing.shareAsync(backupPath);
```

### 4.10 Cloud Sync 模块（云同步）

#### 功能需求

- ✅ Supabase 认证（Google/GitHub OAuth）
- ✅ 增量同步（只同步变更数据）
- ✅ 冲突解决（最后写入优先）
- ✅ 离线队列（网络恢复后自动同步）
- ✅ 同步状态指示

#### 技术实现

**OAuth 认证：**
```typescript
import * as AuthSession from 'expo-auth-session';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Google OAuth
const redirectUrl = AuthSession.makeRedirectUri();
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: redirectUrl,
  },
});
```

**增量同步：**
```typescript
// 复用 Web 端同步引擎
import { SyncEngine } from '@/lib/sync/engine';

const syncEngine = new SyncEngine(supabase, userId);

// 拉取远程变更
const lastSyncedAt = await getLastSyncedAt(userId);
const remoteChanges = await supabase
  .from('contents')
  .select('*')
  .gt('updated_at', lastSyncedAt);

// 推送本地变更
const localChanges = await database
  .get('contents')
  .query(Q.where('updated_at', Q.gt(lastSyncedAt)))
  .fetch();

await syncEngine.push(localChanges);
```

**离线队列：**
```typescript
import NetInfo from '@react-native-community/netinfo';

// 监听网络状态
NetInfo.addEventListener((state) => {
  if (state.isConnected && hasPendingSync()) {
    syncEngine.sync();
  }
});
```


---

## 五、UI/UX 设计规范

### 5.1 设计系统

基于 UI/UX Pro Max 推荐的设计系统：

**风格：** Claymorphism（轻量化版本，避免性能问题）

**色彩：**
- Primary: `#4F46E5` (Indigo 600)
- Secondary: `#818CF8` (Indigo 400)
- Accent/CTA: `#16A34A` (Green 600)
- Background: `#EEF2FF` (Indigo 50)
- Foreground: `#312E81` (Indigo 900)
- Error: `#DC2626` (Red 600)

**字体：**
- Heading: Baloo 2 (playful, friendly)
- Body: Comic Neue (readable, educational)

**圆角：**
- Cards: 16dp
- Buttons: 12dp
- Input: 8dp

**阴影：**
```typescript
// 轻量级阴影（避免性能问题）
shadowColor: '#4F46E5',
shadowOffset: { width: 0, height: 2 },
shadowOpacity: 0.1,
shadowRadius: 8,
elevation: 3, // Android
```

### 5.2 移动端交互规范

#### 触摸目标尺寸
- **最小触摸区域：** 44×44pt (iOS) / 48×48dp (Android)
- **按钮间距：** 最小 8dp
- **列表项高度：** 最小 56dp

#### 手势支持
- **下拉刷新** - 内容列表页面
- **左滑删除** - 收藏、历史记录
- **右滑返回** - iOS 标准手势
- **长按菜单** - 内容项（编辑、删除、分享）
- **双击放大** - 阅读页面
- **捏合缩放** - 阅读页面字体大小

#### 反馈机制
- **触摸反馈：** 所有可点击元素 100ms 内提供视觉反馈（透明度变化或背景色变化）
- **震动反馈：** 重要操作（删除、完成练习）提供触觉反馈
- **加载状态：** 超过 300ms 的操作显示加载指示器
- **错误提示：** Toast 消息，3-5 秒自动消失

#### 动画时长
- **微交互：** 150-200ms (按钮点击、切换)
- **页面转场：** 250-300ms (页面切换)
- **复杂动画：** 300-400ms (列表展开、模态弹出)

### 5.3 响应式布局

#### 断点
- **小屏手机：** < 375dp
- **标准手机：** 375-414dp
- **大屏手机：** 414-480dp
- **平板：** > 480dp

#### 布局策略
- **手机竖屏：** 单列布局，底部导航
- **手机横屏：** 双列布局（部分页面），侧边导航
- **平板：** 双列/三列布局，侧边导航 + 底部导航

### 5.4 无障碍支持

- **屏幕阅读器：** 所有交互元素提供 `accessibilityLabel`
- **动态字体：** 支持系统字体大小设置
- **高对比度：** 文本对比度 ≥ 4.5:1
- **减少动画：** 尊重系统 `prefers-reduced-motion` 设置
- **键盘导航：** 外接键盘支持（平板）

---

## 六、性能优化策略

### 6.1 启动性能

**目标：** 冷启动 < 3s，热启动 < 1s

**优化措施：**
1. **代码分割** - 使用 Expo Router 的自动代码分割
2. **懒加载** - 非首屏组件延迟加载
3. **预加载** - 首屏数据在 splash screen 期间加载
4. **资源优化** - 图片使用 WebP 格式，字体子集化

```typescript
// 懒加载示例
const ChatScreen = lazy(() => import('./screens/ChatScreen'));

<Suspense fallback={<LoadingSpinner />}>
  <ChatScreen />
</Suspense>
```

### 6.2 渲染性能

**目标：** 60fps 流畅滚动，无卡顿

**优化措施：**
1. **列表虚拟化** - 使用 `FlashList` 替代 `FlatList`
2. **图片优化** - 使用 `FastImage` 缓存图片
3. **避免过度渲染** - 使用 `React.memo`、`useMemo`、`useCallback`
4. **动画优化** - 使用 `Reanimated` 在 UI 线程执行动画

```typescript
import { FlashList } from '@shopify/flash-list';

<FlashList
  data={contents}
  renderItem={({ item }) => <ContentItem item={item} />}
  estimatedItemSize={80}
  keyExtractor={(item) => item.id}
/>
```

### 6.3 内存管理

**目标：** 内存占用 < 200MB

**优化措施：**
1. **图片压缩** - 缩略图使用低分辨率
2. **音频流式播放** - 不一次性加载整个音频文件
3. **数据库查询优化** - 使用索引，限制查询结果数量
4. **及时释放资源** - 组件卸载时清理定时器、监听器

```typescript
useEffect(() => {
  const subscription = sound.setOnPlaybackStatusUpdate(handleUpdate);
  
  return () => {
    subscription.remove();
    sound.unloadAsync();
  };
}, []);
```

### 6.4 网络优化

**优化措施：**
1. **请求合并** - 批量请求减少网络往返
2. **缓存策略** - 使用 React Query 缓存 API 响应
3. **离线优先** - 优先使用本地数据，后台同步
4. **图片 CDN** - 使用 CDN 加速图片加载

```typescript
import { useQuery } from '@tanstack/react-query';

const { data, isLoading } = useQuery({
  queryKey: ['contents'],
  queryFn: fetchContents,
  staleTime: 5 * 60 * 1000, // 5 分钟内不重新请求
  cacheTime: 30 * 60 * 1000, // 缓存 30 分钟
});
```

### 6.5 包体积优化

**目标：** APK < 50MB，IPA < 60MB

**优化措施：**
1. **按需导入** - 只导入需要的模块
2. **移除未使用代码** - Tree shaking
3. **资源压缩** - 图片、音频压缩
4. **动态加载** - 非核心功能动态下载

---

## 七、开发计划

### 7.1 开发阶段

#### Phase 1: 基础架构（2 周）

**Week 1:**
- ✅ 项目初始化（Expo + TypeScript）
- ✅ 导航结构搭建（Expo Router）
- ✅ 数据库设计（WatermelonDB schema）
- ✅ 状态管理迁移（Zustand stores）
- ✅ UI 组件库集成（React Native Paper）

**Week 2:**
- ✅ 认证流程（Supabase OAuth）
- ✅ 云同步引擎（增量同步）
- ✅ 本地存储适配（AsyncStorage）
- ✅ 主题系统（浅色/深色模式）
- ✅ 国际化（i18n）

#### Phase 2: 核心模块（4 周）

**Week 3: Listen + Read**
- ✅ Listen 页面（内容列表）
- ✅ Listen 播放器（TTS + 逐词高亮）
- ✅ Read 页面（内容列表）
- ✅ Read 阅读器（划词翻译）

**Week 4: Speak + Write**
- ✅ Speak 场景列表
- ✅ Speak 对话界面（语音识别 + 发音评分）
- ✅ Write 页面（内容列表）
- ✅ Write 练习界面（打字 + 错误高亮）

**Week 5: Library + Dashboard**
- ✅ Library 内容列表
- ✅ Library 导入功能（URL/YouTube/PDF/文本）
- ✅ Dashboard 统计卡片
- ✅ Dashboard 图表（热力图、复习预测）

**Week 6: AI Tutor + Review**
- ✅ AI Tutor 聊天界面
- ✅ AI Tutor 语音输入
- ✅ Review 今日复习队列
- ✅ Review FSRS 卡片

#### Phase 3: 高级功能（3 周）

**Week 7: 内容导入增强**
- ✅ 音频导入（转录）
- ✅ PDF 导入优化
- ✅ AI 生成内容
- ✅ 单词本管理

**Week 8: 设置 + 优化**
- ✅ Settings 页面（AI 提供商、TTS、主题）
- ✅ 水平评估
- ✅ 数据备份/恢复
- ✅ 性能优化（列表虚拟化、图片缓存）

**Week 9: 完善 + 测试**
- ✅ 离线模式完善
- ✅ 错误处理
- ✅ 单元测试
- ✅ E2E 测试

#### Phase 4: 发布准备（2 周）

**Week 10: 打磨**
- ✅ UI/UX 细节优化
- ✅ 动画流畅度优化
- ✅ 无障碍支持
- ✅ 多语言测试

**Week 11: 发布**
- ✅ App Store 提交（iOS）
- ✅ Google Play 提交（Android）
- ✅ 应用商店素材（截图、描述）
- ✅ 用户文档

### 7.2 里程碑

| 里程碑 | 时间 | 交付物 |
|--------|------|--------|
| M1: 基础架构完成 | Week 2 | 可运行的空壳应用 + 认证 + 同步 |
| M2: 核心模块完成 | Week 6 | 4 个学习模块 + Dashboard + AI Tutor |
| M3: 功能完整 | Week 9 | 所有功能可用 + 测试通过 |
| M4: 正式发布 | Week 11 | 应用商店上架 |

### 7.3 人力需求

**最小团队配置：**
- **1 名全栈开发** - React Native + TypeScript + Expo
- **1 名 UI/UX 设计师** - 移动端设计规范 + 交互设计
- **1 名测试工程师** - 功能测试 + 性能测试

**理想团队配置：**
- **2 名前端开发** - React Native 开发
- **1 名后端开发** - API 维护 + 云同步优化
- **1 名 UI/UX 设计师**
- **1 名测试工程师**
- **1 名产品经理** - 需求管理 + 进度跟踪

---

## 八、测试策略

### 8.1 单元测试

**工具：** Jest + React Native Testing Library

**覆盖率目标：** 核心业务逻辑 > 80%

**测试重点：**
- Zustand stores
- 工具函数（FSRS、analytics、import）
- 数据库模型
- 同步引擎

```typescript
import { renderHook, act } from '@testing-library/react-hooks';
import { useProviderStore } from '@/stores/provider-store';

test('should add provider config', () => {
  const { result } = renderHook(() => useProviderStore());
  
  act(() => {
    result.current.setProviderConfig('openai', {
      apiKey: 'test-key',
      baseUrl: 'https://api.openai.com',
    });
  });
  
  expect(result.current.getProviderConfig('openai')).toEqual({
    apiKey: 'test-key',
    baseUrl: 'https://api.openai.com',
  });
});
```

### 8.2 集成测试

**工具：** Detox

**测试场景：**
- 用户注册/登录流程
- 内容导入流程
- 学习模块完整流程（Listen/Speak/Read/Write）
- 云同步流程

```typescript
describe('Listen Module', () => {
  it('should play audio and highlight words', async () => {
    await element(by.id('listen-tab')).tap();
    await element(by.id('content-item-0')).tap();
    await element(by.id('play-button')).tap();
    
    await waitFor(element(by.id('word-highlight')))
      .toBeVisible()
      .withTimeout(2000);
  });
});
```

### 8.3 性能测试

**工具：** Flipper + React Native Performance Monitor

**测试指标：**
- 启动时间（冷启动 < 3s）
- 帧率（滚动 > 55fps）
- 内存占用（< 200MB）
- 包体积（APK < 50MB）

### 8.4 兼容性测试

**测试设备：**
- **iOS:** iPhone SE (2020), iPhone 12, iPhone 15 Pro
- **Android:** Samsung Galaxy S21, Pixel 6, Xiaomi 12

**系统版本：**
- **iOS:** 13.0 - 17.0
- **Android:** 8.0 (API 26) - 14.0 (API 34)

---

## 九、部署和发布

### 9.1 构建配置

#### EAS Build 配置

```json
// eas.json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "autoIncrement": true,
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://your-project.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "your-anon-key"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "1234567890",
        "appleTeamId": "ABCDE12345"
      },
      "android": {
        "serviceAccountKeyPath": "./google-play-service-account.json",
        "track": "production"
      }
    }
  }
}
```


#### App 配置

```json
// app.json
{
  "expo": {
    "name": "EchoType",
    "slug": "echotype",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#EEF2FF"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.echotype.app",
      "buildNumber": "1",
      "infoPlist": {
        "NSMicrophoneUsageDescription": "EchoType needs microphone access for speech recognition and pronunciation practice.",
        "NSSpeechRecognitionUsageDescription": "EchoType uses speech recognition to evaluate your pronunciation.",
        "NSCameraUsageDescription": "EchoType needs camera access to scan documents for import."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#EEF2FF"
      },
      "package": "com.echotype.app",
      "versionCode": 1,
      "permissions": [
        "RECORD_AUDIO",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "CAMERA"
      ]
    },
    "plugins": [
      "expo-router",
      [
        "expo-av",
        {
          "microphonePermission": "Allow EchoType to access your microphone for speech recognition."
        }
      ],
      [
        "expo-document-picker",
        {
          "iCloudContainerEnvironment": "Production"
        }
      ]
    ]
  }
}
```

### 9.2 CI/CD 流程

**工具：** GitHub Actions + EAS

```yaml
# .github/workflows/build.yml
name: Build and Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test

  build-ios:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: eas build --platform ios --profile production --non-interactive

  build-android:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: eas build --platform android --profile production --non-interactive
```

### 9.3 应用商店发布

#### App Store（iOS）

**准备材料：**
1. App 图标（1024×1024px）
2. 截图（6.5" iPhone, 5.5" iPhone, 12.9" iPad）
3. 应用描述（中文 + 英文）
4. 关键词
5. 隐私政策 URL
6. 支持 URL

**审核要点：**
- 完整的功能演示
- 隐私权限说明清晰
- 无崩溃和严重 bug
- 符合 App Store 审核指南

#### Google Play（Android）

**准备材料：**
1. 应用图标（512×512px）
2. 功能图片（1024×500px）
3. 截图（手机 + 平板）
4. 应用描述（中文 + 英文）
5. 隐私政策 URL

**审核要点：**
- 目标 API 级别符合要求（API 33+）
- 权限使用说明清晰
- 符合 Google Play 政策

### 9.4 OTA 更新

**工具：** EAS Update

```bash
# 发布更新（不需要重新提交应用商店）
eas update --branch production --message "Fix: 修复听力模块播放bug"
```

**更新策略：**
- **自动更新：** 应用启动时检查更新，后台下载
- **强制更新：** 重大 bug 修复，要求用户立即更新
- **灰度发布：** 先发布给 10% 用户，观察稳定性后全量发布

---

## 十、风险和挑战

### 10.1 技术风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| React Native 性能不足 | 高 | 使用 Reanimated、FlashList 等优化库；关键路径使用原生模块 |
| 音频播放兼容性问题 | 中 | 多设备测试；提供降级方案（系统 TTS） |
| 数据库迁移复杂 | 中 | 详细的迁移脚本；充分测试 |
| 第三方 API 限流 | 低 | 实现请求队列；提供离线模式 |

### 10.2 业务风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 应用商店审核被拒 | 高 | 提前研究审核指南；准备详细说明文档 |
| 用户数据迁移失败 | 高 | 提供数据导出/导入功能；云同步备份 |
| 功能缺失导致用户流失 | 中 | MVP 包含核心功能；快速迭代 |

### 10.3 时间风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 开发进度延期 | 中 | 预留 20% 缓冲时间；优先级排序 |
| 测试时间不足 | 中 | 并行开发和测试；自动化测试 |
| 设计变更频繁 | 低 | 前期确定设计规范；设计评审 |

---

## 十一、成功指标

### 11.1 技术指标

- ✅ 启动时间 < 3s
- ✅ 帧率 > 55fps
- ✅ 内存占用 < 200MB
- ✅ 崩溃率 < 0.5%
- ✅ ANR 率 < 0.1%
- ✅ 包体积 < 50MB (Android) / 60MB (iOS)

### 11.2 功能指标

- ✅ 功能完整性 100%（所有 Web 端功能可用）
- ✅ 离线可用性 > 90%（核心功能离线可用）
- ✅ 云同步成功率 > 99%
- ✅ 测试覆盖率 > 80%

### 11.3 用户指标

- ✅ 应用商店评分 > 4.5
- ✅ 日活跃用户 (DAU) > 1000（发布 3 个月后）
- ✅ 用户留存率（7 天）> 40%
- ✅ 平均会话时长 > 15 分钟

---

## 十二、后续迭代计划

### 12.1 V1.1（发布后 1 个月）

- ✅ 用户反馈收集和 bug 修复
- ✅ 性能优化（基于真实用户数据）
- ✅ 小功能增强（基于用户需求）

### 12.2 V1.2（发布后 3 个月）

- ✅ 社交功能（学习小组、排行榜）
- ✅ 游戏化元素（成就系统、勋章）
- ✅ 更多 TTS 语音选项

### 12.3 V2.0（发布后 6 个月）

- ✅ 平板优化（iPad、Android 平板）
- ✅ Apple Watch / Wear OS 伴侣应用
- ✅ 离线语音识别（本地模型）
- ✅ 更多语言支持（日语、韩语、西班牙语）

---

## 十三、附录

### 13.1 技术选型对比

| 技术 | React Native | Flutter | 原生 |
|------|--------------|---------|------|
| 开发效率 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| 性能 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 代码复用 | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐ |
| 生态成熟度 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 学习成本 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| 维护成本 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |

### 13.2 依赖包清单

```json
{
  "dependencies": {
    "expo": "~52.0.0",
    "expo-router": "~4.0.0",
    "react": "19.0.0",
    "react-native": "0.76.0",
    
    "@nozbe/watermelondb": "^0.27.0",
    "@react-native-async-storage/async-storage": "^2.0.0",
    "expo-secure-store": "~14.0.0",
    
    "zustand": "^5.0.0",
    "@tanstack/react-query": "^5.0.0",
    
    "react-native-paper": "^5.12.0",
    "react-native-elements": "^4.0.0",
    "react-native-reanimated": "~3.16.0",
    "react-native-gesture-handler": "~2.20.0",
    "react-native-svg": "^15.8.0",
    
    "expo-av": "~15.0.0",
    "expo-speech": "~13.0.0",
    "expo-audio": "~1.0.0",
    "@react-native-voice/voice": "^3.2.0",
    
    "ai": "^6.0.0",
    "@ai-sdk/anthropic": "^3.0.0",
    "@ai-sdk/openai": "^3.0.0",
    "@ai-sdk/google": "^3.0.0",
    
    "@supabase/supabase-js": "^2.99.0",
    "expo-auth-session": "~6.0.0",
    
    "expo-document-picker": "~13.0.0",
    "expo-file-system": "~18.0.0",
    "expo-sharing": "~13.0.0",
    
    "@shopify/flash-list": "^1.7.0",
    "react-native-fast-image": "^8.6.0",
    "victory-native": "^37.0.0",
    
    "@react-native-community/netinfo": "^11.0.0",
    "expo-haptics": "~14.0.0",
    "expo-clipboard": "~7.0.0"
  },
  "devDependencies": {
    "@types/react": "~19.0.0",
    "@types/react-native": "~0.76.0",
    "typescript": "^5.3.0",
    
    "@biomejs/biome": "^2.4.4",
    
    "jest": "^29.7.0",
    "@testing-library/react-native": "^12.0.0",
    "@testing-library/react-hooks": "^8.0.0",
    
    "detox": "^20.0.0"
  }
}
```

### 13.3 代码复用清单

#### 完全复用（无需修改）

- ✅ `src/types/*` - 所有类型定义
- ✅ `src/lib/fsrs.ts` - FSRS 算法
- ✅ `src/lib/analytics.ts` - 分析逻辑
- ✅ `src/lib/ai/providers.ts` - AI 提供商定义
- ✅ `src/lib/ai/provider-resolver.ts` - AI 提供商解析
- ✅ `src/lib/ai/provider-capabilities.ts` - AI 能力检测
- ✅ `src/lib/import/url.ts` - URL 导入
- ✅ `src/lib/import/youtube.ts` - YouTube 导入
- ✅ `src/lib/i18n/*` - 国际化
- ✅ `src/lib/sync/mapper.ts` - 数据映射

#### 适配后复用（需要修改）

- 🔄 `src/stores/*` - Zustand stores（适配 AsyncStorage）
- 🔄 `src/lib/sync/engine.ts` - 同步引擎（适配 WatermelonDB）
- 🔄 `src/hooks/use-tts.ts` - TTS hook（适配 Expo AV）
- 🔄 `src/hooks/use-voice-recognition.ts` - 语音识别 hook（适配原生 API）
- 🔄 `src/hooks/use-typing-reducer.ts` - 打字 reducer（适配移动端输入）

#### 需要重写（移动端特有）

- 🆕 `src/database/*` - WatermelonDB 数据库层
- 🆕 `src/components/*` - 所有 UI 组件（React Native 组件）
- 🆕 `app/*` - Expo Router 路由
- 🆕 `src/lib/tts/expo-speech.ts` - Expo Speech 适配
- 🆕 `src/lib/stt/native-voice.ts` - 原生语音识别适配

### 13.4 关键决策记录

#### 为什么选择 WatermelonDB 而不是 Dexie.js？

- Dexie.js 是基于 IndexedDB 的，只能在浏览器环境运行
- WatermelonDB 是专为 React Native 设计的，基于 SQLite
- WatermelonDB 提供更好的性能和离线支持

#### 为什么选择 Expo 而不是纯 React Native？

- Expo 提供完整的开发工具链（EAS Build, EAS Update）
- Expo 提供大量原生模块，减少原生代码编写
- Expo 支持 OTA 更新，快速修复 bug
- Expo 简化了应用商店发布流程

#### 为什么选择 Expo Router 而不是 React Navigation？

- Expo Router 基于文件系统路由，更直观
- Expo Router 自动代码分割，提升性能
- Expo Router 与 Expo 生态深度集成
- 仍然基于 React Navigation，可以使用其所有功能

---

## 十四、总结

本设计方案提供了 EchoType 移动端原生应用的完整技术实现路径，核心优势：

1. **高代码复用率（60-70%）** - 最大化复用现有业务逻辑和类型定义
2. **成熟技术栈** - React Native + Expo 生态完善，社区活跃
3. **开发效率高** - 预计 11 周完成开发和发布
4. **性能优秀** - 通过优化策略确保流畅体验
5. **功能完整** - 所有 Web 端功能在移动端完整可用

**下一步行动：**
1. 用户 review 本设计方案
2. 确认技术选型和开发计划
3. 开始 Phase 1 基础架构开发

---

**文档版本：** 1.0  
**最后更新：** 2026-04-12  
**作者：** Claude (Opus 4.6)

