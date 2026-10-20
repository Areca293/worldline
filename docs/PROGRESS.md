# 实际进度

## M1 完成本地开发与验收（2026-10-20）

**当前阶段：M1 已完成本地验收；M0 的数据库待验收项也已补齐。** 下方较早的
“M0 未验收/环境缺失”记录保留为历史，不代表当前状态。未发布网站或 GitHub 仓库。

### 功能与实现

- 接入 NASA（Technology）、BEA（Economy）、Federal Reserve（Finance）、
  Library of Congress In the Muse（Music）四个官方 RSS。使用范围和限制见
  `CONTENT_SOURCES.md`，默认源属于美国官方机构，尚非全面、多地区新闻覆盖。
- 新增 `seed_sources` / `import_feeds` 手动命令；管理后台可维护来源、分类、
  启用状态和使用说明。已有配置不会被 seed_sources 覆盖。某来源失败时继续
  处理其余来源，并以非零退出码报告失败；现有文章保留。
- GUID/Atom ID + 规范化 URL + PostgreSQL 唯一约束去重；同源导入加数据库锁。
  更新保持文章 ID、slug、首次收录时间及收藏；身份冲突跳过，避免错归来源。
- 标题和 feed 简介转为纯文本，简介限 600 字符；不抓正文/图片/音频、不调用 AI。
  修正了解析库自动将 Atom content 回退为 summary、将 published 回退为 updated
  的行为；缺简介、缺日期时如实为空。DTD/外部实体、非公开地址、重定向被拒绝。
- 首页跨领域交替排序，领域内按原始发布时间降序；详情区分发布、来源更新和收录
  时间。正常信息流默认隐藏 M0 示例，但保留其数据和显式 samples=1 学习接口。
- Django 会话登录/退出，包含匿名登录 CSRF 防护、HttpOnly cookie 和基础登录限流。
  正式账号由本地管理员创建；未添加默认口令、自动创建真实账号或开放注册。
- 收藏/取消收藏/收藏列表保存到 PostgreSQL；服务端始终使用当前用户，前端账号
  切换清理个性化缓存。收藏和个性化文章响应禁用浏览器共享缓存。
- 新增迁移 `0002_bookmark_alter_article_options_and_more`，未重置既有数据库。
- Vite 升到兼容补丁 7.3.7，修复依赖审计报告的问题。新增 feedparser、urllib3、
  defusedxml 与 Playwright，更新锁文件。未换技术栈。

### 实际验证

- 当前 Node 24.21.0、Python 3.12.15、uv 0.12.22、Docker Engine 29.8.1；
  原 `worldline-db-1` PostgreSQL 17.9 容器健康。沙箱外数据库/网络访问通过审批执行。
- 原 M0 基线：迁移无待执行项，seed_demo 连续两次新增 0，原 4 项 pytest 通过。
- M1 迁移成功；真实导入 NASA 10、BEA 47、Federal Reserve 20、LOC 10，共 87 篇。
  首次后的第二次导入新增 0；BEA 一条无有效原文 URL 的条目被安全跳过。
  所有 87 篇都有来源发布时间。旧样例未删除。
- 后端默认测试：**24 passed**，覆盖 RSS/Atom、重复导入、HTML/日期处理、失败隔离、
  网络访问边界、登录/CSRF、限流、刷新会话、跨用户读取/取消收藏隔离及领域排序。
- 前端：**6 passed**，覆盖失败/空数据、登录并收藏/取消、退出后的私人缓存清理、
  请求失败不显示假成功及外链安全。
- 独立数据库浏览器验收：`E2E_BROWSER_CHANNEL=chrome uv run pytest -m browser -q`。
  **1 个 pytest 驱动测试通过，内含桌面和手机两个 Playwright 场景，2 passed**。
  实际操作登录、收藏、刷新、收藏列表、切换第二个账号、返回首账号取消收藏及刷新。
  无页面 JavaScript 错误；手机视口无页面级横向溢出。
- 测试账号和原创测试文章只存在于 Django 自动创建/销毁的测试库；实际核查正常
  数据库中 `browser-test-story` 为 0 条。浏览器截图/报告使用 OS 临时目录。
- 实际 `http://127.0.0.1:5173/api/health/` 返回 connected / M1；文章 API 返回 87 条，
  首页前四条覆盖四个领域且无样例。应用内浏览器已检查真实内容首页。
- Django system check、迁移一致性检查、Ruff、TypeScript/Vite build 通过。
  升级后 npm audit 报告 0 个已知漏洞。

### 使用与边界

- 当前本机前后端已运行，可打开 `http://127.0.0.1:5173`；没有重启或停止用户服务。
- 内容刷新：`cd backend` 后执行 `uv run python manage.py import_feeds`。
- 如尚无账号，运行 `uv run python manage.py createsuperuser`，然后在 Django admin
  创建普通 reader；已有 Django 账号可直接在网站登录。密码只在本地交互输入。
- 当前只有手动更新；没有定时任务、重试队列、最后成功时间面板、站内搜索、AI、
  公开部署或 iOS。基础登录限流为单进程本地缓存，公开部署前需要完善。
- RSS 只提供当前窗口，旧内容不会因某次 feed 缺失而删除。精细时间窗口、更多来源
  和跨来源事件聚合尚未实现。仅经过浏览器手机模拟，真实 iPhone Safari 未验收。
- 下一步按 M2 推进更新调度、搜索、CI、运行日志与 HTTPS 部署，先确定部署范围。
- 学习小任务：修改 `frontend/src/account.tsx` 的收藏按钮文案，观察相关前端与
  浏览器测试为何需要同步调整；不需要改数据库模型。

## Docker Desktop 窗口排查（2026-10-15）

- 本机安装 Docker Desktop 4.93.0（Apple Silicon）；实际查询引擎版本为 29.8.1，
  `docker desktop status` 返回 running。
- 实际 `docker ps` 显示 `worldline-db-1` 为 Up 13 days (healthy)。此前未找到
  Docker / 无数据库服务的环境记录已不代表当前状态；容器健康不等于 Django
  已连接数据库，也不代表迁移、样例导入或完整测试已验收。
- 成功打开并将 Containers 管理窗口置于前台，界面显示 Engine running 和
  worldline 容器组。本次未重启引擎、停止容器、清理数据或更新 Docker。
- 当日日志有 login.docker.com DNS 解析失败导致账号令牌刷新失败的记录，
  尚无证据证明其导致窗口不显示；窗口未自动出现的具体触发原因未确认。
- 本次仅检查 Docker 状态与窗口，未运行前后端测试、PostgreSQL 迁移、两次
  seed_demo 或完整 pytest；M0 数据库验收仍待执行。

### 同日补充：普通入口仍无法唤起窗口

- 用户确认菜单栏没有鲸鱼图标，关闭窗口后点击 Docker.app 仍不能显示界面；
  前述直接打开内部管理程序只是临时恢复窗口，不能视为普通入口已修复。
- 获得用户明确授权后执行完整 Docker Desktop 重启。重启命令成功返回，
  原数据库容器未自动运行，因此启动原有 `worldline-db-1`，随后实际确认
  status=running、health=healthy，Docker Desktop status=running。
- 重启后的 Electron 日志记录 `reason: open-tray`、`name: dashboard`、
  `Creating tray menu` 和 `Determined initial tray icon`；重启前持续运行的
  界面进程参数为 `name=new-license`。此差异提示界面初始化状态值得关注，
  但尚不足以断言具体根因。
- 用户实际复测确认：完整重启后普通 Docker.app 仍无法打开窗口；原入口
  故障未解决，菜单栏图标的可见性也未确认恢复。
- 直接打开内部 `Docker Desktop.app` 可正常唤起管理窗口；已实际关闭窗口
  并重新打开验证。随后在用户桌面创建 `Docker Dashboard.app` 符号链接，
  指向 `/Applications/Docker.app/Contents/MacOS/Docker Desktop.app`，再次
  关闭窗口并通过此快捷入口成功重新打开，显示 Engine running。
- 该快捷入口是已验证的绕行方案，不代表原 Docker.app 或菜单栏故障已根治。
  未清理数据、重装或升级 Docker；若未来更新改变内部程序路径，需重新检查入口。

### 菜单栏设置核查

- 用户补充鲸鱼图标此前被主动隐藏。实际 UI 核查确认：macOS 系统设置 →
  菜单栏 → 允许在菜单栏显示 → Docker 为 off；Docker General 中
  Open Docker Dashboard when Docker Desktop starts 为已勾选，Apply 为禁用。
- 鲸鱼图标不可见有明确的显示设置原因，不能作为 Docker 界面组件损坏的证据。
  该显示开关与再次点击 Docker.app 是否唤起窗口的因果关系未验证。
- 用户明确选择保持隐藏、仅解释检查结果；本轮未更改设置、未重启服务，
  也未执行项目测试。独立 Dashboard 快捷入口仍保留。

## 个人求职文件系统初始化（2026-10-09）

- 按用户要求创建独立的 `job-search/`：4 个子目录、14 个文件。
- README、CHECKLIST 与 ATS 提示已记录访谈顺序、事实约束、投递前审核、
  Applied 后冻结、发送日志、私人薪资和禁止自动提交规则。
- 9 个个人内容文件保持空白；两个 CSV 仅包含用户指定表头，无样例记录。
  尚未收集候选人资料，未生成任何雇主 CV，访谈 DONE 标记尚未设置。
- 实际验证：用 Python 核对目录文件数量、9 个空文件、两份 CSV 的完整列名
  和零数据行，均通过。这是文件结构检查，不是应用或数据库测试。
- 本次仅新增求职文档并记录进度，未运行前后端测试；此前 M0 数据库验收限制不变。
- `docs/PROJECT_CONTEXT.md` 在工作区已有删除改动，本次只读取 Git 中版本了解
  项目范围，未恢复该文件；未改动已有的 `frontend/src/main.tsx` 修改。
- 下一步：只收集第 1 批个人联系信息、目标市场和每日投递目标，然后等待用户继续。

更新：2026-10-02。

## 当前结论

**M0 代码骨架已实现，数据库验收受环境阻塞，M0 尚未完整验收。**
工作名称为 Worldline；未创建远程仓库、公开发布、部署或接入付费服务。

## 已实现

- React + TypeScript + Vite，React Router 首页/详情路由，TanStack Query API 请求。
- 英文界面：重点文章、四领域筛选、详情、参考资源外链，以及加载、空数据、404、错误和重试状态。
- 手机优先的 CSS 布局；原创 CSS 装饰图形，没有外部图片或字体依赖。
- Django 5.2 LTS + DRF；Topic、Source、Article 模型与初始迁移。
- 只读文章、详情、分类 API；Django admin；实际查询数据库的健康检查。
- PostgreSQL Compose 配置，数据库端口仅绑定回环地址，持久化 volume。
- 原创且明确标注的四篇样例；缺失发布日期保留 null；独立收录时间。
- `seed_demo` 使用唯一约束和 get_or_create，重复导入的 PostgreSQL 测试已编写。
- 前端 npm lockfile、后端 uv lockfile、环境变量示例、忽略规则与启动文档。
- 已初始化独立 Git 仓库，分支 `codex/m0-foundation`，避免继承用户主目录的 Git 仓库；尚未提交或发布。

## 环境与验证证据

已找到 VS Code、Git 2.54.0、Xcode 目录。常规 PATH 未找到 Node/npm、uv、Docker；
macOS 系统 Python 是 3.9.6。没有修改系统 Python 或 shell 配置。

本次验证临时使用应用附带的 Node 24.19.0、Python 3.12.14，以及 `work/` 内的
隔离 npm 12.2.0 和 uv 0.12.22。这些路径没有写入项目启动配置；日常开发仍需要
用户安装常规工具。

| 检查 | 实际结果 |
| --- | --- |
| TypeScript + Vite production build | 通过 |
| Frontend Vitest | 3 passed |
| npm dependency audit | 升级 Vitest 后 0 个已报告漏洞；生产依赖审计也为 0 |
| Django system check | 通过，0 issues |
| Ruff check / format check | 通过 |
| pytest 非数据库故障路径 | 2 passed |
| 完整 pytest | 2 passed / 2 setup errors：127.0.0.1:5432 connection refused |
| Vite → Django 实际 HTTP 请求 | 通过代理取得 health/articles 的真实 HTTP 503 和安全 JSON 提示 |
| 数据库成功连接、migrate、seed_demo | 未完成：没有可运行的 PostgreSQL 服务 |
| Docker Compose 启动 | 未运行：未找到 Docker CLI/Desktop；镜像标签已查询存在 |
| 浏览器页面检查 | 使用应用内浏览器检查真实错误页；用独立 UI fixture 检查首页、分类及详情 |
| 响应式检查 | 桌面 1280px 与手机 390px；手机页面宽度未超出视口，分类栏可横向滚动 |
| 真实 iPhone Safari | 未验证 |

尝试用 `work/` 内的临时 PostgreSQL 16.2 工具进行独立验证，但 initdb 因沙箱
禁止共享内存操作失败（`shmget: Operation not permitted`）。没有把数据库换成
SQLite，也没有将这次尝试报告为连接成功。正式本地配置仍使用 PostgreSQL 17.9。

正常 Django runserver 会先检查迁移，因此无数据库时无法启动。本次仅为检查错误
返回而用临时 WSGI 服务加载 Django；该临时启动方式不属于项目日常启动步骤。

完整页面的 UI 检查使用 `work/preview_fixture.py` 独立服务，来自相同的原创样例
文案，未连接数据库。它只验证渲染/交互，不验证 Django 查询、迁移或持久化；其
健康接口明确返回数据库不可用。前端应用本身没有在请求失败时切换样例的代码。
临时预览地址为 `http://127.0.0.1:5174`，仅在该进程运行期间有效。

## 开发产物清理（2026-10-02）

已停止上述临时预览服务，并删除工作区内的临时验证脚本、工具下载与缓存、
临时 PostgreSQL 工具环境、构建输出、TypeScript 增量缓存、Python 字节码、
pytest/Ruff 缓存和 Finder `.DS_Store`。`node_modules` 与 `.venv` 也已删除；
它们可分别通过 `npm ci`、`uv sync --locked` 从保留的锁文件恢复。

源码、正式测试、迁移、配置（含本地 `.env`）、锁文件、正式文档及 `.git` 均保留。
删除前后校验了全部 42 个保留文件的 SHA-256，内容一致；随后仅为记录此次清理
更新本进度文档。现有 `.gitignore` 已覆盖实际生成的项目内产物，无需新增规则。
项目仍无首次提交，正式文件仍显示为 `??`，并非清理遗漏。此次未重新构建或运行
测试，以免重新生成刚清理的产物；之前的验证结果和数据库阻塞状态保持不变。

## 用户需要准备

### 2026-10-02 再次环境诊断

- 确认源码、npm/uv 锁文件与根 `.env` 仍存在；未读取或输出本地密钥。
- 确认 `frontend/node_modules`、`backend/.venv` 缺失；当前 shell 找不到
  Node/npm、uv、Docker、Homebrew 和 code 命令。常见安装位置也未找到相应工具；
  这不排除用户在其他位置或其他 shell 中安装过。
- VS Code 应用存在；默认 `~/.vscode/extensions` 目录没有扩展文件夹，未核查其他
  VS Code 配置档。系统 Python 3.9.6 不满足项目 3.12 要求；Git 2.54.0 可用。
- 添加 `.vscode/settings.json` 与扩展推荐，配置后端解释器默认路径、模块搜索路径、
  pytest 工作目录和前端 TypeScript 路径；这些设置需先恢复依赖才能生效。
- 扩充中文配置指南；README 复制 `.env` 的命令改为仅在文件不存在时执行。
- 本次仅检查环境并补充编辑器配置/文档；未安装系统工具、恢复依赖或运行数据库。
  尚未直接读取编辑器 Problems，不能断言每条红线的来源。
- 本次没有重新执行构建、Django 检查或测试：所需运行工具与依赖缺失。
  上表是此前验证证据，不能当作当前环境已通过验证；M0 数据库验收仍未完成。

安装 Node.js 24 LTS（含 npm）、uv、Docker Desktop（Apple Silicon），启动 Docker
引擎。具体官方链接、版本检查和启动方法见 `GETTING_STARTED_ZH.md` 与根 README。
现有 VS Code 不需要重装。暂不需要 AI 密钥、域名或云服务器。

## 环境就绪后的下一步

1. 从项目根目录执行 `docker compose up -d --wait db`。
2. 从 backend 执行 `uv sync --locked`、`uv run python manage.py migrate`。
3. 执行两次 `uv run python manage.py seed_demo`，确认第二次新建 0 篇。
4. 执行完整 `uv run pytest` 和 `uv run python manage.py makemigrations --check --dry-run`。
5. 启动前后端，确认健康接口为 connected、浏览器能从实际数据库读取四篇样例。
6. 完成后将 M0 状态改为已验收，再进入 M1 的真实 RSS、登录和私有收藏。

## 设计取舍与边界

- 本阶段只有三种内容模型；User 使用 Django 自带模型，Bookmark 留到 M1。
- 样例唯一 URL / slug 保证基础结构；真正 RSS 的 source ID、URL 规范化和导入策略留到 M1。
- 暂无新闻抓取、产品账号/收藏、站内搜索、AI、翻译、定时任务或 iOS 包装。
- 本地开发配置不等于生产部署；生产密钥、安全设置、静态资源、HTTPS 和 CI 在后续阶段处理。
- 原始需求文档保留在本地 docs；公开仓库前需检查其中个人背景并选择许可证。
