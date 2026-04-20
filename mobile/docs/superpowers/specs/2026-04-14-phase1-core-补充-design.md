# EchoType Mobile - Phase 1 核心补充实施方案

**日期:** 2026-04-14  
**方案:** BBBB（核心补充 + 简化引导 + 关键路径测试 + 修复 src/ 错误）  
**预计时间:** 1-2 周  
**状态:** 待审批

---

## 实施范围

### ✅ 包含的功能
1. **Settings 功能完善**
   - TTS 速度调节器（Slider）
   - TTS 语音选择器（带预览）
   - 语言偏好设置

2. **Dark Mode 完整实现**
   - Dark color palette
   - 主题切换逻辑
   - 所有页面适配
   - 系统主题跟随

3. **统一 Error Handling**
   - Error Boundary 组件
   - Toast 通知系统
   - 网络错误处理
   - Loading 状态

4. **Accessibility 补充**
   - 所有交互元素添加 labels
   - 表单无障碍优化
   - VoiceOver/TalkBack 测试

5. **简化 Onboarding**
   - 3 屏引导流程
   - 2-3 篇示例内容
   - 空状态引导

6. **关键路径测试**
   - 核心功能 E2E 测试
   - 手动测试清单

7. **TypeScript 错误修复**
   - 修复 src/ 目录的类型错误
   - 忽略测试文件错误

### ❌ 不包含的功能
- 完整 5 屏 Onboarding
- 离线队列和数据同步
- Performance 优化（列表虚拟化）
- 完整单元测试覆盖
- 修复测试文件的 TS 错误

---

## 详细设计

### 1. Settings 功能完善

#### 1.1 TTS 速度调节器

**组件设计:**
```typescript
// src/components/settings/SpeedSlider.tsx
interface SpeedSliderProps {
  value: number; // 0.5 - 2.0
  onChange: (value: number) => void;
}

// UI:
// [0.5x] ----●---- [2.0x]
//        1.0x
```

**实现细节:**
- 使用 `@react-native-community/slider`
- 步进值：0.25（0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0）
- 实时预览：拖动时播放示例音频
- 保存到 `useSettingsStore`

**UI 位置:**
- Settings > Learning > Playback Speed
- 点击后展开 Slider
- 显示当前值和预览按钮

#### 1.2 TTS 语音选择器

**数据结构:**
```typescript
interface Voice {
  id: string;
  name: string;
  language: string;
  gender: 'male' | 'female';
  preview: string; // 示例文本
}

const AVAILABLE_VOICES: Voice[] = [
  { id: 'en-US-Neural2-A', name: 'Emma (US)', language: 'en-US', gender: 'female', preview: 'Hello, how are you?' },
  { id: 'en-US-Neural2-D', name: 'James (US)', language: 'en-US', gender: 'male', preview: 'Hello, how are you?' },
  { id: 'en-GB-Neural2-A', name: 'Alice (UK)', language: 'en-GB', gender: 'female', preview: 'Hello, how are you?' },
  // ... more voices
];
```

**组件设计:**
```typescript
// src/components/settings/VoiceSelector.tsx
// 显示为 Modal 或 Bottom Sheet
// 列表展示所有语音
// 每个语音有预览按钮
// 选中后保存到 store
```

**UI 流程:**
1. Settings > Learning > TTS Voice > 点击
2. 打开 Modal 显示语音列表
3. 点击预览按钮播放示例
4. 选择语音并保存

#### 1.3 语言偏好设置

**设置项:**
```typescript
interface LanguageSettings {
  learningLanguage: 'en' | 'zh'; // 学习的目标语言
  interfaceLanguage: 'en' | 'zh'; // 应用界面语言
  translationLanguage: 'en' | 'zh'; // 翻译目标语言
}
```

**UI 位置:**
- Settings > Learning > Learning Language
- Settings > Appearance > Interface Language

---

### 2. Dark Mode 实现

#### 2.1 Dark Color Palette

**扩展现有 colors.ts:**
```typescript
// src/theme/colors.ts
export const lightColors = {
  // 现有的 light mode 颜色
  primary: '#4F46E5',
  background: '#EEF2FF',
  surface: '#FFFFFF',
  onSurface: '#1F2937',
  // ...
};

export const darkColors = {
  // Dark mode 颜色
  primary: '#818CF8', // 更亮的 indigo
  background: '#0F172A', // Slate-900
  surface: '#1E293B', // Slate-800
  onSurface: '#F1F5F9', // Slate-100
  onSurfaceVariant: '#CBD5E1', // Slate-300
  border: '#334155', // Slate-700
  // ...
};

export const colors = lightColors; // 默认
```

#### 2.2 Theme Context

**创建 Theme Provider:**
```typescript
// src/contexts/ThemeContext.tsx
import { createContext, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { useSettingsStore } from '@/stores/useSettingsStore';

interface ThemeContextValue {
  colors: typeof lightColors;
  isDark: boolean;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue>(null!);

export function ThemeProvider({ children }) {
  const systemColorScheme = useColorScheme();
  const { settings, updateSettings } = useSettingsStore();
  
  // 'light' | 'dark' | 'system'
  const themeMode = settings.theme;
  const isDark = themeMode === 'dark' || (themeMode === 'system' && systemColorScheme === 'dark');
  
  const colors = isDark ? darkColors : lightColors;
  
  return (
    <ThemeContext.Provider value={{ colors, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
```

#### 2.3 组件迁移策略

**步骤:**
1. 包裹 App 根组件：`<ThemeProvider>`
2. 替换所有硬编码颜色：
   ```typescript
   // Before
   backgroundColor: '#FFFFFF'
   
   // After
   const { colors } = useTheme();
   backgroundColor: colors.surface
   ```
3. 测试所有页面的 dark mode
4. 验证对比度（WCAG AA）

**优先级:**
- P0: Dashboard, Library, Settings（最常用）
- P1: Practice screens（Listen/Speak/Read/Write）
- P2: AI Tutor, Review, Vocabulary

---

### 3. 统一 Error Handling

#### 3.1 Error Boundary

**实现:**
```typescript
// src/components/ErrorBoundary.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text } from 'react-native-paper';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // TODO: Log to analytics
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <View style={styles.container}>
          <Text variant="headlineMedium">Something went wrong</Text>
          <Text variant="bodyMedium" style={styles.message}>
            {this.state.error?.message}
          </Text>
          <Button mode="contained" onPress={this.handleReset}>
            Try Again
          </Button>
        </View>
      );
    }

    return this.props.children;
  }
}
```

**使用位置:**
- App 根组件（全局）
- 每个 Tab 页面（局部）
- Modal 内容（隔离）

#### 3.2 Toast 通知系统

**选择库:** `react-native-toast-message`

**封装:**
```typescript
// src/lib/toast.ts
import Toast from 'react-native-toast-message';

export const toast = {
  success: (message: string) => {
    Toast.show({ type: 'success', text1: message });
  },
  error: (message: string) => {
    Toast.show({ type: 'error', text1: message });
  },
  info: (message: string) => {
    Toast.show({ type: 'info', text1: message });
  },
};
```

**使用场景:**
- 导入成功/失败
- 保存成功
- 网络错误
- 操作确认

#### 3.3 网络错误处理

**Fetch Wrapper:**
```typescript
// src/lib/api-client.ts
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string
  ) {
    super(message);
  }
}

export async function apiRequest<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(
        error.message || 'Request failed',
        response.status,
        error.code || 'UNKNOWN'
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    
    // Network error
    throw new ApiError(
      'Network error. Please check your connection.',
      0,
      'NETWORK_ERROR'
    );
  }
}
```

**重试逻辑:**
```typescript
export async function apiRequestWithRetry<T>(
  url: string,
  options?: RequestInit,
  maxRetries = 3
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiRequest<T>(url, options);
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }
  
  throw lastError!;
}
```

---

### 4. Accessibility 补充

#### 4.1 缺失的 Labels

**需要添加的组件:**
```typescript
// IconButton
<IconButton
  icon="heart"
  accessibilityLabel="Add to favorites"
  accessibilityRole="button"
  accessibilityState={{ checked: isFavorite }}
/>

// Pressable
<Pressable
  accessibilityRole="button"
  accessibilityLabel="Open content"
  accessibilityHint="Double tap to view details"
>

// Tab Bar
<Pressable
  accessibilityRole="tab"
  accessibilityLabel={`${label} tab`}
  accessibilityState={{ selected: isFocused }}
>
```

**检查清单:**
- [ ] ContentCard - favorite button
- [ ] ImportModal - all buttons
- [ ] CustomTabBar - all tabs
- [ ] RecordButton - microphone
- [ ] TranslationPanel - close button
- [ ] EditContentModal - all inputs
- [ ] AddVocabularyModal - all inputs

#### 4.2 表单无障碍

**Input 组件:**
```typescript
<TextInput
  label="Title"
  accessibilityLabel="Content title"
  accessibilityHint="Enter a title for your content"
  error={!!errors.title}
  accessibilityInvalid={!!errors.title}
  accessibilityErrorMessage={errors.title}
/>
```

#### 4.3 测试

**手动测试:**
- iOS: 启用 VoiceOver，测试所有页面
- Android: 启用 TalkBack，测试所有页面

**检查项:**
- 所有按钮可聚焦
- 所有按钮有清晰的标签
- 表单错误可读
- 导航流畅

---

### 5. 简化 Onboarding

#### 5.1 三屏引导流程

**Screen 1: 欢迎**
```
[Logo]

Welcome to EchoType

Master English through
immersive practice

[Get Started →]
[Skip]
```

**Screen 2: 四种练习模式**
```
Learn Your Way

🎧 Listen - Improve comprehension
🎤 Speak - Perfect pronunciation  
📖 Read - Build vocabulary
✍️ Write - Express yourself

[Next →]
[Skip]
```

**Screen 3: 开始学习**
```
Import Your First Content

📝 Paste text
🔗 Import from URL
🎬 YouTube video
📄 PDF document
🤖 AI generated

[Import Content]
[Browse Examples]
```

**实现:**
```typescript
// app/onboarding/index.tsx
// 使用 react-native-pager-view
// 保存完成状态到 AsyncStorage
// 完成后跳转到 Dashboard
```

#### 5.2 示例内容

**预置 2-3 篇文章:**
```typescript
const EXAMPLE_CONTENTS: Content[] = [
  {
    id: 'example_1',
    title: 'A Day in New York',
    text: 'New York City is one of the most exciting cities...',
    difficulty: 'beginner',
    language: 'en',
    type: 'article',
    tags: ['travel', 'city'],
  },
  {
    id: 'example_2',
    title: 'The Benefits of Reading',
    text: 'Reading is one of the best habits you can develop...',
    difficulty: 'intermediate',
    language: 'en',
    type: 'article',
    tags: ['education', 'habits'],
  },
];
```

**加载时机:**
- 首次启动时自动添加
- 标记为 `isExample: true`
- 可以删除

#### 5.3 空状态引导

**Library 空状态:**
```typescript
<View style={styles.emptyState}>
  <Icon name="book-open-variant" size={64} />
  <Text variant="headlineMedium">No content yet</Text>
  <Text variant="bodyMedium">
    Import your first article to start learning
  </Text>
  <Button mode="contained" onPress={openImportModal}>
    Import Content
  </Button>
  <Button mode="text" onPress={loadExamples}>
    Browse Examples
  </Button>
</View>
```

---

### 6. 关键路径测试

#### 6.1 E2E 测试框架

**选择:** Detox（React Native 官方推荐）

**安装:**
```bash
pnpm add -D detox jest
detox init
```

**配置:**
```json
// .detoxrc.js
module.exports = {
  testRunner: {
    args: {
      config: 'e2e/jest.config.js',
      maxWorkers: 1,
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
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 15',
      },
    },
  },
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug',
    },
  },
};
```

#### 6.2 测试用例

**Test 1: 导入和练习流程**
```typescript
// e2e/import-and-practice.test.ts
describe('Import and Practice Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should import text content and practice listening', async () => {
    // 1. 跳过 onboarding
    await element(by.text('Skip')).tap();
    
    // 2. 打开 Library
    await element(by.id('tab-library')).tap();
    
    // 3. 打开 Import Modal
    await element(by.id('import-fab')).tap();
    
    // 4. 选择 Text 导入
    await element(by.text('Text')).tap();
    
    // 5. 输入内容
    await element(by.id('import-text-input')).typeText('Hello world');
    await element(by.id('import-title-input')).typeText('Test Content');
    
    // 6. 导入
    await element(by.text('Import')).tap();
    
    // 7. 验证内容出现在列表
    await expect(element(by.text('Test Content'))).toBeVisible();
    
    // 8. 点击内容
    await element(by.text('Test Content')).tap();
    
    // 9. 开始 Listen 练习
    await element(by.text('Listen')).tap();
    
    // 10. 验证练习页面
    await expect(element(by.id('audio-player'))).toBeVisible();
  });
});
```

**Test 2: Settings 修改**
```typescript
describe('Settings', () => {
  it('should toggle dark mode', async () => {
    await element(by.id('tab-settings')).tap();
    await element(by.id('dark-mode-switch')).tap();
    // 验证背景色变化
    await expect(element(by.id('settings-screen'))).toHaveStyle({ backgroundColor: '#0F172A' });
  });
});
```

**Test 3: Vocabulary 收集**
```typescript
describe('Vocabulary Collection', () => {
  it('should add word to vocabulary from reading', async () => {
    // ... 导入内容
    // ... 进入 Read 练习
    // ... 选择单词
    // ... 点击 "Add to Vocabulary"
    // ... 验证出现在 Vocabulary tab
  });
});
```

#### 6.3 手动测试清单

**创建文档:**
```markdown
# Manual Testing Checklist

## Import Flow
- [ ] Text import works
- [ ] URL import works
- [ ] YouTube import works
- [ ] PDF import works
- [ ] AI generation works
- [ ] Error handling for invalid input

## Practice Modes
- [ ] Listen: audio plays, text highlights
- [ ] Speak: recording works, score displays
- [ ] Read: translation works, vocabulary add
- [ ] Write: typing tracked, stats display

## Settings
- [ ] TTS speed changes
- [ ] TTS voice changes
- [ ] Dark mode toggles
- [ ] Sign in/out works

## Vocabulary
- [ ] Add word from reading
- [ ] Add word manually
- [ ] Delete word
- [ ] Review vocabulary

## Review System
- [ ] Cards appear when due
- [ ] Rating updates schedule
- [ ] Stats display correctly

## Accessibility
- [ ] VoiceOver navigation works
- [ ] All buttons have labels
- [ ] Forms are accessible
```

---

### 7. TypeScript 错误修复

#### 7.1 修复策略

**范围:** 只修复 `src/` 目录的错误

**忽略:** 
- `scripts/` - 测试脚本
- `__tests__/` - 测试文件
- `*.test.ts` - 单元测试

**方法:**
```bash
# 1. 生成错误列表
pnpm tsc --noEmit 2>&1 | grep "^src/" > ts-errors.txt

# 2. 按文件分组
cat ts-errors.txt | cut -d: -f1 | sort | uniq -c | sort -rn

# 3. 逐个文件修复
```

#### 7.2 常见错误类型

**1. 缺少类型定义**
```typescript
// Before
const data = await fetch(url);

// After
const data: ApiResponse = await fetch(url);
```

**2. 可选属性访问**
```typescript
// Before
const name = user.email.split('@')[0];

// After
const name = user.email?.split('@')[0] || 'User';
```

**3. 函数签名不匹配**
```typescript
// Before
onToggleFavorite={toggleFavorite}

// After
onToggleFavorite={() => toggleFavorite(item.id)}
```

**4. 导入路径错误**
```typescript
// Before
import { colors } from '@/theme';

// After
import { colors } from '@/theme/colors';
```

#### 7.3 添加 tsconfig 排除

```json
// tsconfig.json
{
  "exclude": [
    "node_modules",
    "scripts",
    "**/*.test.ts",
    "**/*.test.tsx",
    "**/__tests__"
  ]
}
```

---

## 实施顺序

### Week 1: 核心功能（5 天）

**Day 1-2: Settings + Dark Mode**
- [ ] TTS 速度 Slider
- [ ] TTS 语音选择器
- [ ] Dark color palette
- [ ] Theme Context
- [ ] 迁移 Dashboard + Library + Settings

**Day 3: Error Handling**
- [ ] Error Boundary
- [ ] Toast 系统
- [ ] API Client wrapper
- [ ] 应用到所有 API 调用

**Day 4: Accessibility**
- [ ] 添加所有缺失的 labels
- [ ] 表单无障碍优化
- [ ] VoiceOver 测试

**Day 5: TypeScript 修复**
- [ ] 修复 src/ 目录错误
- [ ] 更新 tsconfig
- [ ] 验证编译通过

### Week 2: 体验优化 + 测试（5 天）

**Day 6-7: Onboarding**
- [ ] 三屏引导流程
- [ ] 示例内容
- [ ] 空状态引导

**Day 8: Dark Mode 完成**
- [ ] 迁移剩余页面
- [ ] 对比度测试
- [ ] 系统主题跟随

**Day 9: E2E 测试**
- [ ] 配置 Detox
- [ ] 编写 3 个关键路径测试
- [ ] 运行测试

**Day 10: 手动测试 + Bug 修复**
- [ ] 完整手动测试
- [ ] 修复发现的问题
- [ ] 最终验证

---

## 验收标准

### 功能完整性
- [ ] Settings 中所有选项可用
- [ ] Dark Mode 在所有页面正常工作
- [ ] 错误有友好的提示
- [ ] 所有交互元素有 accessibility labels
- [ ] Onboarding 流程完整
- [ ] 示例内容可用

### 质量标准
- [ ] TypeScript 编译无错误（src/ 目录）
- [ ] 3 个 E2E 测试通过
- [ ] 手动测试清单全部通过
- [ ] VoiceOver/TalkBack 可用
- [ ] 无明显性能问题

### 文档完整性
- [ ] 更新 README
- [ ] 更新 TESTING_CHECKLIST
- [ ] 创建 CHANGELOG
- [ ] 更新 UI_UX_AUDIT（标记完成项）

---

## 风险与缓解

### 风险 1: Dark Mode 迁移工作量大
**影响:** 可能超过 2 天  
**缓解:** 
- 优先迁移核心页面
- 使用 Theme Context 统一管理
- 可以分批发布

### 风险 2: Detox 配置复杂
**影响:** E2E 测试可能延期  
**缓解:**
- 如果配置困难，降级为手动测试
- 或使用 Maestro（更简单）

### 风险 3: TypeScript 错误难以修复
**影响:** 可能需要更多时间  
**缓解:**
- 优先修复关键文件
- 部分错误可以 @ts-ignore
- 不阻塞功能开发

---

## 下一步

请确认此实施方案是否符合预期。确认后我将立即开始实施：

1. **Day 1-2: Settings + Dark Mode 基础**
2. **Day 3: Error Handling**
3. **Day 4: Accessibility**
4. **Day 5: TypeScript 修复**
5. **Day 6-7: Onboarding**
6. **Day 8: Dark Mode 完成**
7. **Day 9: E2E 测试**
8. **Day 10: 最终测试**

预计完成时间：**2 周**（10 个工作日）

是否开始实施？
