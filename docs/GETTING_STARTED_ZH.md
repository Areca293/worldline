# 本地启动与学习路线

这是 M0 的代码骨架，尚未完成 PostgreSQL 的运行验收；目前不是实时新闻产品。

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
“First start”操作：先启动数据库，再迁移并导入样例，然后分别启动后端和前端。
项目已经有本地 `.env`；首次配置示例的复制命令只需在 `.env` 不存在时执行，避免覆盖你后续的修改。

## 2026-10-02 环境检查：为什么编辑器会飘红

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
uv run python manage.py seed_demo
uv run python manage.py seed_demo
```

现有 `.env` 会保留。第二次导入应新增 0 篇文章，这用于验证重复运行不会重复插入。
`migrate` 是根据代码创建/更新数据库表，`seed_demo` 是导入明确标记的学习样例。

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
首页能显示四篇 Sample 文章。

若仍有红线，打开 View → Problems（⌘⇧M），保留前几条的文件名、完整错误文字及
来源（例如 TypeScript / Pylance），逐条排查。编辑器提示和终端测试结果都需要看；
过去构建通过不能证明当前环境已经配置完成。

## 三个部分怎么合作

- **React**：负责显示页面。点击分类后，它向 `/api/articles/?topic=music` 请求文章。
- **Django**：处理请求，读取 PostgreSQL，然后返回 JSON。前端不会直接访问数据库。
- **PostgreSQL**：保存来源、分类和文章。关闭浏览器后数据仍然存在。

开发时 Vite 把 `/api/` 请求转发到 Django，所以浏览器只需要使用前端地址。
TanStack Query 管理请求的加载、缓存和失败状态；React Router 管理首页和详情页路径。

M0 不含产品用户登录、收藏、真实 RSS 或 AI。这些功能不会用假按钮或假结果冒充已完成。

## 一个可以自己做的小修改

在 `frontend/src/App.tsx` 中找到 `A wider world.`，把它改成你自己的英文标题。
保存后查看浏览器自动刷新，再尝试解释：为什么改标题不用修改 Django 或数据库？

下一步尝试在 `frontend/src/styles.css` 中修改 `--accent` 的颜色。修改后运行
`npm run build`，确认页面仍然可以编译。

## 验收标准

数据库就绪后：首页显示四篇 Sample 文章；分类只显示对应内容；详情页能打开参考链接；
页脚显示数据库已连接；重复执行 `seed_demo` 不增加记录；前后端测试通过。
手机浏览器视觉检查和真实 iPhone Safari 测试是两件事，后者还没做。
