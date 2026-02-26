# Echo Type - TODO

## 1. 翻译功能（沉浸式翻译风格）

**目标：** 在 Listen、Read、Write 页面支持实时翻译展示，参考沉浸式翻译的交互方式。

**功能点：**
- 在 Listen / Read / Write 页面的内容区域，支持逐句/逐段显示译文（原文下方展示译文）
- 设置页面新增「翻译设置」：
  - 目标语言选择（默认中文，支持多语言）
  - 源语言固定为英文（当前仅支持英文学习）
  - 开关：是否默认展示翻译
- 翻译 API 已有 `/api/translate` 路由和 `use-translation` hook，复用即可
- 翻译结果缓存到本地，避免重复请求

---

## 2. Tools 工具页面

**目标：** 提供一个独立的工具页面 `/tools`，集成多个实用工具，降低内容导入门槛。

### 2.1 视频/音频转音频导入
- 输入视频或音频链接，自动提取音频并导入到 Library
- 支持平台：YouTube、B 站、TikTok、Twitter/X、Facebook、Instagram
- 参考：[ytdownloader](https://github.com/aandrew-me/ytdownloader)
- 后端调用 `yt-dlp` 提取音频（mp3/m4a），存储到本地或对象存储
- 同时提取字幕/转录文本，作为 ContentItem 的 text 字段
- 导入后自动跳转到 Library 对应条目

### 2.2 字幕/文本提取
- 输入视频链接，提取字幕文本（优先官方字幕，其次 AI 转录）
- 支持将提取的文本直接保存为 article/sentence 类型的 ContentItem
- 支持手动粘贴文本，AI 自动分段、打标签、判断难度后导入

### 2.3 AI 内容生成
- 根据主题（如：科技、旅行、日常对话）和难度（beginner/intermediate/advanced）生成练习内容
- 生成类型：单词列表、句子、短文
- 生成后预览，确认后保存到 Library
- 调用现有 AI SDK（Anthropic/OpenAI）

### 2.4 学习数据导出/备份
- 导出全部 Library 内容为 JSON 文件
- 导出学习记录（LearningRecord + TypingSession）为 JSON/CSV
- 支持从备份文件恢复导入（合并或覆盖模式）
- 数据格式与现有 Dexie DB schema 对齐

---

## 3. 推荐功能

**目标：** 在 Listen、Speak、Write 页面底部展示相关内容推荐，不干扰主学习流程。

**功能点：**
- 完成或练习一段内容后，底部展示推荐区域（可折叠）
- 推荐逻辑：
  - **文章/句子**：推荐相关主题的其他内容（基于 tags/category 匹配 + AI 语义相关）
  - **单词**：推荐近义词、反义词、同词根词、常见搭配短语
- 推荐来源：Library 现有内容 + AI 实时生成
- 点击推荐项可直接跳转到对应练习页面
- 设置页面新增「推荐设置」：
  - 开关：是否启用推荐功能（默认开启）
  - 推荐数量：3 / 5 / 10 条
- 推荐区域放在页面底部，样式轻量，不抢占主内容区域焦点
