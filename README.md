# AI Resume Optimizer

`Next.js + Prisma + PostgreSQL + OpenAI-compatible providers` 的简历优化工具。

## 当前能力

- 邮箱 / 密码注册登录
- 邮箱验证、忘记密码、重置密码
- HttpOnly Cookie 会话
- 自定义兼容供应商支持 `Responses API` / `Chat Completions` 协议切换
- 简历上传与文本提取（`pdf` / `docx` / `txt` / `md`）
- 异步分析任务、任务列表、任务详情、失败重试
- 结果页展示、Markdown 导出、求职邮件摘要复制、浏览器打印 PDF
- 用户级 Provider Profile 保存
- 分析任务配置加密快照
- PostgreSQL 本地开发环境

## 主要目录

- `src/app/page.tsx`：登录后仪表盘首页
- `src/app/upload/page.tsx`：上传与发起分析
- `src/app/tasks/page.tsx`：任务列表
- `src/app/history/page.tsx`：历史结果
- `src/app/result/[id]/page.tsx`：结果详情
- `src/app/verify-email/page.tsx`：邮箱验证页
- `src/app/forgot-password/page.tsx`：忘记密码页
- `src/app/reset-password/page.tsx`：重置密码页
- `src/app/api/*`：接口路由
- `src/lib/*`：认证、限流、存储、AI、加密、安全能力
- `prisma/schema.prisma`：数据模型

## 本地启动

1. 安装依赖

```bash
npm install
```

2. 复制环境变量

```bash
copy .env.example .env
```

3. 启动本地 PostgreSQL

```bash
npm run db:up
```

4. 初始化数据库

```bash
npx prisma migrate dev
npx prisma generate
```

5. 启动开发服务

```bash
npm run dev
```

## 关键环境变量

- `DATABASE_URL`
- `APP_ORIGIN`
- `EMAIL_DELIVERY_MODE`
- `EMAIL_FROM`
- `EMAIL_OUTBOX_DIR`
- `EMAIL_VERIFICATION_TOKEN_TTL_HOURS`
- `PASSWORD_RESET_TOKEN_TTL_MINUTES`
- `AI_PROVIDER`
- `OPENAI_API_KEY`
- `OPENROUTER_API_KEY`
- `AI_COMPATIBLE_API_KEY`
- `ANALYSIS_TASK_ENCRYPTION_KEY`
- `ANALYSIS_TASK_TIMEOUT_MS`
- `ANALYSIS_TASK_MAX_ATTEMPTS`
- `TASK_GUARD_SECRET`
- `STORAGE_DRIVER`
- `LOCAL_STORAGE_DIR`

## 邮件能力

- 当前默认使用本地 outbox 投递邮件：`EMAIL_DELIVERY_MODE=file`
- 邮件会写入 `storage/email-outbox`
- 适合本地开发验证注册、邮箱验证、重置密码链路
- 生产环境可在后续接入 SMTP / SES / Resend 等真实邮件服务

## 限流策略

当前为单进程内存限流，后续可升级到 Redis / Upstash。

- `POST /api/auth/login`：按 IP 每分钟最多 `10` 次
- `POST /api/auth/password/forgot`：按 IP 每 `15` 分钟最多 `5` 次
- `POST /api/auth/password/reset`：按 IP 每小时最多 `10` 次
- `POST /api/upload`：按用户每分钟最多 `5` 次
- `POST /api/analyze`：按用户每小时最多 `10` 次
- `POST /api/auth/verify-email/send`：按用户每小时最多 `3` 次

超限后返回：

- HTTP `429`
- `Retry-After`
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

## 任务超时守卫

- 任务进入 `processing` 时会生成独立的 `processingToken`
- 超过 `ANALYSIS_TASK_TIMEOUT_MS` 会被判定为超时
- 超时任务会自动重新排队，最多尝试 `ANALYSIS_TASK_MAX_ATTEMPTS` 次
- 达到最大尝试次数后，任务会被标记为 `failed`
- 旧执行实例晚到回写时，不会覆盖新尝试结果

可供外部 Cron 调用的恢复接口：

- `GET /api/internal/tasks/recover`
- `POST /api/internal/tasks/recover`

鉴权方式：

- `Authorization: Bearer <TASK_GUARD_SECRET>`
- `x-task-guard-secret: <TASK_GUARD_SECRET>`

如果 `TASK_GUARD_SECRET` 未配置，则仅在非生产环境允许直接访问。

## CSRF 防护

- 浏览器写接口会校验 `Origin` / `Referer`
- 校验目标为当前请求源，以及可选的 `APP_ORIGIN`
- 建议在反向代理、CDN、生产域名场景下显式配置 `APP_ORIGIN`
- 已保护登录、注册、退出登录、上传、分析、任务重试、Provider 配置保存 / 删除、结果删除、验证邮箱、忘记密码、重置密码
- 缺少 `Origin` 和 `Referer` 时返回 HTTP `403`，错误码为 `CSRF_ORIGIN_REQUIRED`
- 来源不匹配时返回 HTTP `403`，错误码为 `CSRF_ORIGIN_INVALID`

## 常用命令

```bash
npm run lint
npm run typecheck
npm run build
npm run db:logs
npm run db:down
```

## 数据库迁移说明

- 旧 SQLite 数据备份：`prisma/sqlite-backup/`
- 旧 SQLite migrations 归档：`prisma/migrations_sqlite_archive/`
- 当前开发数据库：PostgreSQL

## 当前限制

- 任务执行仍是进程内异步执行，不是独立 Worker
- 已有任务超时守卫，但生产环境仍建议升级到独立 Worker / Queue
- 文件存储仍是本地目录，不是对象存储
- 部分第三方兼容供应商即使切到 `chat_completions`，也可能仍不支持 `json_schema` 结构化输出
- 真实邮件供应商、SSE 流式进度、S3 / MinIO 仍未完成

## 下一步建议

按优先级建议继续做：

1. Worker / Queue 化任务处理
2. SSE 流式分析进度
3. S3 / MinIO 对象存储
4. 真实邮件供应商接入

## 2026-04 基础设施升级

- 分析任务已切到 `BullMQ + Redis` 队列
- 新增独立 Worker 启动命令：`npm run worker`
- API 限流已切到 Redis，不再是单进程内存限流
- 文件存储已升级为双驱动：`local` / `s3`
- 会话已支持滑动过期

## 本地开发更新

1. 启动基础依赖：

```bash
npm run db:up
```

2. 启动 Web：

```bash
npm run dev
```

3. 启动分析 Worker：

```bash
npm run worker
```

## 新增关键环境变量

- `REDIS_URL`
- `ANALYSIS_QUEUE_NAME`
- `ANALYSIS_TASK_WORKER_CONCURRENCY`
- `SESSION_DURATION_DAYS`
- `SESSION_REFRESH_THRESHOLD_HOURS`
- `S3_ENDPOINT`
- `S3_REGION`
- `S3_BUCKET`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_FORCE_PATH_STYLE`

## 当前剩余高优先级

- 结果页顶部操作区与建议优先级
- 上传页步骤条与 JD 大输入框
- 侧边栏导航 / 面包屑
- SSE 状态流
