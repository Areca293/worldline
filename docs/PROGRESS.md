# 实际进度

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
