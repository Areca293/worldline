# 本地启动与学习路线

M1 已完成本地验收：可以浏览官方 RSS 内容、登录并收藏文章。更新仍需手动执行命令；尚未实现自动更新、AI 或公开部署。

## 你需要准备什么

1. 安装 [Node.js 24 LTS](https://nodejs.org/en/download)，安装包包含 npm。
2. 安装 [uv](https://docs.astral.sh/uv/getting-started/installation/)；不必单独安装 Python，首次 `uv sync` 会按项目版本要求准备 Python 3.12。
3. 安装并启动 [Docker Desktop for Mac](https://docs.docker.com/desktop/setup/install/mac-install/)。这台电脑是 Apple Silicon，选择对应安装包。等待 Docker 引擎就绪。

VS Code、Git 和 Xcode 已找到。Xcode 暂时用不上，也不需要购买云服务或 API 套餐。

安装后打开新的终端，检查：

```sh
node --version
npm --version
uv --version
docker compose version
docker info
```

打开 VS Code 的“Open Folder”，选择 `worldline` 项目文件夹。按根目录 README 的
“First start”操作：先启动数据库，再迁移并导入真实 RSS 内容，然后分别启动后端和前端。
项目已经有本地 `.env`；首次配置示例的复制命令只需在 `.env` 不存在时执行，避免覆盖你后续的修改。

## 历史参考：2026-10-02 编辑器环境排查

以下是当时的诊断。2026-10-20 已确认 Node、uv 和 Docker 可用；不必重复安装。

这次检查确认 `frontend/node_modules` 和 `backend/.venv` 不存在；进度记录说明它们
在上次清理时被删除。源码与两个依赖锁文件仍在，可以恢复依赖，无须重新生成项目。
当前终端 PATH 找不到 Node、npm、uv、Docker；系统 Python 为 3.9.6，而本项目要求
Python 3.12。默认 VS Code 扩展目录没有已安装的扩展文件夹（其他配置档未检查）。

常见提示可以这样区分；以下是排查示例，并非已读取你的 Problems 列表：

| 提示或现象 | 优先检查 |
| --- | --- |
| `Cannot find module 'react'`、JSX 类型错误 | 先恢复前端依赖：`npm ci` |
| `Import "django" could not be resolved` | 先 `uv sync --locked`，再选择后端解释器 |
| 无法解析 `config` 或 `news` | 用 VS Code 打开整个 worldline 文件夹，使用项目设置 |
| `command not found` | 工具尚未安装，或新终端未加载安装后的 PATH |
| `connection refused` / 页面显示 API 错误 | 检查数据库和后端服务，不是靠装编辑器扩展解决 |
| 文件名变色并出现 `U` | Git 尚未跟踪文件，不等于语法错误 |

## 按顺序完成首次配置

### 1. 安装运行工具

使用上方官方链接安装 Node.js **24.x**（macOS 安装包，附带 npm）与 Docker Desktop
**Apple Silicon** 版本。不要同时引入多套 Node 管理器。

uv 可按[官方安装说明](https://docs.astral.sh/uv/getting-started/installation/)在终端执行：

```sh
curl -LsSf https://astral.sh/uv/install.sh | sh
```

安装后退出并重新打开 VS Code，再创建新终端，执行前文五条版本/状态检查。
Node 应显示 `v24.x`；`docker info` 应能显示 Server 信息。Docker 安装完还需要启动应用，
完成首次引导并等待引擎运行。无需单独安装 PostgreSQL 或修改系统 Python。

### 2. 恢复项目依赖

VS Code 使用 File → Open Folder 打开 `/Users/a11/Desktop/worldline`。
在 VS Code 终端按顺序运行：

```sh
cd /Users/a11/Desktop/worldline/frontend
npm ci
cd /Users/a11/Desktop/worldline/backend
uv sync --locked
uv run python --version
```

最后应显示 Python 3.12.x。`npm ci` 按 `package-lock.json` 安装前端依赖；
`uv sync --locked` 按 `uv.lock` 创建后端 `.venv` 并安装依赖。
这些目录可以重新生成，通常不提交 Git。依赖恢复本身不要求数据库已经运行。

### 3. 让 VS Code 使用正确环境

打开扩展面板（⌘⇧X），搜索 `@recommended`，安装本工作区推荐的扩展：

- Microsoft 的 **Python** 和 **Pylance**：Python 环境与代码分析。
- **Ruff**：与项目现有 Python 检查规则对应。
- **Prettier**：可选，用于前端格式化。

React/TypeScript 的基本语言支持由 VS Code 自带，无需额外安装 React 扩展。
当前项目没有 ESLint 配置，暂不需要添加 ESLint 来处理缺失依赖的红线。

打开任意 Python 文件，按 ⌘⇧P，运行 **Python: Select Interpreter**。
如果没有自动选中，使用 Enter interpreter path，选择：

```text
/Users/a11/Desktop/worldline/backend/.venv/bin/python
```

项目 `.vscode/settings.json` 已提供默认环境路径和后端模块搜索路径；如果 VS Code
此前记住了其他解释器，仍需手动切换。详见 [VS Code Python 环境说明](https://code.visualstudio.com/docs/python/environments)。

打开 `.tsx` 文件，运行 **TypeScript: Select TypeScript Version** →
**Use Workspace Version**。完成后可运行 **Developer: Reload Window**。
不要通过关闭类型检查或隐藏诊断来消除红线。

### 4. 初始化数据库

确认 Docker Desktop 已运行，在终端执行：

```sh
cd /Users/a11/Desktop/worldline
test -f .env || cp .env.example .env
docker compose up -d --wait db
cd backend
uv run python manage.py migrate
uv run python manage.py seed_sources
uv run python manage.py import_feeds
uv run python manage.py import_feeds
```

现有 `.env` 会保留。第二次导入应新增 0 篇文章，这用于验证重复运行不会重复插入。
`migrate` 创建/更新数据库表；`seed_sources` 添加已核对的来源；`import_feeds` 手动更新真实内容。
若两次更新期间来源发布了新内容，第二次可以合理新增；相同条目不会重复插入。

### 5. 分别启动前后端

第一个终端运行后端，并保持运行：

```sh
cd /Users/a11/Desktop/worldline/backend
uv run python manage.py runserver 127.0.0.1:8000
```

第二个终端运行前端，并保持运行：

```sh
cd /Users/a11/Desktop/worldline/frontend
npm run dev
```

打开终端显示的前端地址（通常是 http://127.0.0.1:5173）。
数据库在 Docker 中后台运行，前后端分别占用一个终端，这是本项目正常的开发方式。
之后日常启动通常只需要启动数据库和这两个服务，无须每次重新安装依赖或导入样例。

### 6. 验证与进一步排错

前端在 `frontend` 目录执行 `npm test`、`npm run build`；后端在 `backend` 目录
执行 `uv run python manage.py check`、`uv run pytest`。完整验证命令见根 README。
健康接口 http://127.0.0.1:8000/api/health/ 应返回 `database: connected`；还应确认
首页能显示带来源和发布日期的真实内容，原有 Sample 文章默认隐藏。

若仍有红线，打开 View → Problems（⌘⇧M），保留前几条的文件名、完整错误文字及
来源（例如 TypeScript / Pylance），逐条排查。编辑器提示和终端测试结果都需要看；
过去构建通过不能证明当前环境已经配置完成。

## 三个部分怎么合作

- **React**：负责显示页面。点击分类后，它向 `/api/articles/?topic=music` 请求文章。
- **Django**：处理请求，读取 PostgreSQL，然后返回 JSON。前端不会直接访问数据库。
- **PostgreSQL**：保存来源、分类和文章。关闭浏览器后数据仍然存在。

开发时 Vite 把 `/api/` 请求转发到 Django，所以浏览器只需要使用前端地址。
TanStack Query 管理请求的加载、缓存和失败状态；React Router 管理首页和详情页路径。

M1 的登录使用 Django 会话，收藏保存到 PostgreSQL，每条收藏都绑定登录用户。
创建管理员：在 `backend` 执行 `uv run python manage.py createsuperuser`；随后可在
http://127.0.0.1:8000/admin/ 的 Users 中创建非 staff 的普通账号。已有账号无需重建。
网站右上角 Sign in 使用这些账号登录，Save story 保存，Saved stories 查看。
读者也可点击独立 Register 入口，用用户名、邮箱和密码自行注册；成功后自动登录。
邮箱验证与密码找回尚未实现。不要把真实密码写进源码、文档或 Git；没有默认测试账号。

桌面/手机视口的完整浏览器测试：先准备 Playwright Chromium 或已安装的 Chrome，
在 `backend` 执行 `E2E_BROWSER_CHANNEL=chrome uv run pytest -m browser -q`。
测试使用单独数据库，自动清理，不会改动你的收藏。

## 一个可以自己做的小修改

在 `frontend/src/account.tsx` 中找到 `Save story`，改成你喜欢的英文按钮文案。
保存后观察页面，再解释：为什么改文案不影响数据库收藏？哪些前端/浏览器测试也需要同步调整？

下一步尝试在 `frontend/src/styles.css` 中修改 `--accent` 的颜色。修改后运行
`npm run build`，确认页面仍然可以编译。

## 验收标准

已验收：首页显示真实内容；分类只显示对应内容；详情显示来源时间并能跳转原文；
刷新后收藏仍在；其他账号看不到或删不了你的收藏；相同 RSS 重复导入新增 0；前后端及浏览器测试通过。
手机浏览器视觉检查和真实 iPhone Safari 测试是两件事，后者还没做。
