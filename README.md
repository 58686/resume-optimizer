# AI 简历优化器

基于 AI 的简历分析与面试准备工具，支持关键词匹配评分、优化建议、面试题生成、版本对比等功能。

## 功能特性

### 简历分析
- 上传简历（PDF / DOCX / TXT / MD）并提取文本
- 对照目标职位描述，AI 打分（0–100）并给出详细分析
- 命中关键词 / 缺失关键词 / 优化建议 / 项目改写 / 总结改写
- 异步任务队列处理，实时进度可视化（8 个阶段）

### 关键词改写示例
- 针对每个缺失关键词，AI 生成可直接套用的简历描述句
- 一键复制，粘贴到对应工作经历

### 面试准备
- 生成 35–50 道个性化面试题，覆盖六大维度：
  - HR 面试 / 技术基础 / 项目深挖 / 行为面试 / 系统设计 / 开放性问题
- 附参考答案与回答要点
- 按分类 / 难度筛选，支持导出 Markdown / Word / PDF
- 支持从职位页面 URL 自动抓取 JD

### 历史与版本对比
- 历史分析记录，支持搜索 / 排序 / 标星
- 选择两条记录对比：分数变化、关键词已补齐 / 新增 / 仍缺失 / 新缺口

### 账户与安全
- 邮箱 / 密码注册登录，HttpOnly Cookie 会话
- 邮箱验证、忘记密码、重置密码
- CSRF 防护，Redis 限流
- 分析任务配置加密存储

### AI 供应商
支持自由切换，每个用户可保存多套配置：

| 供应商 | 说明 |
|--------|------|
| OpenAI | GPT-4.1 / GPT-4o 等 |
| OpenRouter | 聚合多模型路由 |
| Google Gemini | Gemini 2.5 Flash 等 |
| Anthropic | Claude 系列 |
| NVIDIA NIM | Llama 等开源模型 |
| 自定义兼容接口 | 任何 OpenAI 兼容端点 |

## 技术栈

| 层次 | 技术 |
|------|------|
| 前端 / 后端 | Next.js 15 (App Router) |
| 数据库 | PostgreSQL + Prisma ORM |
| 任务队列 | BullMQ + Redis |
| 文件存储 | 本地目录 或 S3 兼容存储 |
| AI 调用 | OpenAI SDK（兼容多供应商） |
| 样式 | Tailwind CSS，多主题支持 |
| 部署 | Docker Compose |

## 快速部署（Docker）

无需预先配置环境变量，AI API Key 在页面内配置。

```bash
git clone https://github.com/58686/resume-optimizer.git
cd resume-optimizer
docker compose up -d --build
```

打开 `http://localhost:3000`，注册账号后在 **AI 配置** 页面填入你的 API Key 即可使用。

### 生产环境部署

只需在启动前设置两个关键变量：

```bash
APP_ORIGIN=https://your-domain.com \
ANALYSIS_TASK_ENCRYPTION_KEY=$(openssl rand -hex 32) \
docker compose up -d --build
```

### Docker 服务说明

| 服务 | 作用 |
|------|------|
| `postgres` | PostgreSQL 数据库 |
| `redis` | 任务队列 + 限流 |
| `migrate` | 启动时自动执行数据库迁移（运行一次） |
| `web` | Next.js Web 服务（端口 3000） |
| `worker` | BullMQ 后台分析 Worker |

数据通过 Docker Volume 持久化，重启不丢失。

## 本地开发

### 前置要求

- Node.js 20+
- Docker（用于启动 PostgreSQL 和 Redis）

### 启动步骤

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
copy .env.example .env   # Windows
# cp .env.example .env   # macOS / Linux

# 3. 启动 PostgreSQL 和 Redis
npm run db:up

# 4. 初始化数据库
npx prisma migrate dev

# 5. 启动 Web 服务
npm run dev

# 6. 启动分析 Worker（新开一个终端）
npm run worker
```

访问 `http://localhost:3000`

### 常用命令

```bash
npm run dev          # 启动开发服务
npm run worker       # 启动分析 Worker
npm run build        # 构建生产版本
npm run lint         # ESLint 检查
npm run typecheck    # TypeScript 类型检查
npm run db:up        # 启动 Docker 基础服务
npm run db:down      # 停止 Docker 基础服务
npm run db:logs      # 查看数据库日志
```

## 环境变量说明

完整示例见 `.env.example`。

### 基础配置

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DATABASE_URL` | PostgreSQL 连接字符串 | — |
| `REDIS_URL` | Redis 连接地址 | `redis://127.0.0.1:6379` |
| `APP_ORIGIN` | 应用访问地址（用于 CSRF 和邮件链接） | `http://localhost:3000` |
| `ANALYSIS_TASK_ENCRYPTION_KEY` | 任务配置加密密钥（生产环境必改） | — |

### 邮件配置

| 变量 | 说明 |
|------|------|
| `EMAIL_DELIVERY_MODE` | `file`（写入本地文件）或 `smtp` |
| `EMAIL_FROM` | 发件人地址 |
| `EMAIL_OUTBOX_DIR` | file 模式的输出目录（默认 `storage/email-outbox`） |

开发时使用 `file` 模式，邮件内容会写入 `storage/email-outbox`，直接打开文件即可查看验证链接。

### 文件存储

| 变量 | 说明 |
|------|------|
| `STORAGE_DRIVER` | `local` 或 `s3` |
| `LOCAL_STORAGE_DIR` | 本地存储目录（默认 `storage`） |
| `S3_ENDPOINT` | S3 兼容端点（MinIO 等） |
| `S3_BUCKET` | 存储桶名称 |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | 访问凭证 |

## 限流策略

基于 Redis，超限返回 HTTP 429 并附带 `Retry-After` 响应头。

| 接口 | 限制 |
|------|------|
| 登录 | 每 IP 每分钟 10 次 |
| 忘记密码 | 每 IP 每 15 分钟 5 次 |
| 重置密码 | 每 IP 每小时 10 次 |
| 文件上传 | 每用户每分钟 5 次 |
| 发起分析 | 每用户每小时 10 次 |
| 关键词改写示例 | 每用户每小时 20 次 |
| 发送验证邮件 | 每用户每小时 3 次 |

## 项目结构

```
src/
├── app/                  # Next.js 页面和 API 路由
│   ├── api/              # 后端接口
│   ├── compare/          # 版本对比页
│   ├── history/          # 历史记录页
│   ├── interview-prep/   # 面试准备页
│   ├── result/[id]/      # 分析结果页
│   ├── tasks/            # 任务列表页
│   └── upload/           # 上传页
├── components/           # React 组件
├── lib/                  # 核心逻辑（AI、认证、限流、存储等）
├── types/                # TypeScript 类型定义
└── worker/               # BullMQ 分析 Worker
prisma/
├── schema.prisma         # 数据模型
└── migrations/           # 数据库迁移文件
docker/
└── entrypoint.sh         # Docker 启动脚本
```

## License

MIT
