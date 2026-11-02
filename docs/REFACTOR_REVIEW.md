# 有边界的架构重构：交付与审查记录

实施日期：2026-10-31；提交恢复更新：2026-11-01。起点实际核对为 `main` / `9b513dc`，工作区干净；没有子目录 AGENTS.md。
最终源码职责和扩展规则见 [ARCHITECTURE.md](ARCHITECTURE.md)。这次只整理业务边界，
保留原 API/页面/数据行为、依赖版本、配置、模型、迁移及三种受支持的模型供应商。

## 阶段与实际结果

| 阶段 | 范围与验证 | 本地提交状态 |
| --- | --- | --- |
| 基线与方案 | 读说明/源码/CI；前端 18、后端 289；浏览器与 Redis/Celery 均通过 | 最初受限，后经正式授权创建专用分支 |
| 前端 | 迁移页面、账号/收藏、AI/名句/来源与通用 HTTP；新增边界用例；41 项、构建、浏览器通过 | `a183b57` |
| AI | 按协议职责拆 provider，迁移实际 patch 点；207 项专项通过 | `bd0274d` |
| 新闻 | 单向导入依赖、查询模块、中立错误边界；新闻专项 94 项通过，公共错误 6 项随后进入全量 | `9635dd7` |
| 综合与文档 | 前端 41、后端 307、浏览器 34 场景、Redis/Celery、静态检查及 Docker 构建通过 | 本文所在文档提交，Hash 见 git log |

没有用历史结果代替本轮验证。默认、浏览器和集成数据库套件严格顺序执行。

## 前后对应与清理依据

| 旧位置 | 新位置/复用点 | 保持与删除依据 |
| --- | --- | --- |
| App.tsx 的布局/页面/卡片 | app、reading、bookmarks、ui、sources；App 只组合路由 | 原 JSX/英文文案保留；各路由和页面调用方、测试均直接导入新模块 |
| account.tsx 的 Session/认证/收藏 | account 与 bookmarks/BookmarkButton | 收藏依赖 Session 和 Article 类型；不再由认证文件承载整个阅读动作 |
| Login/Register 两份 next 正则 | account/redirect.safeNextPath | 两个实现规则相同，两个调用方均已替换；20 项允许/拒绝边界测试，加原登录与浏览器注册流程 |
| assistance.tsx | assistance 的页面、requests、Result、types；quotes/DailyQuote | 两类 Mutation 的 key/retry/gcTime/onSettled 相同，提取 useAssistanceRequest；表单重置仍各自明确 |
| api.ts | lib/http、lib/presentation、reading/types、account/types；Health 留 sources | HTTP 不依赖业务页面/类型；写入只读取 CSRF 字段，运行时行为不变 |
| discovery/pagination/repositories | reading 的原搜索/分页/Star 实现，sources、app/OfflineNotice | 直接迁移复用，没有新增第二套实现；三个原 CSS 文件未动 |
| providers.py | providers 包的调度/配置/协议/传输/契约/校验 | 所有命令、服务、测试/patch 改到实际模块；20 个搬迁定义 AST 一致，12 个完整请求/config 指纹一致 |
| news.views.DatabaseErrorMixin | config/api.py | news/auth/assistance 的真实多方使用者；六项实际 API 503/脱敏回归，不再跨业务依赖 View 文件 |
| news.views 查询 | news/queries.py | View 保持权限、Serializer 和分页，查询返回 QuerySet/近似标志；已有搜索/排序/私人列表测试保留 |
| feeds 的共享导入类型/文本函数 | news/import_support.py | feeds、repositories、images、ingestion、tasks、命令和测试已迁移；移除三处循环依赖所需的局部导入 |

删除的根级前端旧文件及 providers.py 都是迁移后无必要的旧承载文件，不是删除功能。
没有保留转发层来维持旧测试 patch 路径。删除的其余 import 均是迁移后未使用的 import，
由 TypeScript/Ruff 和引用检查确认。未删除历史文档、模型索引、迁移、动态注册任务、
未启用 provider、安全/失败分支或原测试断言。不同语义的 URL/文本处理函数未合并。

## 验证明细

| 命令/检查 | 基线 | 最终 |
| --- | --- | --- |
| frontend: npm test | 18 passed | 41 passed（5 个文件） |
| frontend: npm run build | 通过 | 通过 |
| 本轮 frontend 文件 Prettier --check | 未额外运行 | 通过，沿用 frontend/.prettierrc.json |
| backend: uv run python manage.py check | 通过 | 通过 |
| backend: uv run python manage.py makemigrations --check --dry-run | No changes；沙箱下附数据库连接警告 | 授权执行 No changes detected，无该警告 |
| backend: uv run ruff check . | 通过 | 通过 |
| backend: uv run ruff format --check . | 71 files | 85 files，全通过 |
| backend: uv run pytest | 289 passed、2 deselected | 307 passed、2 deselected |
| E2E_BROWSER_CHANNEL=chrome uv run pytest -m browser -q | 1 passed、290 deselected | 1 passed、308 deselected（34 个 Chrome 桌面/手机场景） |
| TEST_REDIS_URL=redis://127.0.0.1:6379/15 uv run pytest -m integration -q | 1 passed、290 deselected | 1 passed、308 deselected |
| docker build --target web -t worldline-refactor-check . | 未运行 | 本机成功；对齐 CI web target，不启动或部署容器 |
| git diff --check | 通过 | 通过 |

本机 uv 默认缓存目录写入受限，实际命令使用 `UV_CACHE_DIR=/tmp/worldline-uv-cache`。
首次默认 pytest 在沙箱内为 198 passed / 91 PostgreSQL 初始化 errors；browser/integration
也在测试库连接前失败。通过工具的 require_escalated 正常授权后，以上套件均在真实本机
PostgreSQL 隔离测试库通过。Docker 首次受 socket 权限限制，授权构建后成功。这些是执行
环境限制，不是应用断言失败；没有换 SQLite、mock 数据库或覆盖业务数据。

中间开发失败已修正：前端提取函数的参数引用及 return 换行；AI 测试迁移后 fixture/
局部 evidence 名称与模块冲突；共享常量初次提取时重复定义。旧测试分别捕获这些问题，
未降低断言或删用例。最终没有遗留失败。新增 assistance 自动 fixture 阻止未 mock 的
urllib3 provider HTTP，避免 patch 路径迁移错误导致付费请求。

真实数据库/队列与 synthetic 内容明确分开：数据库断言使用隔离 PostgreSQL，队列测试
使用真实 Redis 和 worker、原创 RSS fixture；模型/Brave 回复全部 mock。Chrome 覆盖路由、
URL 恢复、搜索分页、账号/CSRF、私人收藏、AI 状态/失败、图片失败、四宽度、键盘及 reduced
motion。抽看本轮首页和 Research 截图；27/38 张与基线字节一致，其余不作为严格像素验收
（日期/动态内容和截屏时序可能不同）。CSS 构建哈希与基线一致，原样式和 main.tsx 字节未变。

未运行：真实模型/Brave/收费调用、真实发布商手动导入、生产数据内容验收、iPhone Safari
真机验收和远端 CI。默认 debug_relay 预览及 send 分支由 mock 自动测试覆盖；未执行真实
`--send`。未修改 .env、模型权重、普通业务库或生产服务；未 push、创建 PR、合并或部署。

## 本地分支和可审查提交

已通过正式权限申请完成分支创建与本地提交。当前分支为
`refactor/modularize-frontend-backend`，main 保持 `9b513dc`。前三阶段依次为
`a183b57`、`bd0274d`、`9635dd7`；本文件归入第四个文档提交。

最初普通沙箱创建分支返回 `cannot lock ref ... unable to create directory`；用户要求
重试后，以 require_escalated 正常授权写入 Git 成功。恢复时未重复已完成的前两次提交。
本次复核前端 41 项、构建、后端 307 项、Django/Ruff 和 diff 检查通过；没有改业务源码，
没有重复浏览器、Redis/Celery、迁移或 Docker 测试，也未把此前结果称为新执行结果。

恢复时出现三个额外的未暂存文档删除：CONTENT_EXPANSION.md、M2_PLAN.md、M3_PLAN.md。
它们不属于下列提交分组，保持原状态，未恢复或提交。因此本次提交完成不代表工作区干净。

以下保留精确文件分组命令作为审查记录，**已完成后不要重复执行**。第二组先提供 config/api
供 assistance 使用，第三组再迁移 news 调用方和公共 API 测试。未 push、合并或部署。

```sh
cd /Users/a11/Desktop/worldline
git status --short
git branch --show-current
git rev-parse --short HEAD
git diff --check
git switch -c refactor/modularize-frontend-backend
```

### 前端功能边界

```sh
git add -- \
  frontend/src/App.test.tsx \
  frontend/src/App.tsx \
  frontend/src/account.tsx \
  frontend/src/account/AccountNav.tsx \
  frontend/src/account/Login.tsx \
  frontend/src/account/Register.tsx \
  frontend/src/account/feedback.ts \
  frontend/src/account/redirect.test.ts \
  frontend/src/account/redirect.ts \
  frontend/src/account/session.test.tsx \
  frontend/src/account/session.ts \
  frontend/src/account/types.ts \
  frontend/src/api.ts \
  frontend/src/app/Layout.tsx \
  frontend/src/app/OfflineNotice.tsx \
  frontend/src/assistance.test.tsx \
  frontend/src/assistance.tsx \
  frontend/src/assistance/ReadingAssistance.tsx \
  frontend/src/assistance/Research.tsx \
  frontend/src/assistance/Result.tsx \
  frontend/src/assistance/requests.ts \
  frontend/src/assistance/types.ts \
  frontend/src/bookmarks/BookmarkButton.tsx \
  frontend/src/bookmarks/SavedStories.tsx \
  frontend/src/discovery.tsx \
  frontend/src/lib/http.ts \
  frontend/src/lib/presentation.ts \
  frontend/src/pagination.tsx \
  frontend/src/quotes/DailyQuote.tsx \
  frontend/src/reading/ArticleCard.tsx \
  frontend/src/reading/Detail.tsx \
  frontend/src/reading/Home.tsx \
  frontend/src/reading/SearchStories.tsx \
  frontend/src/reading/pagination.tsx \
  frontend/src/reading/repositories.tsx \
  frontend/src/reading/types.ts \
  frontend/src/repositories.test.tsx \
  frontend/src/repositories.tsx \
  frontend/src/sources/SourceStatus.tsx \
  frontend/src/ui/ContentNotice.tsx
git diff --cached --check
git diff --cached --stat
git diff --cached --find-renames
git commit -m "refactor(frontend): organize reading and account features"
```

### AI 供应商协议与中立错误基础设施

```sh
git add -- \
  backend/assistance/management/commands/debug_relay.py \
  backend/assistance/providers.py \
  backend/assistance/providers/__init__.py \
  backend/assistance/providers/brave.py \
  backend/assistance/providers/chat.py \
  backend/assistance/providers/configuration.py \
  backend/assistance/providers/errors.py \
  backend/assistance/providers/evidence.py \
  backend/assistance/providers/openai.py \
  backend/assistance/providers/prompts.py \
  backend/assistance/providers/transport.py \
  backend/assistance/services.py \
  backend/assistance/tests/conftest.py \
  backend/assistance/tests/test_assistance.py \
  backend/assistance/tests/test_debug_relay.py \
  backend/assistance/tests/test_local_provider.py \
  backend/assistance/tests/test_provider_contracts.py \
  backend/assistance/tests/test_relay_provider.py \
  backend/assistance/views.py \
  backend/config/api.py
git diff --cached --check
git diff --cached --stat
git diff --cached --find-renames
git commit -m "refactor(assistance): separate provider transport and validation"
```

### 新闻查询、导入及公共错误调用方

```sh
git add -- \
  backend/config/test_api.py \
  backend/news/auth.py \
  backend/news/feeds.py \
  backend/news/images.py \
  backend/news/import_support.py \
  backend/news/ingestion.py \
  backend/news/management/commands/import_feeds.py \
  backend/news/queries.py \
  backend/news/repositories.py \
  backend/news/tasks.py \
  backend/news/tests/test_feeds.py \
  backend/news/tests/test_ingestion.py \
  backend/news/tests/test_repositories.py \
  backend/news/tests/test_worker.py \
  backend/news/views.py
git diff --cached --check
git diff --cached --stat
git diff --cached --find-renames
git commit -m "refactor(news): clarify query and ingestion dependencies"
```

### 架构说明与验证记录

```sh
git add -- \
  README.md \
  docs/ARCHITECTURE.md \
  docs/GETTING_STARTED_ZH.md \
  docs/PROGRESS.md \
  docs/REFACTOR_REVIEW.md
git diff --cached --check
git diff --cached --stat
git diff --cached --find-renames
git commit -m "docs: document module boundaries and refactor validation"
```

提交前可按上表重跑对应阶段检查。合并前在真实分支上顺序重跑完整 CI 命令；检查工作区
和 .env 忽略状态，再由用户自行 push/创建 PR。提交后回退可用正常 git revert 按逆序撤销；
无数据库迁移需要回滚。不要 reset --hard、改写历史或修改归档分支。

## English PR draft

Title: `refactor: clarify frontend features and backend service boundaries`

Description:

Worldline's root frontend modules mixed routing, reading pages, authentication,
bookmarks and assistance. Provider HTTP, prompts and response validation also shared
one backend module, while news adapters and API error handling crossed module boundaries.

Organize the frontend by reader task, share the existing safe redirect and explicit
assistance mutation policies, and keep the application entry point and styles intact.
Separate provider configuration, transport, evidence contracts, Chat Completions and
OpenAI Responses without changing prompts, request parameters or cache fingerprints.
Move reader-scoped queries and shared import primitives into focused news modules,
and place common database/cache API errors in neutral infrastructure. Preserve APIs,
sessions, private caches, quotas, source locks, import identities and task registration.

Validation on the final local working tree: 41 frontend tests, TypeScript/Vite build,
changed-file Prettier, 307 backend tests, Django checks, migration consistency, Ruff,
34 desktop/mobile Chrome scenarios, real Redis/Celery fixture integration and the CI
Docker web target all pass. Twelve request/configuration fingerprints match the
pre-refactor baseline. Existing behavior tests remain; new tests cover redirects,
private-cache cancellation, reading-state resets, strict provider boundaries and
shared safe API errors. See docs/REFACTOR_REVIEW.md for exact runs and environment notes.

Provider replies and imported test content are synthetic; PostgreSQL and Redis tests
use isolated real services. No paid requests, live content import, device acceptance
or deployment was performed. Remote CI has not been run. Initial sandbox restrictions on Git writes were resolved through explicit approval;
the refactor is organized into four local commits on its dedicated branch. There are no schema, dependency, environment or stylesheet changes.

Review risks: moved Python import/patch paths, account-scoped cache cleanup, and CSS
load order. These have focused regression coverage; external scripts importing the
old internal modules must migrate to the documented owners.

## 不属于本轮的技术债

- 真实 Relay 的 Schema/事实/翻译/费用验收仍待独立授权；结构化校验不是语义事实核验。
- 生产 Compose 的 AI 环境变量传递与 Gunicorn 超时匹配问题已在历史运维记录中指出，
  本轮不顺手调整部署设置。公网服务器/域名、真机 iPhone、邮件验证/找回密码仍待后续。
- 大集合 All 的加载成本、近似搜索扩展与源码查询性能需要真实规模测量，未引入新查询引擎。
- query key 字符串维持原样；新增私人查询时仍须同步维护账号清理集合。若范围明显增长，
  再单独评审统一 keys，而非本轮引入新缓存契约。
- providers/evidence 仍只做确定性结构/引用校验；services 保持完整锁/额度/缓存流程，
  将来拆分应先明确连接与事务所有权，不能以降低行数作为理由。
