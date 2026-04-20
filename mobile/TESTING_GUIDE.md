# EchoType Mobile - Phase 1 测试指南

## 测试环境
- **设备**: iPhone 16 Pro Simulator (iOS 18.2)
- **测试日期**: 2026-04-12
- **构建版本**: 1.0.0
- **Metro Bundler**: 运行在 http://localhost:8081

## 自动化测试状态

### ✅ 已通过的自动化测试
1. **应用构建**: 成功编译并安装到模拟器
2. **应用启动**: 成功启动并显示登录界面
3. **Metro Bundler**: 正常运行，无错误
4. **代码质量**: 
   - Biome lint 通过（40 个文件自动修复）
   - 代码格式化符合规范
5. **项目结构**: 所有核心模块已实现
   - ✅ WatermelonDB 数据库层
   - ✅ Supabase 认证系统
   - ✅ Zustand 状态管理
   - ✅ Expo Router 导航
   - ✅ React Native Paper UI 组件
   - ✅ 云同步基础设施

### ⚠️ 已知问题（不影响运行）
1. **TypeScript 类型错误**: 
   - Button 组件的 children 属性类型不匹配
   - WatermelonDB 装饰器类型问题
   - 这些是类型定义问题，不影响运行时功能

## 手动测试清单

由于 iOS 模拟器无法通过自动化工具进行交互测试，请按照以下步骤手动测试：

### 1. 认证功能测试

#### 1.1 登录页面 UI 检查
- [ ] 打开模拟器中的 EchoType 应用
- [ ] 确认页面显示 "Welcome to EchoType" 标题
- [ ] 确认显示 "Sign in to continue" 副标题
- [ ] 确认有邮箱输入框（Email）
- [ ] 确认有密码输入框（Password）
- [ ] 确认有 "Sign In" 按钮
- [ ] 确认有 "Sign in with Google" 按钮
- [ ] 确认有 "Sign in with Apple" 按钮
- [ ] 确认底部有 "Don't have an account? Sign Up" 链接

#### 1.2 表单输入测试
- [ ] 点击邮箱输入框，确认键盘弹出
- [ ] 输入测试邮箱（如 test@example.com）
- [ ] 点击密码输入框，确认键盘切换到密码模式
- [ ] 输入测试密码
- [ ] 确认输入的文本正确显示

#### 1.3 注册页面导航
- [ ] 点击 "Sign Up" 链接
- [ ] 确认跳转到注册页面
- [ ] 确认注册页面显示正确的表单字段
- [ ] 点击返回按钮，确认能返回登录页面

#### 1.4 OAuth 登录测试
- [ ] 点击 "Sign in with Google" 按钮
- [ ] 确认触发 OAuth 流程（可能会打开浏览器或显示错误提示）
- [ ] 点击 "Sign in with Apple" 按钮
- [ ] 确认触发 OAuth 流程

**注意**: OAuth 登录需要配置 Supabase 项目和 OAuth 提供商，如果未配置会显示错误，这是正常的。

### 2. 导航功能测试

#### 2.1 登录后导航
由于没有真实的 Supabase 后端，你可以通过以下方式测试导航：

**方法 1: 修改代码跳过认证**
1. 临时修改 `app/_layout.tsx`，注释掉认证检查
2. 重新加载应用
3. 确认直接进入 Dashboard

**方法 2: 使用测试账号**
1. 在 Supabase 控制台创建测试用户
2. 使用测试账号登录
3. 确认登录成功后跳转到 Dashboard

#### 2.2 Tab 导航测试
- [ ] 确认底部显示 5 个 Tab：Dashboard, Listen, Speak, Library, Settings
- [ ] 点击 "Listen" tab，确认页面切换
- [ ] 点击 "Speak" tab，确认页面切换
- [ ] 点击 "Library" tab，确认页面切换
- [ ] 点击 "Settings" tab，确认页面切换
- [ ] 点击 "Dashboard" tab，确认返回首页
- [ ] 确认每个 tab 的图标和标签正确显示

### 3. Dashboard 页面测试

- [ ] 确认显示 "Welcome back!" 标题
- [ ] 确认显示学习统计卡片（Today's Progress, Weekly Goal, Total Time）
- [ ] 确认显示 "Today's Tasks" 部分
- [ ] 确认显示 "Learning Progress" 部分
- [ ] 确认显示 "Quick Actions" 按钮组

### 4. 数据库功能测试

#### 4.1 数据库初始化
- [ ] 打开应用，确认没有数据库错误
- [ ] 检查 Metro Bundler 日志，确认 WatermelonDB 初始化成功

#### 4.2 数据持久化测试
1. 在应用中创建一些测试数据（如果有相关功能）
2. 完全关闭应用（从多任务中滑掉）
3. 重新打开应用
4. 确认数据仍然存在

### 5. UI 组件测试

#### 5.1 主题测试
- [ ] 进入 Settings 页面
- [ ] 切换深色/浅色主题（如果已实现）
- [ ] 确认所有页面的主题正确更新

#### 5.2 响应式测试
- [ ] 旋转模拟器（Cmd + 左/右箭头）
- [ ] 确认横屏模式下布局正常
- [ ] 确认竖屏模式下布局正常

### 6. 性能测试

- [ ] 记录应用启动时间（从点击图标到显示登录页面）
- [ ] 确认启动时间 < 3 秒
- [ ] 在不同页面间快速切换，确认无卡顿
- [ ] 滚动长列表（如果有），确认流畅度

### 7. 错误处理测试

#### 7.1 网络错误
- [ ] 关闭 Mac 的网络连接
- [ ] 尝试登录
- [ ] 确认显示友好的错误提示

#### 7.2 表单验证
- [ ] 在登录页面留空邮箱，点击登录
- [ ] 确认显示验证错误
- [ ] 输入无效邮箱格式，点击登录
- [ ] 确认显示格式错误提示

## 快速测试命令

### 重新启动应用
```bash
cd /Users/yugangcao/apps/my-apps/echo-type/mobile
npx expo start --clear
```

### 在模拟器中打开应用
```bash
xcrun simctl launch booted com.yugangcao.echotype
```

### 截取模拟器屏幕
```bash
xcrun simctl io booted screenshot ~/Desktop/echotype-test.png
```

### 查看应用日志
```bash
xcrun simctl spawn booted log stream --predicate 'processImagePath contains "EchoType"' --level=debug
```

### 重置模拟器
```bash
xcrun simctl erase booted
```

## 测试结果记录

### 功能测试结果
| 功能模块 | 测试项 | 状态 | 备注 |
|---------|--------|------|------|
| 应用启动 | 安装和启动 | ✅ 通过 | 成功显示登录界面 |
| 认证功能 | 登录 UI | ⏳ 待测试 | 需要手动测试 |
| 认证功能 | 注册流程 | ⏳ 待测试 | 需要手动测试 |
| 认证功能 | OAuth 登录 | ⏳ 待测试 | 需要配置 Supabase |
| 导航功能 | Tab 导航 | ⏳ 待测试 | 需要登录后测试 |
| Dashboard | 页面显示 | ⏳ 待测试 | 需要登录后测试 |
| 数据库 | 初始化 | ✅ 通过 | 无错误日志 |
| 数据库 | 数据持久化 | ⏳ 待测试 | 需要手动测试 |
| UI 组件 | 主题切换 | ⏳ 待测试 | 需要实现后测试 |
| 性能 | 启动时间 | ⏳ 待测试 | 需要手动测量 |

### 已知限制
1. **无自动化测试**: iOS 模拟器无法通过 Chrome DevTools 进行自动化交互
2. **需要 Supabase 配置**: OAuth 登录和云同步功能需要配置真实的 Supabase 项目
3. **TypeScript 类型错误**: 存在一些类型定义问题，但不影响运行

## 下一步建议

### 立即可做
1. 手动测试登录页面的 UI 和交互
2. 测试注册页面的导航
3. 验证表单输入功能

### 需要配置后测试
1. 配置 Supabase 项目（URL 和 anon key）
2. 配置 Google OAuth
3. 配置 Apple Sign In
4. 测试真实的登录/注册流程
5. 测试云同步功能

### 代码改进
1. 修复 TypeScript 类型错误
2. 添加单元测试
3. 添加集成测试
4. 实现错误边界组件
5. 添加加载状态指示器

## 测试完成标准

Phase 1 测试通过的标准：
- ✅ 应用能成功启动并显示登录界面
- ✅ 所有核心模块（数据库、认证、状态管理、导航）已实现
- ✅ 代码质量检查通过（lint, format）
- ⏳ 登录/注册 UI 可以正常交互
- ⏳ Tab 导航可以正常切换
- ⏳ 数据库可以正常读写
- ⏳ 无严重的运行时错误

**当前状态**: 基础架构已完成，等待手动功能测试验证。
