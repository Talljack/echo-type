# Mobile Library Page - Implementation Status

## ✅ 已完成的功能

### Import Modal
- ✅ Document 分类（Paste/Upload/URL）
- ✅ Media 分类（URL/Local）
- ✅ AI 分类（完整参数支持）
- ✅ 所有功能与 Web 端对齐

### Library Page - 基础功能
- ✅ 搜索功能
- ✅ 收藏筛选
- ✅ 标签筛选（Tag Cloud）
- ✅ 排序功能（Recent/Title/Difficulty）
- ✅ 空状态展示
- ✅ 示例内容加载

## ❌ 待实现的功能

### 1. 状态栏重叠问题 (高优先级)
**问题**: Listen 和 Speak 页面的顶部内容被状态栏遮挡
**原因**: LinearGradient 的 paddingTop 不足以避开刘海区域
**解决方案**: 
- 使用 SafeAreaView 的 insets
- 或者调整 Screen 组件的 padding 配置

### 2. 视图标签筛选 (中优先级)
**缺失**: All/Phrase/Sentence/Article 标签切换
**Web 端**: 有完整的视图标签系统
**实现**: 添加 SegmentedButtons 或 Chip 组件

### 3. 难度筛选 (中优先级)
**缺失**: Beginner/Intermediate/Advanced 筛选按钮
**Web 端**: 有完整的难度筛选
**实现**: 添加难度筛选 Chips

### 4. 视图模式切换 (中优先级)
**缺失**: All Content / Media Only 切换
**Web 端**: 可以只显示媒体内容（YouTube/本地音视频）
**实现**: 添加视图模式切换按钮

### 5. ContentCard 增强 (高优先级)
**缺失功能**:
- Listen 按钮（跳转到听力练习）
- Read 按钮（跳转到阅读练习）
- Write 按钮（跳转到写作练习）
- Delete 按钮（删除内容）
- 标签显示和编辑
- 难度徽章
- 内容预览文本

**Web 端**: 每个卡片有完整的操作按钮和信息展示

### 6. 批量选择模式 (中优先级)
**缺失**: Select 模式，允许选择多个项目
**Web 端**: 有完整的批量选择功能
**实现**: 
- 添加 Select/Cancel 按钮
- ContentCard 支持选择状态
- 显示选中数量

### 7. 批量操作 (中优先级)
**缺失**: 批量删除、批量添加标签
**Web 端**: 选中多个项目后可以批量操作
**实现**:
- 批量删除功能
- 批量添加标签输入框

### 8. 内容分组显示 (低优先级)
**缺失**: 按类型分组的手风琴展示
**Web 端**: 使用 Accordion 组件分组显示不同类型的内容
**移动端**: 可以简化为列表展示，通过标签筛选

### 9. Word Books 和 Scenarios (低优先级)
**缺失**: 导入的词汇书和场景对话展示
**Web 端**: 有专门的 Word Books 和 Scenarios 区域
**移动端**: 暂时可以不实现，优先级较低

## 🎯 推荐实现顺序

1. **修复状态栏重叠** - 影响用户体验
2. **增强 ContentCard** - 核心功能，用户需要操作按钮
3. **添加视图标签和难度筛选** - 提升筛选能力
4. **添加批量选择和操作** - 提升效率
5. **添加视图模式切换** - 补充功能

## 📝 实现建议

### ContentCard 重新设计
```tsx
<ContentCard>
  <Header>
    <Title />
    <FavoriteButton />
  </Header>
  <Preview>
    <Text numberOfLines={2} />
  </Preview>
  <Metadata>
    <DifficultyBadge />
    <Tags />
  </Metadata>
  <Actions>
    <ListenButton />
    <ReadButton />
    <WriteButton />
    <DeleteButton />
  </Actions>
</ContentCard>
```

### Library Page 布局优化
```tsx
<Screen scrollable>
  <Header>
    <Title + Stats />
    <Actions: Select/Import />
  </Header>
  <Search />
  <ViewTabs: All/Phrase/Sentence/Article />
  <Filters: ViewMode + Difficulty + Sort />
  <TagCloud />
  <BatchActionsBar /> {/* 仅在选择模式显示 */}
  <ContentList />
  <FAB: Import />
</Screen>
```

## 🔧 技术细节

### 状态栏修复
```tsx
// 方案 1: 使用 useSafeAreaInsets
import { useSafeAreaInsets } from 'react-native-safe-area-context';
const insets = useSafeAreaInsets();
<View style={{ paddingTop: insets.top }}>

// 方案 2: 调整 Screen 组件
<Screen scrollable padding={0}>
  <View style={{ paddingTop: 0 }}>
```

### 筛选逻辑增强
```tsx
const filteredContents = useMemo(() => {
  let result = contents;
  
  // View tab filter
  if (activeViewTab !== 'all') {
    result = result.filter(item => item.type === activeViewTab);
  }
  
  // View mode filter
  if (viewMode === 'media') {
    result = result.filter(item => 
      item.source === 'youtube' || item.source === 'local-media'
    );
  }
  
  // Difficulty filter
  if (difficultyFilter) {
    result = result.filter(item => item.difficulty === difficultyFilter);
  }
  
  // ... 其他筛选
  
  return result;
}, [contents, activeViewTab, viewMode, difficultyFilter, ...]);
```

## 📊 当前进度

- Import 功能: 100% ✅
- Library 基础功能: 60% 🟡
- Library 高级功能: 20% 🔴
- 状态栏问题: 0% 🔴

## 🎨 UI 优化建议

1. **使用渐变背景**: Library 页面顶部使用紫色渐变，与 Web 端风格一致
2. **卡片阴影**: 添加微妙的阴影效果
3. **动画效果**: 卡片点击时的缩放动画
4. **空状态**: 更友好的空状态提示
5. **加载状态**: 添加骨架屏或加载指示器
