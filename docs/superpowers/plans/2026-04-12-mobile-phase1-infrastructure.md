# EchoType Mobile - Phase 1: 基础架构实现计划

**日期：** 2026-04-12  
**阶段：** Phase 1 - 基础架构  
**预计工期：** 2 周  
**依赖设计文档：** docs/superpowers/specs/2026-04-12-mobile-native-app-design.md

---

## 一、目标概述

### 1.1 阶段目标

搭建 EchoType 移动端应用的完整基础架构，为后续核心模块开发提供稳定的技术底座。

### 1.2 交付物

- ✅ 可运行的 Expo 项目骨架（iOS + Android）
- ✅ 完整的导航结构（Expo Router）
- ✅ 数据库层（WatermelonDB + Schema）
- ✅ 状态管理层（18 个 Zustand stores 迁移）
- ✅ 认证系统（Supabase Auth）
- ✅ 云同步基础设施
- ✅ UI 设计系统（主题、组件库）
- ✅ 开发工具配置（Biome、TypeScript、EAS）

### 1.3 成功标准

- [ ] 应用可在 iOS 和 Android 模拟器/真机上启动
- [ ] 用户可以完成注册/登录流程
- [ ] 数据库可以正常读写
- [ ] 导航可以在各个空白页面间切换
- [ ] 主题和样式系统正常工作
- [ ] 代码通过 Biome 检查

---

## 二、技术栈清单

### 2.1 核心依赖

\`\`\`json
{
  "dependencies": {
    "expo": "~52.0.0",
    "expo-router": "~4.0.0",
    "react": "18.3.1",
    "react-native": "0.76.5",
    "typescript": "~5.6.2",
    
    "@react-navigation/native": "^7.0.0",
    "@react-navigation/bottom-tabs": "^7.0.0",
    "@react-navigation/native-stack": "^7.0.0",
    
    "zustand": "^5.0.2",
    "@tanstack/react-query": "^5.62.0",
    
    "@nozbe/watermelondb": "^0.27.1",
    "@nozbe/with-observables": "^1.6.0",
    "expo-sqlite": "~15.0.0",
    
    "@supabase/supabase-js": "^2.48.1",
    "expo-auth-session": "~6.0.0",
    "expo-crypto": "~14.0.0",
    "expo-secure-store": "~14.0.0",
    
    "react-native-paper": "^5.12.5",
    "react-native-vector-icons": "^10.2.0",
    "react-native-safe-area-context": "^4.14.0",
    "react-native-screens": "^4.3.0"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.9.4",
    "@types/react": "~18.3.12",
    "@types/react-native": "~0.76.0",
    "jest": "^29.7.0",
    "@testing-library/react-native": "^12.8.1"
  }
}
\`\`\`

---

## 三、详细实施步骤


### Step 1: 项目初始化（Day 1）

#### 1.1 创建 Expo 项目

```bash
# 在 echo-type 仓库根目录下创建移动端子目录
cd /Users/yugangcao/apps/my-apps/echo-type
npx create-expo-app@latest mobile --template tabs

cd mobile
```

#### 1.2 配置 TypeScript

**文件：** `mobile/tsconfig.json`

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./src/*"],
      "@/types": ["./src/types"],
      "@/stores": ["./src/stores"],
      "@/database": ["./src/database"],
      "@/components": ["./src/components"],
      "@/utils": ["./src/utils"],
      "@/hooks": ["./src/hooks"],
      "@/constants": ["./src/constants"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"],
  "exclude": ["node_modules"]
}
```

#### 1.3 配置 Biome

**文件：** `mobile/biome.json`

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "files": {
    "ignoreUnknown": false,
    "ignore": [
      "node_modules",
      ".expo",
      "dist",
      "build",
      "android",
      "ios"
    ]
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingCommas": "es5"
    }
  }
}
```

#### 1.4 配置 app.json

**文件：** `mobile/app.json`

```json
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
      "backgroundColor": "#6366F1"
    },
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.echotype.app",
      "infoPlist": {
        "NSMicrophoneUsageDescription": "EchoType needs microphone access for speech practice.",
        "NSSpeechRecognitionUsageDescription": "EchoType needs speech recognition for pronunciation assessment."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#6366F1"
      },
      "package": "com.echotype.app",
      "permissions": [
        "RECORD_AUDIO",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      "expo-router",
      "expo-secure-store",
      [
        "expo-build-properties",
        {
          "android": {
            "kotlinVersion": "1.9.0"
          },
          "ios": {
            "deploymentTarget": "13.0"
          }
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    },
    "extra": {
      "router": {
        "origin": false
      },
      "eas": {
        "projectId": "YOUR_EAS_PROJECT_ID"
      }
    }
  }
}
```

#### 1.5 安装依赖

```bash
# 核心依赖
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar

# 状态管理
npm install zustand @tanstack/react-query

# 数据库
npm install @nozbe/watermelondb @nozbe/with-observables
npx expo install expo-sqlite

# 认证和云同步
npm install @supabase/supabase-js
npx expo install expo-auth-session expo-crypto expo-secure-store expo-web-browser

# UI 组件
npm install react-native-paper react-native-vector-icons
npx expo install react-native-gesture-handler react-native-reanimated

# 开发工具
npm install -D @biomejs/biome @types/react @types/react-native
```

---

### Step 2: 项目结构搭建（Day 1-2）

#### 2.1 创建目录结构

```bash
cd mobile
mkdir -p src/{components,stores,database,hooks,utils,constants,types,services}
mkdir -p src/components/{ui,layout,features}
mkdir -p src/database/{models,schema}
mkdir -p assets/{fonts,images,sounds}
```

#### 2.2 复制类型定义

从 Web 端复制并适配类型定义：

**文件：** `mobile/src/types/content.ts`

```typescript
// 从 ../src/types/content.ts 复制
// 需要移除 Web 特定的类型（如 File、Blob）
// 保留核心业务类型

export type ContentType = 'article' | 'video' | 'audio' | 'book' | 'conversation';

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export interface Content {
  id: string;
  title: string;
  type: ContentType;
  content: string;
  language: string;
  difficulty: DifficultyLevel;
  tags: string[];
  source?: string;
  sourceUrl?: string;
  coverImage?: string;
  duration?: number;
  wordCount?: number;
  createdAt: number;
  updatedAt: number;
  lastAccessedAt?: number;
  isFavorite: boolean;
  progress: number;
  metadata?: Record<string, any>;
}

export interface LearningRecord {
  id: string;
  contentId: string;
  moduleType: 'listen' | 'speak' | 'read' | 'write';
  startTime: number;
  endTime?: number;
  duration: number;
  accuracy?: number;
  wpm?: number;
  mistakes?: number;
  completedSentences: number;
  totalSentences: number;
  metadata?: Record<string, any>;
}

// ... 其他类型定义
```

**文件：** `mobile/src/types/index.ts`

```typescript
export * from './content';
export * from './user';
export * from './settings';
export * from './review';
```


---

### Step 3: 数据库层实现（Day 2-3）

#### 3.1 WatermelonDB Schema 定义

**文件：** `mobile/src/database/schema/index.ts`

```typescript
import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'contents',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'type', type: 'string' },
        { name: 'content', type: 'string' },
        { name: 'language', type: 'string' },
        { name: 'difficulty', type: 'string' },
        { name: 'tags', type: 'string' }, // JSON string
        { name: 'source', type: 'string', isOptional: true },
        { name: 'source_url', type: 'string', isOptional: true },
        { name: 'cover_image', type: 'string', isOptional: true },
        { name: 'duration', type: 'number', isOptional: true },
        { name: 'word_count', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'last_accessed_at', type: 'number', isOptional: true },
        { name: 'is_favorite', type: 'boolean' },
        { name: 'progress', type: 'number' },
        { name: 'metadata', type: 'string', isOptional: true }, // JSON string
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'is_deleted', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'learning_records',
      columns: [
        { name: 'content_id', type: 'string', isIndexed: true },
        { name: 'module_type', type: 'string' },
        { name: 'start_time', type: 'number' },
        { name: 'end_time', type: 'number', isOptional: true },
        { name: 'duration', type: 'number' },
        { name: 'accuracy', type: 'number', isOptional: true },
        { name: 'wpm', type: 'number', isOptional: true },
        { name: 'mistakes', type: 'number', isOptional: true },
        { name: 'completed_sentences', type: 'number' },
        { name: 'total_sentences', type: 'number' },
        { name: 'metadata', type: 'string', isOptional: true },
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'typing_sessions',
      columns: [
        { name: 'content_id', type: 'string', isIndexed: true },
        { name: 'module_type', type: 'string' },
        { name: 'start_time', type: 'number' },
        { name: 'end_time', type: 'number', isOptional: true },
        { name: 'total_chars', type: 'number' },
        { name: 'correct_chars', type: 'number' },
        { name: 'incorrect_chars', type: 'number' },
        { name: 'accuracy', type: 'number' },
        { name: 'wpm', type: 'number' },
        { name: 'duration', type: 'number' },
        { name: 'keystrokes', type: 'string' }, // JSON string
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'books',
      columns: [
        { name: 'content_id', type: 'string', isIndexed: true },
        { name: 'word', type: 'string', isIndexed: true },
        { name: 'translation', type: 'string', isOptional: true },
        { name: 'context', type: 'string', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'mastery_level', type: 'number' },
        { name: 'review_count', type: 'number' },
        { name: 'last_reviewed_at', type: 'number', isOptional: true },
        { name: 'next_review_at', type: 'number', isOptional: true },
        { name: 'tags', type: 'string' }, // JSON string
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'conversations',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'messages', type: 'string' }, // JSON string
        { name: 'model', type: 'string' },
        { name: 'language', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'synced_at', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'favorites',
      columns: [
        { name: 'content_id', type: 'string', isIndexed: true },
        { name: 'folder_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'favorite_folders',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'color', type: 'string', isOptional: true },
        { name: 'icon', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
});
```

#### 3.2 Model 定义示例

**文件：** `mobile/src/database/models/Content.ts`

```typescript
import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, json } from '@nozbe/watermelondb/decorators';
import type { ContentType, DifficultyLevel } from '@/types';

export class Content extends Model {
  static table = 'contents';

  @field('title') title!: string;
  @field('type') type!: ContentType;
  @field('content') content!: string;
  @field('language') language!: string;
  @field('difficulty') difficulty!: DifficultyLevel;
  @json('tags', (json) => json) tags!: string[];
  @field('source') source?: string;
  @field('source_url') sourceUrl?: string;
  @field('cover_image') coverImage?: string;
  @field('duration') duration?: number;
  @field('word_count') wordCount?: number;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @date('last_accessed_at') lastAccessedAt?: Date;
  @field('is_favorite') isFavorite!: boolean;
  @field('progress') progress!: number;
  @json('metadata', (json) => json) metadata?: Record<string, any>;
  @date('synced_at') syncedAt?: Date;
  @field('is_deleted') isDeleted!: boolean;
}
```

**文件：** `mobile/src/database/models/index.ts`

```typescript
export { Content } from './Content';
export { LearningRecord } from './LearningRecord';
export { TypingSession } from './TypingSession';
export { Book } from './Book';
export { Conversation } from './Conversation';
export { Favorite } from './Favorite';
export { FavoriteFolder } from './FavoriteFolder';
```

#### 3.3 数据库初始化

**文件：** `mobile/src/database/index.ts`

```typescript
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import * as models from './models';

const adapter = new SQLiteAdapter({
  schema,
  dbName: 'echotype',
  jsi: true, // 启用 JSI（性能优化）
  onSetUpError: (error) => {
    console.error('Database setup error:', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: Object.values(models),
});

export * from './models';
export { schema };
```


---

### Step 4: 状态管理迁移（Day 3-4）

#### 4.1 Zustand Store 适配策略

从 Web 端复制 18 个 Zustand stores，并进行移动端适配：

**需要适配的 stores：**
1. `useAuthStore` - 移除 Web 特定的 localStorage 持久化
2. `useContentStore` - 替换 Dexie 为 WatermelonDB
3. `useListenStore` - 适配移动端音频播放
4. `useSpeakStore` - 适配移动端语音识别
5. `useReadStore` - 适配移动端手势交互
6. `useWriteStore` - 适配移动端键盘
7. `useLibraryStore` - 替换数据库查询
8. `useDashboardStore` - 适配移动端图表库
9. `useReviewStore` - 保持 FSRS 算法不变
10. `useAITutorStore` - 适配移动端 AI SDK
11. `useSettingsStore` - 使用 expo-secure-store
12. `useUIStore` - 适配移动端导航
13. `useKeyboardStore` - 移除（移动端不需要）
14. `useTranslationStore` - 保持不变
15. `useTTSStore` - 适配移动端 TTS
16. `useSTTStore` - 适配移动端 STT
17. `useSyncStore` - 保持 Supabase 逻辑
18. `useImportStore` - 适配移动端文件系统

#### 4.2 Store 适配示例

**文件：** `mobile/src/stores/useContentStore.ts`

```typescript
import { create } from 'zustand';
import { database, Content as ContentModel } from '@/database';
import type { Content } from '@/types';
import { Q } from '@nozbe/watermelondb';

interface ContentStore {
  contents: Content[];
  selectedContent: Content | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchContents: () => Promise<void>;
  getContentById: (id: string) => Promise<Content | null>;
  createContent: (content: Omit<Content, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Content>;
  updateContent: (id: string, updates: Partial<Content>) => Promise<void>;
  deleteContent: (id: string) => Promise<void>;
  setSelectedContent: (content: Content | null) => void;
}

export const useContentStore = create<ContentStore>((set, get) => ({
  contents: [],
  selectedContent: null,
  isLoading: false,
  error: null,

  fetchContents: async () => {
    set({ isLoading: true, error: null });
    try {
      const contentsCollection = database.get<ContentModel>('contents');
      const records = await contentsCollection
        .query(Q.where('is_deleted', false), Q.sortBy('updated_at', Q.desc))
        .fetch();
      
      const contents = records.map((record) => ({
        id: record.id,
        title: record.title,
        type: record.type,
        content: record.content,
        language: record.language,
        difficulty: record.difficulty,
        tags: record.tags,
        source: record.source,
        sourceUrl: record.sourceUrl,
        coverImage: record.coverImage,
        duration: record.duration,
        wordCount: record.wordCount,
        createdAt: record.createdAt.getTime(),
        updatedAt: record.updatedAt.getTime(),
        lastAccessedAt: record.lastAccessedAt?.getTime(),
        isFavorite: record.isFavorite,
        progress: record.progress,
        metadata: record.metadata,
      }));
      
      set({ contents, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  getContentById: async (id: string) => {
    try {
      const contentsCollection = database.get<ContentModel>('contents');
      const record = await contentsCollection.find(id);
      
      return {
        id: record.id,
        title: record.title,
        type: record.type,
        content: record.content,
        language: record.language,
        difficulty: record.difficulty,
        tags: record.tags,
        source: record.source,
        sourceUrl: record.sourceUrl,
        coverImage: record.coverImage,
        duration: record.duration,
        wordCount: record.wordCount,
        createdAt: record.createdAt.getTime(),
        updatedAt: record.updatedAt.getTime(),
        lastAccessedAt: record.lastAccessedAt?.getTime(),
        isFavorite: record.isFavorite,
        progress: record.progress,
        metadata: record.metadata,
      };
    } catch (error) {
      console.error('Failed to get content:', error);
      return null;
    }
  },

  createContent: async (contentData) => {
    try {
      const newRecord = await database.write(async () => {
        const contentsCollection = database.get<ContentModel>('contents');
        return await contentsCollection.create((record) => {
          record.title = contentData.title;
          record.type = contentData.type;
          record.content = contentData.content;
          record.language = contentData.language;
          record.difficulty = contentData.difficulty;
          record.tags = contentData.tags;
          record.source = contentData.source;
          record.sourceUrl = contentData.sourceUrl;
          record.coverImage = contentData.coverImage;
          record.duration = contentData.duration;
          record.wordCount = contentData.wordCount;
          record.isFavorite = contentData.isFavorite;
          record.progress = contentData.progress;
          record.metadata = contentData.metadata;
          record.isDeleted = false;
        });
      });

      const newContent = {
        id: newRecord.id,
        ...contentData,
        createdAt: newRecord.createdAt.getTime(),
        updatedAt: newRecord.updatedAt.getTime(),
      };

      set((state) => ({ contents: [newContent, ...state.contents] }));
      return newContent;
    } catch (error) {
      throw new Error(`Failed to create content: ${(error as Error).message}`);
    }
  },

  updateContent: async (id, updates) => {
    try {
      await database.write(async () => {
        const contentsCollection = database.get<ContentModel>('contents');
        const record = await contentsCollection.find(id);
        await record.update((r) => {
          if (updates.title !== undefined) r.title = updates.title;
          if (updates.content !== undefined) r.content = updates.content;
          if (updates.tags !== undefined) r.tags = updates.tags;
          if (updates.isFavorite !== undefined) r.isFavorite = updates.isFavorite;
          if (updates.progress !== undefined) r.progress = updates.progress;
          // ... 其他字段
        });
      });

      set((state) => ({
        contents: state.contents.map((c) =>
          c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c
        ),
      }));
    } catch (error) {
      throw new Error(`Failed to update content: ${(error as Error).message}`);
    }
  },

  deleteContent: async (id) => {
    try {
      await database.write(async () => {
        const contentsCollection = database.get<ContentModel>('contents');
        const record = await contentsCollection.find(id);
        await record.update((r) => {
          r.isDeleted = true;
        });
      });

      set((state) => ({
        contents: state.contents.filter((c) => c.id !== id),
      }));
    } catch (error) {
      throw new Error(`Failed to delete content: ${(error as Error).message}`);
    }
  },

  setSelectedContent: (content) => set({ selectedContent: content }),
}));
```

#### 4.3 持久化配置

**文件：** `mobile/src/stores/useSettingsStore.ts`

```typescript
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { Settings } from '@/types';

const SETTINGS_KEY = 'echotype_settings';

interface SettingsStore {
  settings: Settings;
  isLoading: boolean;
  
  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<Settings>) => Promise<void>;
  resetSettings: () => Promise<void>;
}

const defaultSettings: Settings = {
  language: 'en',
  theme: 'system',
  fontSize: 16,
  ttsProvider: 'edge',
  ttsVoice: 'en-US-AriaNeural',
  ttsSpeed: 1.0,
  sttProvider: 'whisper',
  translationProvider: 'google',
  // ... 其他默认设置
};

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: defaultSettings,
  isLoading: false,

  loadSettings: async () => {
    set({ isLoading: true });
    try {
      const stored = await SecureStore.getItemAsync(SETTINGS_KEY);
      if (stored) {
        const settings = JSON.parse(stored);
        set({ settings, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      set({ isLoading: false });
    }
  },

  updateSettings: async (updates) => {
    const newSettings = { ...get().settings, ...updates };
    try {
      await SecureStore.setItemAsync(SETTINGS_KEY, JSON.stringify(newSettings));
      set({ settings: newSettings });
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  },

  resetSettings: async () => {
    try {
      await SecureStore.deleteItemAsync(SETTINGS_KEY);
      set({ settings: defaultSettings });
    } catch (error) {
      console.error('Failed to reset settings:', error);
      throw error;
    }
  },
}));
```


---

### Step 5: 导航结构实现（Day 4-5）

#### 5.1 Expo Router 配置

**文件：** `mobile/app/_layout.tsx`

```typescript
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { PaperProvider } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { theme } from '@/constants/theme';

export default function RootLayout() {
  const { loadUser } = useAuthStore();
  const { loadSettings } = useSettingsStore();

  useEffect(() => {
    loadUser();
    loadSettings();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={theme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}
```

#### 5.2 认证路由

**文件：** `mobile/app/(auth)/_layout.tsx`

```typescript
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
```

**文件：** `mobile/app/(auth)/login.tsx`

```typescript
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      setError('');
      await signIn(email, password);
      router.replace('/(tabs)');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to EchoType</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      {error ? <Text style={styles.error}>{error}</Text> : null}
      
      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Signing in...' : 'Sign In'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
        <Text style={styles.link}>Don't have an account? Sign up</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 40,
    textAlign: 'center',
    color: '#6366F1',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    height: 50,
    backgroundColor: '#6366F1',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: '#EF4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  link: {
    color: '#6366F1',
    textAlign: 'center',
    marginTop: 16,
  },
});
```

#### 5.3 Tab 导航

**文件：** `mobile/app/(tabs)/_layout.tsx`

```typescript
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#6366F1',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="library-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="practice"
        options={{
          title: 'Practice',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="play-circle-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="review"
        options={{
          title: 'Review',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="repeat-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

#### 5.4 模块路由

**文件：** `mobile/app/(tabs)/practice/_layout.tsx`

```typescript
import { Stack } from 'expo-router';

export default function PracticeLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ title: 'Practice Modules' }}
      />
      <Stack.Screen
        name="listen/[id]"
        options={{ title: 'Listen Practice' }}
      />
      <Stack.Screen
        name="speak/[id]"
        options={{ title: 'Speak Practice' }}
      />
      <Stack.Screen
        name="read/[id]"
        options={{ title: 'Read Practice' }}
      />
      <Stack.Screen
        name="write/[id]"
        options={{ title: 'Write Practice' }}
      />
    </Stack>
  );
}
```


---

### Step 6: 认证系统实现（Day 5-6）

#### 6.1 Supabase 客户端配置

**文件：** `mobile/src/services/supabase.ts`

```typescript
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import * as AuthSession from 'expo-auth-session';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// SecureStore adapter for Supabase Auth
const SecureStoreAdapter = {
  getItem: async (key: string) => {
    return await SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string) => {
    await SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

#### 6.2 认证 Store

**文件：** `mobile/src/stores/useAuthStore.ts`

```typescript
import { create } from 'zustand';
import { supabase } from '@/services/supabase';
import type { User, Session } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

interface AuthStore {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadUser: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithOAuth: (provider: 'google' | 'github') => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  session: null,
  isLoading: false,
  error: null,

  loadUser: async () => {
    set({ isLoading: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      set({ session, user: session?.user ?? null, isLoading: false });

      // Listen to auth changes
      supabase.auth.onAuthStateChange((_event, session) => {
        set({ session, user: session?.user ?? null });
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      set({ session: data.session, user: data.user, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  signUp: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      set({ session: data.session, user: data.user, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  signInWithOAuth: async (provider) => {
    set({ isLoading: true, error: null });
    try {
      const redirectUrl = AuthSession.makeRedirectUri({
        scheme: 'echotype',
        path: 'auth/callback',
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl
      );

      if (result.type === 'success') {
        const { url } = result;
        const params = new URLSearchParams(url.split('#')[1]);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          const { data: sessionData, error: sessionError } =
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

          if (sessionError) throw sessionError;
          set({
            session: sessionData.session,
            user: sessionData.user,
            isLoading: false,
          });
        }
      } else {
        throw new Error('OAuth authentication cancelled');
      }
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  signOut: async () => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({ session: null, user: null, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  resetPassword: async (email) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'echotype://auth/reset-password',
      });
      if (error) throw error;
      set({ isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },
}));
```

#### 6.3 认证守卫

**文件：** `mobile/src/components/AuthGuard.tsx`

```typescript
import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { View, ActivityIndicator } from 'react-native';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Redirect to tabs if authenticated
      router.replace('/(tabs)');
    }
  }, [user, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return <>{children}</>;
}
```


---

### Step 7: UI 设计系统（Day 6-7）

#### 7.1 主题配置

**文件：** `mobile/src/constants/theme.ts`

```typescript
import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6366F1', // Indigo 500
    primaryContainer: '#E0E7FF', // Indigo 100
    secondary: '#EC4899', // Pink 500
    secondaryContainer: '#FCE7F3', // Pink 100
    tertiary: '#8B5CF6', // Violet 500
    tertiaryContainer: '#EDE9FE', // Violet 100
    surface: '#FFFFFF',
    surfaceVariant: '#F3F4F6', // Gray 100
    background: '#F9FAFB', // Gray 50
    error: '#EF4444', // Red 500
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onSurface: '#111827', // Gray 900
    onBackground: '#111827',
    outline: '#D1D5DB', // Gray 300
  },
  roundness: 12,
  fonts: {
    ...MD3LightTheme.fonts,
    displayLarge: {
      fontFamily: 'Baloo2-Bold',
      fontSize: 57,
      fontWeight: '700',
      letterSpacing: 0,
      lineHeight: 64,
    },
    headlineMedium: {
      fontFamily: 'Baloo2-SemiBold',
      fontSize: 28,
      fontWeight: '600',
      letterSpacing: 0,
      lineHeight: 36,
    },
    bodyLarge: {
      fontFamily: 'ComicNeue-Regular',
      fontSize: 16,
      fontWeight: '400',
      letterSpacing: 0.5,
      lineHeight: 24,
    },
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#818CF8', // Indigo 400
    primaryContainer: '#4338CA', // Indigo 700
    secondary: '#F472B6', // Pink 400
    secondaryContainer: '#BE185D', // Pink 700
    tertiary: '#A78BFA', // Violet 400
    tertiaryContainer: '#6D28D9', // Violet 700
    surface: '#1F2937', // Gray 800
    surfaceVariant: '#374151', // Gray 700
    background: '#111827', // Gray 900
    error: '#F87171', // Red 400
    onPrimary: '#1E1B4B', // Indigo 950
    onSecondary: '#831843', // Pink 900
    onSurface: '#F9FAFB', // Gray 50
    onBackground: '#F9FAFB',
    outline: '#6B7280', // Gray 500
  },
  roundness: 12,
  fonts: lightTheme.fonts,
};

export const theme = lightTheme; // Default theme
```

#### 7.2 通用组件 - Button

**文件：** `mobile/src/components/ui/Button.tsx`

```typescript
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from 'react-native-paper';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
}: ButtonProps) {
  const theme = useTheme();

  const getButtonStyle = () => {
    const baseStyle = [styles.button, styles[size]];
    
    if (fullWidth) baseStyle.push(styles.fullWidth);
    if (disabled) baseStyle.push(styles.disabled);

    switch (variant) {
      case 'primary':
        return [...baseStyle, { backgroundColor: theme.colors.primary }];
      case 'secondary':
        return [...baseStyle, { backgroundColor: theme.colors.secondary }];
      case 'outline':
        return [
          ...baseStyle,
          {
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderColor: theme.colors.primary,
          },
        ];
      case 'ghost':
        return [...baseStyle, { backgroundColor: 'transparent' }];
      default:
        return baseStyle;
    }
  };

  const getTextStyle = () => {
    const baseStyle = [styles.text, styles[`${size}Text`]];

    switch (variant) {
      case 'primary':
      case 'secondary':
        return [...baseStyle, { color: theme.colors.onPrimary }];
      case 'outline':
      case 'ghost':
        return [...baseStyle, { color: theme.colors.primary }];
      default:
        return baseStyle;
    }
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : theme.colors.primary} />
      ) : (
        <Text style={getTextStyle()}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  small: {
    height: 36,
    paddingHorizontal: 16,
  },
  medium: {
    height: 44,
    paddingHorizontal: 24,
  },
  large: {
    height: 52,
    paddingHorizontal: 32,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: '600',
  },
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },
});
```

#### 7.3 通用组件 - Card

**文件：** `mobile/src/components/ui/Card.tsx`

```typescript
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from 'react-native-paper';
import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: number;
}

export function Card({
  children,
  onPress,
  variant = 'elevated',
  padding = 16,
}: CardProps) {
  const theme = useTheme();

  const getCardStyle = () => {
    const baseStyle = [styles.card, { padding }];

    switch (variant) {
      case 'elevated':
        return [
          ...baseStyle,
          {
            backgroundColor: theme.colors.surface,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
          },
        ];
      case 'outlined':
        return [
          ...baseStyle,
          {
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.outline,
          },
        ];
      case 'filled':
        return [
          ...baseStyle,
          {
            backgroundColor: theme.colors.surfaceVariant,
          },
        ];
      default:
        return baseStyle;
    }
  };

  if (onPress) {
    return (
      <TouchableOpacity
        style={getCardStyle()}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={getCardStyle()}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginBottom: 12,
  },
});
```

#### 7.4 布局组件

**文件：** `mobile/src/components/layout/Screen.tsx`

```typescript
import { View, ScrollView, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from 'react-native-paper';
import type { ReactNode } from 'react';

interface ScreenProps {
  children: ReactNode;
  scrollable?: boolean;
  padding?: number;
  backgroundColor?: string;
}

export function Screen({
  children,
  scrollable = false,
  padding = 16,
  backgroundColor,
}: ScreenProps) {
  const theme = useTheme();
  const bgColor = backgroundColor || theme.colors.background;

  const content = (
    <View style={[styles.content, { padding }]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar barStyle="dark-content" backgroundColor={bgColor} />
      {scrollable ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
  },
});
```


---

### Step 8: 云同步基础设施（Day 7-8）

#### 8.1 同步服务

**文件：** `mobile/src/services/SyncService.ts`

```typescript
import { database } from '@/database';
import { supabase } from './supabase';
import { Q } from '@nozbe/watermelondb';
import type { Content as ContentModel } from '@/database/models';

export class SyncService {
  private syncInProgress = false;
  private lastSyncTime: number | null = null;

  async syncAll(): Promise<void> {
    if (this.syncInProgress) {
      console.log('Sync already in progress');
      return;
    }

    this.syncInProgress = true;
    try {
      await this.syncContents();
      await this.syncLearningRecords();
      await this.syncTypingSessions();
      await this.syncBooks();
      await this.syncConversations();
      
      this.lastSyncTime = Date.now();
      console.log('Sync completed successfully');
    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  private async syncContents(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Pull from Supabase
    const { data: remoteContents, error: fetchError } = await supabase
      .from('contents')
      .select('*')
      .eq('user_id', user.id)
      .gt('updated_at', this.lastSyncTime || 0);

    if (fetchError) throw fetchError;

    // Update local database
    await database.write(async () => {
      const contentsCollection = database.get<ContentModel>('contents');
      
      for (const remoteContent of remoteContents || []) {
        try {
          const localContent = await contentsCollection.find(remoteContent.id);
          
          // Update if remote is newer
          if (new Date(remoteContent.updated_at).getTime() > localContent.updatedAt.getTime()) {
            await localContent.update((record) => {
              record.title = remoteContent.title;
              record.content = remoteContent.content;
              record.tags = remoteContent.tags;
              record.isFavorite = remoteContent.is_favorite;
              record.progress = remoteContent.progress;
              // ... other fields
              record.syncedAt = new Date();
            });
          }
        } catch {
          // Create if doesn't exist locally
          await contentsCollection.create((record) => {
            record._raw.id = remoteContent.id;
            record.title = remoteContent.title;
            record.type = remoteContent.type;
            record.content = remoteContent.content;
            record.language = remoteContent.language;
            record.difficulty = remoteContent.difficulty;
            record.tags = remoteContent.tags;
            record.isFavorite = remoteContent.is_favorite;
            record.progress = remoteContent.progress;
            record.isDeleted = false;
            record.syncedAt = new Date();
          });
        }
      }
    });

    // Push to Supabase
    const unsyncedContents = await database
      .get<ContentModel>('contents')
      .query(
        Q.or(
          Q.where('synced_at', Q.eq(null)),
          Q.where('updated_at', Q.gt(Q.column('synced_at')))
        )
      )
      .fetch();

    for (const content of unsyncedContents) {
      const { error: upsertError } = await supabase
        .from('contents')
        .upsert({
          id: content.id,
          user_id: user.id,
          title: content.title,
          type: content.type,
          content: content.content,
          language: content.language,
          difficulty: content.difficulty,
          tags: content.tags,
          source: content.source,
          source_url: content.sourceUrl,
          cover_image: content.coverImage,
          duration: content.duration,
          word_count: content.wordCount,
          is_favorite: content.isFavorite,
          progress: content.progress,
          metadata: content.metadata,
          is_deleted: content.isDeleted,
          created_at: content.createdAt.toISOString(),
          updated_at: content.updatedAt.toISOString(),
        });

      if (upsertError) {
        console.error('Failed to sync content:', upsertError);
        continue;
      }

      // Mark as synced
      await database.write(async () => {
        await content.update((record) => {
          record.syncedAt = new Date();
        });
      });
    }
  }

  private async syncLearningRecords(): Promise<void> {
    // Similar implementation to syncContents
    // Pull from Supabase, update local, push unsynced
  }

  private async syncTypingSessions(): Promise<void> {
    // Similar implementation
  }

  private async syncBooks(): Promise<void> {
    // Similar implementation
  }

  private async syncConversations(): Promise<void> {
    // Similar implementation
  }

  getLastSyncTime(): number | null {
    return this.lastSyncTime;
  }

  isSyncing(): boolean {
    return this.syncInProgress;
  }
}

export const syncService = new SyncService();
```

#### 8.2 同步 Store

**文件：** `mobile/src/stores/useSyncStore.ts`

```typescript
import { create } from 'zustand';
import { syncService } from '@/services/SyncService';

interface SyncStore {
  isSyncing: boolean;
  lastSyncTime: number | null;
  error: string | null;
  autoSyncEnabled: boolean;

  // Actions
  sync: () => Promise<void>;
  setAutoSync: (enabled: boolean) => void;
  getLastSyncTime: () => number | null;
}

export const useSyncStore = create<SyncStore>((set, get) => ({
  isSyncing: false,
  lastSyncTime: null,
  error: null,
  autoSyncEnabled: true,

  sync: async () => {
    set({ isSyncing: true, error: null });
    try {
      await syncService.syncAll();
      set({
        isSyncing: false,
        lastSyncTime: syncService.getLastSyncTime(),
      });
    } catch (error) {
      set({
        isSyncing: false,
        error: (error as Error).message,
      });
      throw error;
    }
  },

  setAutoSync: (enabled) => {
    set({ autoSyncEnabled: enabled });
  },

  getLastSyncTime: () => {
    return syncService.getLastSyncTime();
  },
}));
```

#### 8.3 自动同步 Hook

**文件：** `mobile/src/hooks/useAutoSync.ts`

```typescript
import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useSyncStore } from '@/stores/useSyncStore';
import { useAuthStore } from '@/stores/useAuthStore';

export function useAutoSync() {
  const { sync, autoSyncEnabled } = useSyncStore();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user || !autoSyncEnabled) return;

    // Sync on mount
    sync();

    // Sync when app comes to foreground
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
          sync();
        }
      }
    );

    // Sync every 5 minutes
    const interval = setInterval(() => {
      sync();
    }, 5 * 60 * 1000);

    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, [user, autoSyncEnabled, sync]);
}
```


---

### Step 9: 开发工具配置（Day 8-9）

#### 9.1 EAS Build 配置

**文件：** `mobile/eas.json`

```json
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
      },
      "android": {
        "buildType": "apk"
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      },
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "ios": {
        "simulator": false
      },
      "android": {
        "buildType": "aab"
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
        "serviceAccountKeyPath": "./service-account-key.json",
        "track": "internal"
      }
    }
  }
}
```

#### 9.2 环境变量配置

**文件：** `mobile/.env.example`

```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# API Keys (optional)
EXPO_PUBLIC_OPENAI_API_KEY=
EXPO_PUBLIC_GOOGLE_CLOUD_API_KEY=
EXPO_PUBLIC_FISH_AUDIO_API_KEY=

# Feature Flags
EXPO_PUBLIC_ENABLE_ANALYTICS=false
EXPO_PUBLIC_ENABLE_CRASH_REPORTING=false
```

**文件：** `mobile/.env.development`

```bash
EXPO_PUBLIC_SUPABASE_URL=https://dev-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=dev-anon-key
EXPO_PUBLIC_ENABLE_ANALYTICS=false
EXPO_PUBLIC_ENABLE_CRASH_REPORTING=false
```

**文件：** `mobile/.env.production`

```bash
EXPO_PUBLIC_SUPABASE_URL=https://prod-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=prod-anon-key
EXPO_PUBLIC_ENABLE_ANALYTICS=true
EXPO_PUBLIC_ENABLE_CRASH_REPORTING=true
```

#### 9.3 NPM Scripts

**文件：** `mobile/package.json` (scripts section)

```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "format": "biome format --write .",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "build:dev": "eas build --profile development --platform all",
    "build:preview": "eas build --profile preview --platform all",
    "build:prod": "eas build --profile production --platform all",
    "build:android": "eas build --profile production --platform android",
    "build:ios": "eas build --profile production --platform ios",
    "submit:android": "eas submit --platform android",
    "submit:ios": "eas submit --platform ios",
    "update": "eas update",
    "prebuild": "expo prebuild",
    "clean": "rm -rf node_modules .expo android ios"
  }
}
```

#### 9.4 Git 配置

**文件：** `mobile/.gitignore`

```
# Expo
.expo/
dist/
web-build/

# Native
*.orig.*
*.jks
*.p8
*.p12
*.key
*.mobileprovision
*.ipa
*.apk
*.aab

# Metro
.metro-health-check*

# Debug
npm-debug.*
yarn-debug.*
yarn-error.*

# Env
.env
.env.local
.env.*.local

# macOS
.DS_Store

# Node
node_modules/
npm-debug.log
yarn-error.log

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# Testing
coverage/
.nyc_output/

# Misc
*.log
```

#### 9.5 TypeScript 路径别名配置

**文件：** `mobile/babel.config.js`

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
            '@/types': './src/types',
            '@/stores': './src/stores',
            '@/database': './src/database',
            '@/components': './src/components',
            '@/utils': './src/utils',
            '@/hooks': './src/hooks',
            '@/constants': './src/constants',
            '@/services': './src/services',
          },
          extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
```

#### 9.6 Jest 配置

**文件：** `mobile/jest.config.js`

```javascript
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
    '!src/**/__tests__/**',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
```

**文件：** `mobile/jest.setup.js`

```javascript
import '@testing-library/jest-native/extend-expect';

// Mock expo modules
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn(() => 'echotype://auth/callback'),
}));

jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(),
  maybeCompleteAuthSession: jest.fn(),
}));
```


---

### Step 10: 测试和验证（Day 9-10）

#### 10.1 单元测试示例

**文件：** `mobile/src/stores/__tests__/useContentStore.test.ts`

```typescript
import { renderHook, act } from '@testing-library/react-hooks';
import { useContentStore } from '../useContentStore';
import { database } from '@/database';

jest.mock('@/database', () => ({
  database: {
    get: jest.fn(),
    write: jest.fn(),
  },
}));

describe('useContentStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch contents successfully', async () => {
    const mockContents = [
      {
        id: '1',
        title: 'Test Content',
        type: 'article',
        content: 'Test content body',
        language: 'en',
        difficulty: 'beginner',
        tags: ['test'],
        createdAt: new Date(),
        updatedAt: new Date(),
        isFavorite: false,
        progress: 0,
        isDeleted: false,
      },
    ];

    (database.get as jest.Mock).mockReturnValue({
      query: jest.fn().mockReturnValue({
        fetch: jest.fn().mockResolvedValue(mockContents),
      }),
    });

    const { result } = renderHook(() => useContentStore());

    await act(async () => {
      await result.current.fetchContents();
    });

    expect(result.current.contents).toHaveLength(1);
    expect(result.current.contents[0].title).toBe('Test Content');
    expect(result.current.isLoading).toBe(false);
  });

  it('should handle fetch error', async () => {
    (database.get as jest.Mock).mockReturnValue({
      query: jest.fn().mockReturnValue({
        fetch: jest.fn().mockRejectedValue(new Error('Database error')),
      }),
    });

    const { result } = renderHook(() => useContentStore());

    await act(async () => {
      await result.current.fetchContents();
    });

    expect(result.current.error).toBe('Database error');
    expect(result.current.isLoading).toBe(false);
  });
});
```

#### 10.2 集成测试示例

**文件：** `mobile/src/__tests__/auth-flow.test.tsx`

```typescript
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '@/app/(auth)/login';
import { useAuthStore } from '@/stores/useAuthStore';

jest.mock('@/stores/useAuthStore');
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: jest.fn(),
    push: jest.fn(),
  }),
}));

describe('Authentication Flow', () => {
  it('should login successfully with valid credentials', async () => {
    const mockSignIn = jest.fn().mockResolvedValue(undefined);
    (useAuthStore as jest.Mock).mockReturnValue({
      signIn: mockSignIn,
      isLoading: false,
    });

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    const emailInput = getByPlaceholderText('Email');
    const passwordInput = getByPlaceholderText('Password');
    const loginButton = getByText('Sign In');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('should show error message on login failure', async () => {
    const mockSignIn = jest.fn().mockRejectedValue(new Error('Invalid credentials'));
    (useAuthStore as jest.Mock).mockReturnValue({
      signIn: mockSignIn,
      isLoading: false,
    });

    const { getByPlaceholderText, getByText, findByText } = render(<LoginScreen />);

    const emailInput = getByPlaceholderText('Email');
    const passwordInput = getByPlaceholderText('Password');
    const loginButton = getByText('Sign In');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'wrongpassword');
    fireEvent.press(loginButton);

    const errorMessage = await findByText('Invalid credentials');
    expect(errorMessage).toBeTruthy();
  });
});
```

#### 10.3 E2E 测试配置

**文件：** `mobile/e2e/jest.config.js`

```javascript
module.exports = {
  rootDir: '..',
  testMatch: ['<rootDir>/e2e/**/*.test.ts'],
  testTimeout: 120000,
  maxWorkers: 1,
  globalSetup: 'detox/runners/jest/globalSetup',
  globalTeardown: 'detox/runners/jest/globalTeardown',
  reporters: ['detox/runners/jest/reporter'],
  testEnvironment: 'detox/runners/jest/testEnvironment',
  verbose: true,
};
```

**文件：** `mobile/.detoxrc.js`

```javascript
module.exports = {
  testRunner: {
    args: {
      '$0': 'jest',
      config: 'e2e/jest.config.js',
    },
    jest: {
      setupTimeout: 120000,
    },
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/EchoType.app',
      build: 'xcodebuild -workspace ios/EchoType.xcworkspace -scheme EchoType -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build',
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug',
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 15 Pro',
      },
    },
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_7_API_34',
      },
    },
  },
  configurations: {
    'ios.debug': {
      device: 'simulator',
      app: 'ios.debug',
    },
    'android.debug': {
      device: 'emulator',
      app: 'android.debug',
    },
  },
};
```

#### 10.4 验收测试清单

**测试项目：**

1. **项目初始化验证**
   - [ ] Expo 项目成功创建
   - [ ] TypeScript 配置正确
   - [ ] Biome 运行无错误
   - [ ] 所有依赖安装成功

2. **数据库验证**
   - [ ] WatermelonDB 初始化成功
   - [ ] 所有 7 个表创建成功
   - [ ] Model 定义正确
   - [ ] CRUD 操作正常

3. **状态管理验证**
   - [ ] 18 个 Zustand stores 迁移完成
   - [ ] Store 逻辑正确
   - [ ] 持久化配置正常

4. **导航验证**
   - [ ] Expo Router 配置正确
   - [ ] 认证路由正常
   - [ ] Tab 导航正常
   - [ ] 模块路由正常

5. **认证验证**
   - [ ] Supabase 客户端配置正确
   - [ ] 邮箱密码登录正常
   - [ ] OAuth 登录正常
   - [ ] 认证守卫正常
   - [ ] Session 持久化正常

6. **UI 验证**
   - [ ] 主题配置正确
   - [ ] 通用组件渲染正常
   - [ ] 布局组件正常
   - [ ] 响应式设计正常

7. **云同步验证**
   - [ ] 同步服务初始化成功
   - [ ] Pull 同步正常
   - [ ] Push 同步正常
   - [ ] 冲突解决正常
   - [ ] 自动同步正常

8. **开发工具验证**
   - [ ] EAS Build 配置正确
   - [ ] 环境变量加载正常
   - [ ] NPM scripts 运行正常
   - [ ] Jest 测试运行正常

9. **性能验证**
   - [ ] 冷启动时间 < 3s
   - [ ] 内存占用 < 200MB
   - [ ] 数据库查询 < 100ms
   - [ ] UI 渲染 60fps

10. **兼容性验证**
    - [ ] iOS 13+ 运行正常
    - [ ] Android 8+ 运行正常
    - [ ] 不同屏幕尺寸适配正常

---

## 验收标准

### 功能验收

1. **项目可运行**
   - 在 iOS 模拟器上成功运行
   - 在 Android 模拟器上成功运行
   - 无崩溃和严重错误

2. **认证流程完整**
   - 用户可以注册新账号
   - 用户可以登录现有账号
   - 用户可以使用 OAuth 登录
   - 用户可以退出登录

3. **数据持久化正常**
   - 数据可以保存到本地数据库
   - 数据可以从本地数据库读取
   - 数据可以更新和删除

4. **云同步基础可用**
   - 数据可以上传到 Supabase
   - 数据可以从 Supabase 下载
   - 自动同步机制正常工作

5. **导航流畅**
   - 所有路由可以正常跳转
   - Tab 切换流畅
   - 返回导航正常

6. **UI 渲染正确**
   - 主题应用正确
   - 组件样式正确
   - 布局响应式

### 性能验收

1. **启动性能**
   - 冷启动时间 < 3s
   - 热启动时间 < 1s

2. **运行性能**
   - UI 渲染保持 60fps
   - 内存占用 < 200MB
   - 数据库查询 < 100ms

3. **网络性能**
   - API 请求响应 < 2s
   - 同步操作 < 5s

### 代码质量验收

1. **代码规范**
   - Biome 检查通过
   - TypeScript 类型检查通过
   - 无 ESLint 错误

2. **测试覆盖**
   - 单元测试覆盖率 > 60%
   - 关键功能有集成测试
   - 核心流程有 E2E 测试

3. **文档完整**
   - README 包含运行说明
   - 代码有必要注释
   - API 有类型定义

---

## 交付物

1. **代码仓库**
   - `mobile/` 目录包含完整的 Expo 项目
   - 所有源代码提交到 git
   - 分支：`feat/mobile-phase1-foundation`

2. **文档**
   - 项目 README.md
   - 开发环境搭建指南
   - 架构设计文档

3. **配置文件**
   - app.json
   - eas.json
   - .env.example
   - tsconfig.json
   - biome.json

4. **测试**
   - 单元测试套件
   - 集成测试套件
   - E2E 测试配置

---

## 风险和注意事项

### 技术风险

1. **WatermelonDB 学习曲线**
   - 团队需要熟悉 WatermelonDB API
   - 数据库迁移策略需要仔细设计
   - 缓解：提供详细文档和示例代码

2. **Expo Router 复杂性**
   - 文件系统路由可能不够灵活
   - 深层嵌套路由可能复杂
   - 缓解：保持路由结构简单，使用 Stack 和 Tabs 组合

3. **云同步冲突**
   - 离线编辑可能导致冲突
   - 需要设计冲突解决策略
   - 缓解：使用时间戳和 last-write-wins 策略

### 进度风险

1. **依赖安装问题**
   - 某些原生依赖可能安装失败
   - 缓解：使用 Expo 管理的依赖，避免手动 link

2. **平台差异**
   - iOS 和 Android 行为可能不一致
   - 缓解：早期在两个平台上测试

### 资源风险

1. **开发人员技能**
   - 需要熟悉 React Native 和 Expo
   - 缓解：提供培训和文档

---

## 下一步

Phase 1 完成后，进入 **Phase 2: 核心模块实现**，包括：

1. Listen 模块（听力练习）
2. Speak 模块（口语练习）
3. Read 模块（阅读练习）
4. Write 模块（写作练习）
5. Library 模块（内容库）
6. Dashboard 模块（仪表盘）

预计工期：4 周

---

**Phase 1 实现计划结束**

