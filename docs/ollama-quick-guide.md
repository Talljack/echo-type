# Ollama 快速使用指南

## 如何在 EchoType 中使用 Ollama

### 1. 安装和启动 Ollama

```bash
# macOS/Linux
curl -fsSL https://ollama.com/install.sh | sh

# 启动服务
ollama serve

# 拉取推荐的文本模型
ollama pull llama3.2      # 小型快速模型 (1.88 GB)
ollama pull gemma3:12b    # 中型平衡模型 (7.59 GB)
```

### 2. 在 EchoType 中配置

1. 打开设置页面 `/settings`
2. 在 AI Provider 部分，选择 **Local** 分组下的 **Ollama**
3. 确认 Base URL 为 `http://localhost:11434/v1`
4. 点击 **Connect**（无需 API key）
5. 选择已下载的模型（如 `llama3.2`）

### 3. 使用场景

**✅ 推荐使用**:
- 离线环境下的英语学习
- 隐私敏感的个人笔记翻译
- 本地开发和测试

**⚠️ 注意事项**:
- 首次使用需要等待模型加载（1-3 分钟）
- 响应速度比云端 API 慢（5-60 秒 vs 2-5 秒）
- 建议在非高峰时段使用

### 4. 性能优化建议

**预加载模型**:
```bash
# 在使用前预先加载模型
ollama run llama3.2
# 输入 /bye 退出，但模型保持加载状态
```

**选择合适的模型**:
- `llama3.2` - 最快，适合日常对话和简单翻译
- `gemma3:12b` - 平衡，适合复杂翻译和内容生成
- `deepseek-r1:32b` - 最强，适合推理和复杂任务（需要更多资源）

**避免使用视觉模型**:
- ❌ `qwen3-vl` - 视觉模型，处理文本任务极慢
- ❌ 其他 `-vl` 或 `-vision` 后缀的模型

### 5. 故障排查

**问题：连接失败**
```bash
# 检查 Ollama 是否运行
curl http://localhost:11434/api/tags

# 如果没有响应，启动服务
ollama serve
```

**问题：响应很慢**
```bash
# 检查当前加载的模型
curl http://localhost:11434/api/ps

# 如果加载了视觉模型，切换到文本模型
ollama run llama3.2
```

**问题：模型不存在**
```bash
# 查看已下载的模型
ollama list

# 下载需要的模型
ollama pull llama3.2
```

### 6. 与云端 API 对比

| 特性 | Ollama 本地 | 云端 API |
|------|------------|----------|
| 响应速度 | 5-60 秒 | 2-5 秒 |
| 隐私性 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| 离线可用 | ✅ | ❌ |
| 成本 | 免费 | 按使用付费 |
| 质量 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 稳定性 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

### 7. 推荐配置

**日常使用**:
- 主要 Provider: OpenAI / Anthropic / Google
- 备用 Provider: Ollama (llama3.2)

**隐私优先**:
- 主要 Provider: Ollama (gemma3:12b)
- 备用 Provider: 云端 API（紧急情况）

**开发测试**:
- 主要 Provider: Ollama (llama3.2)
- 生产环境: 云端 API
