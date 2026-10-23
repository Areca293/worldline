# 实际进度

## 管理端会话隔离与错字搜索修复（2026-10-23）

- 本轮拆分为两个独立提交：先隔离管理端登录，再改进单词内部错字匹配。
- 阶段 1 完成：`/admin/` 使用独立 session/CSRF Cookie，保留 Django 原生验证、
  轮换、过期与安全属性；用户端保持既有 Cookie。两端登录、退出不会替换另一端账号，
  管理端登录不会使用户端已加载页面的收藏 CSRF 凭证失效。无数据库迁移或数据清理。
- 验证：认证相关后端 **14 passed**；浏览器驱动 **1 passed、79 deselected**，
  内含 **22 桌面/手机场景**，新增同浏览器双标签页登录、收藏、刷新及独立退出；
  Ruff lint/format 和前端构建通过。测试使用隔离数据库和测试账号。
- 升级后后台需要单独登录一次；旧版已将用户端切为管理员的会话不会猜测恢复，
  请在用户端退出并重新登录自己的账号，原收藏保留。阶段 2 搜索修复继续实施。

## Modern Obsidian 与阅读体验优化（2026-10-22）

- 分阶段计划与设计决策见 OBSIDIAN_PLAN.md；保留账号、收藏、内容与既有路由。
- 阶段 1：PostgreSQL pg_trgm 拼写近似回退，仅在当前筛选范围没有正常匹配时启用；
  4–40 字符英文词、最多八词，所有词均须匹配，页面标明 similar spellings。普通匹配
  顺序不变，短查询不扩展，不自动修改 URL 或用户输入，不涉及 AI。
- 阶段 1 验证：搜索与仓库测试 19 passed，前端 10 passed，构建通过；0006 迁移
  已应用、Django check 通过。覆盖 chatgpd → ChatGPT、组合词、分类、分页和私人收藏。


- 阶段 2：新增可选来源图片 URL 与署名，四个已核对 RSS 的媒体字段按域名/路径允许列表
  提取；API 再次校验，不抓正文、不代理任意图片、不改变文章身份。29 项图片/RSS/API
  测试通过，0007 迁移已应用，check 与迁移一致性通过。图片 UI 在阶段 3 接入。

- 阶段 3（2026-10-23 完成）：Modern Obsidian 黑白银界面覆盖首页、详情、收藏、登录、
  注册、404 和错误状态；本地字体换为 DM Serif Display italic / Geist Mono / Inter 并保留
  许可。桌面侧栏独立滚动、排序与数量前移，来源状态移至分页后；手机分类独立横滑。
  图片与文字采用独立网格列，保留来源署名、原始颜色；缺图/加载失败恢复纯文字布局。
- 真实图片导入已完成：DeepMind 64、Google AI 19、MIT 47、Cloudflare 20 条更新，四源
  新建均为 0，文章身份与收藏保留。真实页面已核实图片加载、chatgpd 得到 28 条近似结果。
  Linux Docker worker/Beat 已重建并运行，后续定时导入使用新图片规则。
- 最终验证：后端 **75 passed、2 deselected**；Django check、迁移一致性、Ruff lint/format
  通过；前端 **10 passed**、TypeScript/Vite build 通过。浏览器驱动 **1 passed、76 deselected**，
  内含 **20 桌面/手机场景通过**，包括四宽度、三字体、独立侧栏滚动、图片失败回退、
  错字提示、键盘、减弱动效、分页及既有账号/私人收藏流程。
- 恢复记录：上次因额度使自动审批未完成的浏览器测试已重新正常执行；修复字体导入路径。
  综合测试曾并发争用同一临时测试库，改为顺序运行后全部通过，未触及正常数据库。
  自动生成的 0007 迁移仅补齐 Ruff 格式，无历史改写。
- 使用 design-taste-frontend 的 app-screen 流程；方向 True-black flat，seed 1754154410，
  按用户明确要求保留三字体、银色渐变与玻璃。实际 CUA 四宽度复查与设计取舍详见
  OBSIDIAN_PLAN.md。未运行技能 inspect.mjs，不宣称其通过；源码 lint 0 FAIL / 5 WARN，
  警告均对应来源标签及用户指定视觉元素。正式页面未加入假数据、营销入口或 AI 功能。
- 本轮完成，未 push 或公开部署。截图及报告保存在系统临时目录，未新增项目垃圾文件；
  .gitignore 无需修改。拼写回退范围与图片源限制见 README / CONTENT_SOURCES.md；
  HTTPS 公开部署和真机 Safari 验收仍待服务器、域名及设备环境。

## 内容覆盖扩展（2026-10-22）

- 本轮按 `CONTENT_EXPANSION.md` 分为来源、GitHub 数据、界面与综合验收三阶段。
- 阶段 1：分类目录扩展至十类，保留已有来源和管理员设置；新增十个官方 RSS，
  项目真实安全下载器逐个解析通过，仍保留大小、公开 IP、TLS 和 XML 防护。
  来源范围与不可用候选见 `CONTENT_SOURCES.md`。
- 阶段 1 验证：来源初始化及 RSS 回归 16 passed，新增种子可重复且保留停用设置。
  当前先提交来源目录；实际数据库扩展与首次导入在综合验收阶段进行。
- 阶段 2：增加两个 GitHub 官方 API 采样源、仓库元数据和每小时 Star 快照；
  只有实际存在 24–26 小时前的基线才计算净增长，超过两小时未观测则不进入增长排序。
  不完整 API 结果明确失败并复用 M2 重试；无明确许可证的候选跳过。保留文章/收藏身份。
  搜索支持来源名称，新增 stars/growth 排序；项目创建、push、观测时间分离。
- 阶段 2 验证：完整后端首次 62 passed，补充排序和下载断言后相关测试 16 passed；
  check、迁移一致性通过，0005 已安全应用。实际下载 Skills 30 个候选、28 个通过过滤，
  一般开源项目 30 个候选、17 个通过；范围与查询取舍见 `CONTENT_SOURCES.md`。

- 阶段 3：页面接入十领域导航、项目总 Star / 实测增长排序，支持分类、关键词与分页
  组合并保留 URL。手机分类在独立横向区域滚动，排序入口前移；指标说明默认收起。
  仓库详情区分创建、push、收录及观测时间，展示许可证与基线，不将缺失增长显示为零。
- 浏览器验收发现仓库路径中的斜杠/连字符影响 PostgreSQL 分词，已独立修复名称片段
  匹配并提交；相关搜索/仓库测试 18 passed。未重做前两阶段或改写既有提交。
- 最终验证：后端 **64 passed、2 deselected**；Django check、迁移一致性、Ruff lint/format
  全通过；前端 **10 passed**、TypeScript/Vite 构建通过。浏览器驱动 **1 passed、65 deselected**，
  内含桌面/手机 **16 场景通过**，覆盖既有注册收藏、搜索分页、十分类、Star 排序、
  增长等待/过期/负数等状态（负数另由单元测试覆盖）、仓库详情和 URL 刷新。
  实际页面另检查 390/768/1440px 布局；测试数据库、账号和仓库均为明确的隔离 fixture。
- 真实导入与复核：2026-10-22 18:36 UTC 数据库有 **10 分类、16 个活跃来源、779 条
  非样例内容，其中 73 个仓库**（Skills 28 / Open Source 45）。各领域均有内容，活跃
  来源没有最近失败。连续两次 Skills 导入新建均为 0；第二次 28 unchanged、2 skipped，
  未产生重复文章。新来源初始化保留已有来源设置、文章、账号及收藏。
- Linux Docker worker/Beat 已重建并运行，继续每小时更新；无需新增密钥或付费服务。
  RSS 来源 14 个，GitHub 集合 2 个。来源明细、采样限制和不可用候选见 CONTENT_SOURCES.md。
- 当前限制：真实 Star 历史尚未满一天，增长排序暂时为空；只能比较采样内且具有有效
  基线的仓库，不是 GitHub 全站热门榜。公司与模型消息来自已发布公告；没有直接
  Anthropic 新闻源，不提供未经公布的发布时间预测；普通关键词搜索不等于 M3 AI 问答。
- 清理：本次探测/目录生成临时脚本从系统临时目录移除；截图和测试报告位于系统
  临时目录，项目内未新增需忽略的生成文件，因此无需修改 .gitignore。未 push 或公开发布。
  本轮内容扩展完成；M2 的公开 HTTPS 部署与真机 Safari 验收仍待服务器和域名。

## M2：每天可用的 Web 版本（2026-10-22）

- 用户确认服务器和域名尚未准备，本轮范围为本地开发与部署准备；HTTPS 公开部署、
  iPhone Safari 真机验收待环境就绪。分阶段计划见 `M2_PLAN.md`。
- 阶段 1：接入 Celery/Redis/Beat，每小时按来源分派任务，失败最多重试三次
  （60/120/240 秒）；手动与后台共用导入路径。PostgreSQL 来源锁跨抓取和写入防重叠，
  失败记录、导入计数、最后尝试/成功时间可在 admin 查看；中断记录在下次尝试时标记。
- 阶段 1 验证：导入与调度测试 19 passed；Django check、Ruff lint/format、迁移
  一致性通过；0003 已应用本机数据库，保留原数据。真实 broker/worker 联调留待综合验收。
  若数据库本身不可用，失败无法写入数据库，控制台日志保留失败类型；旧内容时间不变。
- 阶段 2：PostgreSQL 英文全文搜索（标题权重高于摘要，GIN 表达式索引），首页与私人
  收藏按关键词检索，保留 URL 条件和分页。来源状态区显示最后成功检查、失败或延迟；
  M1 没有留下成功记录的来源显示未记录，不反推历史时间。新增断网提示与恢复重试。
- 阶段 2 验证：后端 46 passed，前端 6 passed、构建通过；桌面/手机浏览器 14 场景
  通过，覆盖搜索/分类/翻页/刷新、空结果、断网/503 后重试及既有账号收藏流程。
  Django check、Ruff lint/format 通过，0004 索引迁移已应用。实看真实 moon 搜索
  命中 NASA 文章，390px 搜索布局正常；浏览器 503 场景是明确的错误视图模拟。

- 阶段 3：提供 Gunicorn/Caddy 多阶段镜像与独立生产 Compose、安全 Cookie/CSRF、
  HTTPS 与共享 Redis 限流；新增 GitHub Actions、真实 broker/worker 集成测试、
  日志轮转、备份恢复与部署操作说明。CI 配置已写入，尚未推送，未宣称云端 CI 已运行。
- 阶段 3 验证：后端 **48 passed**，Redis/Celery 集成 **1 passed**（真实队列与
  worker，RSS 为明确的原创测试 fixture），Django check、迁移一致性、Ruff lint/format
  通过。沿用阶段 2 的前端 6 passed、构建及桌面/手机 14 场景结果，前端此阶段未修改。
  API 与 Web 镜像均构建成功。
- 隔离生产容器验收：Caddy 本地 CA 严格校验证书，未忽略 TLS 错误或修改系统信任；
  HTTPS 健康检查真实查询 PostgreSQL，SPA 路由、静态资源、注册/登录/退出、Secure
  会话、CSRF 拒绝及私人收藏接口通过，worker ping 成功。pg_dump 恢复至新测试库，
  核实 1 个测试账号和 22 条迁移记录；未覆盖正常数据库。check --deploy 仅保留
  W005/W021：域名未定，尚未启用 HSTS 子域覆盖和 preload，操作文档已说明。
- 本机 macOS 原生 Celery prefork 在执行任务前报错；已停止本次启动的原生 worker/Beat，
  改用验证通过的 Linux Docker scheduler profile。现有前后端与数据库保持运行，
  单一 Beat 和 worker 已启用；电脑休眠、断网或 Docker 停止时不能持续更新。
- 真实后台抓取：2026-10-22 12:37 UTC 四个允许的官方来源均成功，新增 NASA 10 篇、
  LOC 1 篇，其余内容保持；正式文章数由 87 增至 **98**，BEA 一条无效原文 URL 仍跳过。
  实际数据库与页面均核实四来源成功时间；保留旧文章、样例和收藏，未用抓取时间替代发布日期。
- 清理：隔离 HTTPS 验收容器及其专属卷、临时凭据/CA/备份已移除；停用的原生 Beat
  临时状态库已删除。保留本机运行所需的数据卷。新增忽略 staticfiles/、backups/、
  *.dump（前一阶段已忽略 Celery 状态/PID），避免提交生成资源与私人备份。
- 当前结论：**M2 本地开发与部署准备完成；公开 HTTPS 部署及 iPhone Safari 真机验收
  未完成**，待用户准备服务器和域名。未 push、未公开发布，未进入 M3。
  后续步骤见 `OPERATIONS.md`；可尝试在首页组合关键词和领域，刷新后检查 URL 条件仍保留。

## 阅读页面重设计（2026-10-21）

- 使用 frontend-design 技能，先明确手机碎片阅读、来源核验与私人收藏任务；方案见
  `DESIGN.md`。选择冷白/深青的阅读索引台，Archivo 标题导航与 Literata 正文，字体
  本地打包并附许可。保留真实标题/摘要/文案、所有路由、API 与业务行为。
- 页面实现：桌面领域索引旁展示重点文章和信息流；手机导航回到上方，阅读提示移到
  列表后；移除行星插图及无实际排名意义的行号。详情、登录、注册、收藏及错误状态
  共用新的阅读面板。仅保留操作反馈动效，并提供 reduced-motion 样式。
- 实现阶段验证：前端 6 passed、构建通过；原有桌面/手机浏览器 6 场景通过。
  实看真实长标题首页并调整手机页眉空间；更完整的响应式/键盘回归在下一阶段。
- 最终验收：前端 6 passed，TypeScript/Vite 构建通过；浏览器驱动 1 passed（39
  deselected），内含 desktop/mobile 共 10 场景通过。新增 1440/768/390/320px
  的首页、详情、登录、注册及收藏入口检查，覆盖字体加载、标题不裁切、无横向溢出、
  键盘入口、焦点轮廓、404 返回、减少动态效果和真实注册 API 的弱密码错误。
- 截图复查修正手机注册错误状态下隐藏 skip link 的绘制问题：以透明度和指针状态
  隐藏，键盘聚焦时显示；补充焦点和透明度断言，重跑 10 场景全部通过。真实内容的
  首页、详情、注册页面另行目视检查，测试截图/报告留在系统临时目录。
- Vitest 更新到 4.1.12 修复开发依赖审计项；联网 npm audit 返回 0 vulnerabilities。
  本轮没有后端代码或数据库结构变更，未重复运行完整后端单元测试；浏览器使用隔离
  测试库。未修改真实账号/文章/收藏，未推送或公开部署；真机 iPhone 仍待验收。
- 2026-10-22 恢复核对：前两阶段提交已存在，剩余六个文件与中断前已通过测试的
  版本一致，无额外代码修改；保留上述测试结果，完成 Prettier 和 Git diff 检查
  （均通过），补齐最后阶段提交，未重复开发或覆盖已有修改。

## M1 验收反馈优化（2026-10-21）

- 阶段 1：新增独立 Register 页面和注册 API，收集用户名、邮箱、密码及确认密码；
  校验重复用户名、邮箱格式、密码强度与一致性，使用 Django 密码哈希、CSRF 和注册限流。
  注册只创建普通读者，成功后自动登录；邮箱验证、找回密码尚未实现。
- 阶段 1 验证：账号相关后端测试 11 passed，前端 6 passed，构建通过；真实浏览器
  desktop/mobile 阅读收藏及注册、刷新、重新登录共 4 个场景通过，使用隔离测试库。

- 阶段 2：收藏改为空心/实心星标，位于卡片右下角并与日期横向对齐；右上箭头
  直接跳转来源，标题仍打开站内详情。大卡片去掉 Explore the story，移除顶部 motto
  与 A place to begin。详情页操作使用独立布局，星标与原文按钮保留至少 44px 点击区域。
- 阶段 2 验证：前端 6 passed、构建通过；桌面/手机浏览器 4 个场景通过，新增
  星标与日期中心对齐、按钮尺寸、不重叠及原文 URL 检查；实看真实内容大卡片。

- 阶段 3：首页/收藏页新增数字页码、当前页高亮、首尾页/省略号；数量选项为
  10/20/50/100、自定义正整数或 All（不限）。URL 保存设置；领域/数量改变重置页码。
  后端返回页数及实际页码，收藏缩减后的越界页自动回到最后有效页；All 仍受领域与用户权限约束。
- 最终验证：后端 39 passed，前端 6 passed，TypeScript/Vite 构建通过；浏览器驱动
  1 passed，内含 desktop/mobile 各 3 场景共 6 passed。覆盖注册重新登录、阅读收藏、
  星标尺寸对齐、数字分页、自定义数量、刷新及 All。首次分页截图步骤早于请求完成，
  已改为等待当前页高亮后截图，重跑通过。实看真实首页、数字页码和手机详情页。
- 当前边界：All 会一次读取全部匹配条目，大数据量可能较慢；邮箱验证/密码找回、
  真机 iPhone 和公开部署尚未实现。本轮未新增真实账号、未修改已有文章或收藏，未推送。

## 中断恢复与最终复核（2026-10-21）

- 恢复时先读取进度、M1 范围与 Git 差异：工作区干净，M1 代码及文档已经位于
  现有提交 `a5e57ed510b68fae3790876c1fa079ea82a1fbe0`（`update stage M1`）。
  没有重新开发、回滚或拆分这条既有历史，也没有推送。
- 本次剩余工作分两步：先复核已提交功能，再独立提交恢复验收记录。未发现需修复
  的功能问题，因此没有为增加提交次数而制造代码修改；本次仅提交此文档。
- 实际重新执行：Django system check、迁移一致性检查、Ruff lint/format 全部通过；
  后端默认测试 24 passed（浏览器驱动测试另行运行），前端 6 passed，TypeScript
  和 Vite production build 通过。
- 独立 PostgreSQL 测试库的浏览器驱动测试 1 passed，内含 desktop / mobile 两个
  Playwright 场景，2 passed；验证阅读、筛选、登录、收藏刷新持久化、用户隔离与取消。
- 本机 API 实际返回 connected / M1，文章数 87，首页样例数 0；正常数据库中
  `browser-test-story` 为 0 条。实际浏览器确认详情页分别展示来源发布时间和收录时间。
- 重复导入的验收沿用 10 月 20 日已完成的结果；本轮没有再次抓取来源、重建数据库、
  新增真实账号或停止用户服务。M1 已完成；真实 iPhone、定时更新和公开部署仍属后续范围。

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
