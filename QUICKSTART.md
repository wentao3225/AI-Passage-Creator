# 快速启动指南

> 5 分钟内启动项目，10 分钟内看到第一篇生成的文章

---

## 📋 前置检查清单

```bash
# 检查 JDK 版本
java -version  # 应显示 21+

# 检查 Node 版本
node --version  # 应显示 18+

# 检查 MySQL
mysql --version

# 检查 Redis
redis-cli ping  # 应显示 PONG
```

---

## ⚙️ 一键启动脚本（Linux/Mac）

```bash
#!/bin/bash
set -e

echo "🚀 AI-Passage-Creator 启动脚本"

# 1. 后端编译
echo "📦 编译后端..."
mvn clean package -DskipTests

# 2. 初始化数据库
echo "🗄️  初始化数据库..."
mysql -u root -p < sql/init.sql

# 3. 配置本地环境
echo "⚙️  配置本地环境..."
cp src/main/resources/application-local.example.yaml \
   src/main/resources/application-local.yaml

echo "⚠️  请编辑 application-local.yaml，填入你的："
echo "   - MySQL 密码"
echo "   - Redis 密码"
echo "   - DashScope API Key"
echo ""
read -p "按 Enter 继续..." 

# 4. 启动后端
echo "🔥 启动后端..."
java -jar target/AI-Passage-Creator-1.0.0.jar --spring.profiles.active=local &
BACKEND_PID=$!

# 等待后端启动
sleep 5
echo "✅ 后端启动成功 (PID: $BACKEND_PID)"

# 5. 启动前端
echo "💻 启动前端..."
cd passage-web
npm install
npm run dev

echo "🎉 系统启动完成！"
echo "   后端：http://localhost:8567/api"
echo "   前端：http://localhost:5173"
```

---

## 🔧 分步启动（推荐新手）

### 第 1 步：后端启动（3 分钟）

```bash
# 1.1 编译
mvn clean package

# 1.2 初始化数据库
mysql -u root -p < sql/init.sql

# 1.3 配置
cp src/main/resources/application-local.example.yaml \
   src/main/resources/application-local.yaml

# 编辑配置文件，填入你的密钥
# 使用你喜欢的编辑器打开 application-local.yaml

# 1.4 启动
java -jar target/AI-Passage-Creator-1.0.0.jar --spring.profiles.active=local
```

**预期输出**：
```
2024-06-04 10:00:00 INFO : Started Application in 3.5 seconds
2024-06-04 10:00:01 INFO : Tomcat started on port(s): 8567
```

### 第 2 步：前端启动（2 分钟）

在新的终端中：

```bash
cd passage-web

# 2.1 安装依赖
npm install

# 2.2 启动开发服务器
npm run dev
```

**预期输出**：
```
  ➜  Local:   http://localhost:5173/
```

### 第 3 步：打开浏览器（1 分钟）

```
访问：http://localhost:5173
```

**首次使用**：
1. 使用默认账号登录（参考 `sql/init.sql` 中的初始数据）
2. 默认账号：`admin` / `admin`（建议修改）

---

## 🎬 第一次使用演练

### 场景：生成一篇"AI 改变职场"的科技文章

**步骤**：

1. **登录** → 系统首页

2. **点击"开始创作"** → 进入创作页面

3. **填写信息**：
   - 选题：`AI 时代职场人的新技能要求`
   - 风格：`tech`（科技感）
   - 配图方式：`PEXELS + MERMAID`（自选，可多选）

4. **等待标题生成**（2-3 秒）
   - 系统会生成 5 个标题方案
   - 选一个喜欢的，或自定义标题

5. **大纲生成中**（5-10 秒）
   - 你会看到大纲逐字出现（流式推送）
   - 可以编辑/排序各章节

6. **点击"确认大纲"**
   - 进入"生成中"界面
   - 观看实时进度：正文生成中... → 图片分析中... → 生成图 1/10, 2/10...

7. **完成！** → 查看文章
   - 可以查看/编辑/导出成 Markdown

---

## 🔍 验证系统是否正常

### 后端健康检查

```bash
# 检查后端是否运行
curl http://localhost:8567/api

# 预期返回：404（因为没有根路径）或其他非 500 错误
```

### 前端健康检查

打开浏览器开发者工具（F12）：

1. **检查 SSE 连接**
   - 点击"开始创作"
   - Network 标签中应该看到 `/article/progress/{taskId}`
   - Status 应该是 200 且 Type 是 "event stream"

2. **检查日志输出**
   - Console 标签中应该看到 `[SSE] Connected: taskId=...`

### 数据库健康检查

```bash
# 登入 MySQL
mysql -u root -p passage

# 查询是否有表
show tables;

# 查看 article 表结构
desc article;

# 查询样本数据
select count(*) from article;
```

---

## ⚡ 快速问题排查

### 问题 1：后端启动失败 - "无法连接 MySQL"

**原因**：数据库密码错误或 MySQL 未启动

**解决**：
```bash
# 检查 MySQL 是否运行
mysql -u root -p

# 检查 application-local.yaml 中的密码是否正确
cat src/main/resources/application-local.yaml | grep password

# 重新填入正确密码后重启
```

### 问题 2：前端启动失败 - "Port 5173 already in use"

**原因**：5173 端口被占用

**解决**：
```bash
# 方法 1：杀死占用端口的进程
lsof -i :5173
kill -9 <PID>

# 方法 2：使用其他端口
npm run dev -- --port 5174
```

### 问题 3：生成文章时失败 - "SSE 连接断开"

**原因**：后端 SSE 服务异常

**解决**：
1. 查看后端日志，搜索关键词 "SseEmitter" 或 "ERROR"
2. 重启后端服务
3. 确保 DashScope API Key 有效

### 问题 4：图片一直显示"生成中..."

**原因**：某个图片来源超时或失败

**解决**：
1. 后端日志查看 `ParallelImageGenerator` 日志
2. 禁用某个来源重试（修改 `enabledImageMethods`）
3. 检查网络连接和 API 配额

---

## 📊 性能基准

首次使用时的预期耗时（基准环境）：

| 阶段 | 耗时 | 说明 |
|------|------|------|
| 标题生成 | 2-3s | LLM 调用 |
| 大纲生成 | 5-10s | 流式生成，用户能看到逐字输出 |
| 正文生成 | 10-20s | 流式生成，较耗时 |
| 配图分析 | 1-3s | 快速 |
| 配图生成 | 30-60s | 并行执行，最慢来源决定 |
| 图文合成 | 1-2s | 快速 |
| **总计** | **50-100s** | 取决于配图来源 |

---

## 🎓 下一步学习

启动成功后，建议：

1. **阅读架构设计**：[doc/improve/架构设计.md](./doc/improve/架构设计.md)
2. **理解 Agent 编排**：查看 `agent/ArticleAgentOrchestrator.java`
3. **修改配置**：尝试改变 `enabledImageMethods`，体验降级机制
4. **分析日志**：查看 `agent_log` 表，理解各 Agent 耗时
5. **扩展功能**：尝试新增自定义 Agent（参考现有实现）

---

## 💬 常见问题

**Q: 我想用我自己的模型而不是阿里云的 GLM**

A: 修改以下文件：
- `pom.xml`：更换 Spring AI 依赖
- `application.yaml`：配置新的 API Key 和模型名称
- `*GeneratorAgent.java`：更新 LLM 调用方式

**Q: 我想本地部署，不上云**

A: 可以使用开源模型（如 Llama、Qwen-local）配合本地推理框架，但需要修改后端调用代码。

**Q: 我想修改生成的文章内容**

A: 有两个层面：
- 修改 Prompt：各 `*GeneratorAgent` 中的 systemMessage
- 修改后处理：各 Agent 的 `execute()` 方法中的逻辑

---

## 🆘 需要帮助？

- 查看[后端日志](./target/logs/)诊断错误
- 查看[浏览器 Console](./doc/improve/调试指南.md) 排查前端问题
- 搜索[项目文档](./doc/)中的关键词

祝你使用愉快！🎉
