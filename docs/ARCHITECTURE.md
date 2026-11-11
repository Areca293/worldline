# Worldline 架构与维护指南

更新：2026-11-11。以当前源码为准；历史里程碑的验收边界见 `PROGRESS.md`。
本项目仍是 React 客户端 + Django 模块化单体，PostgreSQL 保存业务数据，Redis
用于 Celery broker 和生产限流。没有新增框架、数据库表或依赖。

## 前端：按读者任务组织

路径均相对 `frontend/src/`。页面内保留只服务该页面的查询和表单状态，
不为了文件长度为每个查询、字段或按钮再造一层。

| 文件/模块 | 职责与调用关系 |
| --- | --- |
| `main.tsx` | 唯一 QueryClient、BrowserRouter 和 React 根；原配置及生命周期不变 |
| `App.tsx` | 组合 Layout 和原有七条 Route（含兜底）；按原顺序加载 assistance/discovery 样式 |
| `app/Layout.tsx`、`OfflineNotice.tsx` | 页眉/页脚、跳过导航、路由变化滚动复位、联网提示；调用 AccountNav 和 ConnectionStatus |
| `reading/Home.tsx` | URL 筛选、话题和文章查询、首页重点内容、近似提示与跨领域展示；调用 ArticleCard、分页、SourceUpdates、DailyQuote |
| `reading/ExploreFilters.tsx` | readExplore 解析类型与旧 sort 链接，呈现两段类型选择和项目排序；只通过 Home 的 URL updater 修改状态，不发请求 |
| `reading/ReadingSidebar.tsx` | 首页侧栏容器，根据窗口与当前位置计算可用高度，监听尺寸变化，保留原生滚动；渲染隐藏按钮，显隐状态与焦点交接由 Home 管理 |
| `reading/Detail.tsx` | 按 slug 与账号查询文章，展示元信息、日期、来源范围、收藏及 ReadingAssistance |
| `reading/ArticleCard.tsx` | 文章卡片、Metadata、TopicTag；卡片复用于首页/收藏，标签复用于详情；依赖 RepositoryStats 和 BookmarkButton |
| `reading/SearchStories.tsx`、`pagination.tsx` | 首页与收藏复用的站内搜索、URL 分页 Hook、数量和页码控件；首页移除数量控件，收藏页保留；没有第二套分页 |
| `reading/repositories.tsx`、`types.ts` | GitHub Star/实测增长展示；文章/分类/分页 API 类型归阅读领域 |
| `account/session.ts`、`types.ts` | Session 查询与账号切换后的查询取消/清除；供导航、页面、收藏和 AI 使用 |
| `account/Login.tsx`、`Register.tsx`、`AccountNav.tsx` | 独立登录/注册页面及退出导航；复用 session、redirect、feedback，无通用表单框架 |
| `account/redirect.ts`、`feedback.ts` | 登录/注册相同的安全 next 规则；原账号相关失败文案也供收藏使用，保留已有错误语义 |
| `bookmarks/BookmarkButton.tsx`、`SavedStories.tsx` | 收藏写入/失效及私人列表；依赖 account/session 与 reading 的类型和展示，不属于认证实现 |
| `assistance/Research.tsx`、`ReadingAssistance.tsx` | 独立联网研究页与文章片段帮助；各自管理输入、显式提交和结果可见性 |
| `assistance/requests.ts`、`types.ts` | 按账号查询 capabilities；两类请求复用 mutation 的不重试、gcTime=0、结束刷新额度策略；AI 响应类型与错误映射 |
| `assistance/Result.tsx` | Availability、LimitNote、Answer、EvidenceList，供研究和阅读辅助复用 |
| `quotes/DailyQuote.tsx` | 独立公开名句查询和署名；不依赖 AI 请求 Hook 或账号 |
| `sources/SourceStatus.tsx` | ConnectionStatus 检查 API/数据库，SourceUpdates 展示来源成功/失败/延迟；二者不声称模型可用 |
| `lib/http.ts`、`presentation.ts` | 通用 get/write/ApiError；UTC 日期与安全外链展示函数。不导入业务页面或业务类型 |
| `ui/ContentNotice.tsx` | 阅读失败/重试及 NotFound 展示，不拥有业务请求 |
| `styles.css`、`discovery.css`、`assistance.css` | 原 Modern Obsidian 样式保持原位、内容和加载先后；没有样式体系迁移 |

依赖方向：App/布局组合功能；页面使用领域组件、Session 和 lib；底层 lib 不反向依赖功能。
跨功能仅导入实际所需模块，不使用大型 barrel。收藏按钮仅需文章类型，收藏页才需要
ArticleCard，因此 ArticleCard → BookmarkButton 不会绕回 SavedStories。AI 仅使用文章
类型和 Session，不依赖阅读页面。公开名句不需要先检查 AI 状态。

## 后端：HTTP、业务编排与外部协议

路径相对 `backend/`，仍只保留 `news` 与 `assistance` 两个业务 app。

| 文件/模块 | 职责与调用关系 |
| --- | --- |
| `config/urls.py`、`settings.py`、`production.py` | URL 组合、环境/数据库/认证/限流/队列配置；密钥只在服务端 |
| `config/api.py` | DatabaseErrorMixin，将数据库/Redis 错误映射为既有安全 503；被两个业务 app 和认证共同使用 |
| `config/middleware.py` | `/admin/` 独立 Session/CSRF Cookie 映射；不改变普通读者 Cookie |
| `config/celery.py`、`news/tasks.py` | Celery 初始化、自动发现、定时分发、已存在的重试和过期策略 |
| `news/urls.py`、`views.py`、`auth.py` | 路由、HTTP 权限/方法、认证/CSRF、序列化/分页、收藏写入；不再让别的业务导入 news.views 的错误基础设施 |
| `news/queries.py` | articles_for 用户收藏注解、discover_articles 筛选/排序、saved_articles 私人搜索；返回 QuerySet 与近似标志，View 保持响应契约 |
| `news/search.py`、`pagination.py`、`serializers.py` | PostgreSQL 搜索/拼写回退；分页和 All；公开字段、来源状态、图片校验与 Star 过期计算 |
| `news/models.py` | 文章/来源/分类/收藏、FeedRun、Repository、StarObservation 及约束/索引 |
| `news/catalog.py`、`images.py` | 审核来源目录及可嵌入图片 URL/署名规则；不抓取图片或全文 |
| `news/ingestion.py` | 手动/后台共用 refresh_source：来源锁、下载/写入、审计记录、失败状态 |
| `news/feeds.py` | 允许列表下载与 RSS/Atom 解析写入；识别 GitHub 集合后显式调用 repositories |
| `news/repositories.py` | GitHub 请求查询参数、元数据校验、稳定 ID 写入与真实 Star 基线；不再导入 feeds |
| `news/import_support.py` | RSS/GitHub 共享的 FeedError、ImportResult、下载上限及片段文本清理；图片署名也复用同一清理规则 |
| `news/admin.py`、管理命令 | Django admin 注册、种子和手动 import_feeds 入口；原路径保留 |
| `assistance/views.py`、`urls.py` | 输入 Serializer、权限/限流/安全错误、status/research/reading/quote 路由 |
| `assistance/services.py` | capabilities、额度、用户锁、HMAC 缓存、UsageEvent 与 research/reading_help 编排；完整保留执行顺序 |
| `assistance/models.py` | QuotaDay、ResultCache、UsageEvent；未改字段或迁移 |
| `assistance/providers/__init__.py` | generate 调度入口，检查可用证据 ID 并按配置选择 Chat 或 Responses |
| `providers/configuration.py`、`errors.py` | 服务器端点/配置校验、缓存指纹配置和统一安全错误协议 |
| `providers/transport.py` | urllib3 单次受限 JSON HTTP；上限、超时、关闭重试/重定向与脱敏错误 |
| `providers/brave.py` | Brave 结果变为证据；独立于所选模型，不抓取结果页面 |
| `providers/prompts.py`、`evidence.py` | 原提示/Schema/Relay 显式契约；证据文本/URL、严格答案/引用/token 校验与固定类别日志 |
| `providers/chat.py`、`openai.py` | LM Studio/Relay 的共用 Chat 请求与响应；官方 OpenAI Responses 协议。保留 provider 差异 |
| `assistance/quotes.py` | 有出处的公共领域名句按 UTC 日期轮换；无模型、额度或数据库需求 |
| `assistance/management/commands/` | debug_relay 共用 chat 请求构造/校验；usage/prune 使用既有模型，命令名不变 |

依赖方向：View → 查询/业务服务 → ORM 或供应商协议；协议模块不导入 ORM、View、
业务服务。业务服务可读取 news 的文章，但新闻导入不调用 AI。`config/api.py` 不导入
业务 app。`feeds → repositories → import_support` 与 `feeds/images → import_support`
均为单向；共享文本规则不依赖调用方。

历史迁移和 `news.search.article_vector` 的模型索引表达式保持原位。Celery 的
`news.tasks.dispatch_feeds`、`update_source` 注册名及管理命令路径保持不变。
测试和迁移按所属 app 分组；没有删除未启用的 provider、迁移对象或故障分支。

## 核心业务链路

### 阅读、发现与收藏

`App Route → Home/Detail/SavedStories → useQuery → lib/http.get → /api/ →
config.urls → news.urls → View → queries/search → Article/Bookmark/Repository →
ArticleSerializer + ReadingPagination → 页面`。

Home 查询键含账号、topic、sort、page、size、q；详情含账号与 slug；收藏含账号、
分页与 q，并只在登录后启用。query keys 没有改名。搜索和筛选来自 URL；变更筛选/
数量重置 page，All 仍按已有规则归一为第 1 页。首页无筛选且第一页时取第一项为重点。
后端按来源发布日期跨分类轮转；分类内保留原顺序；Stars/Growth 只选择仓库，Growth
要求两小时内的观测和已存在的 24–26 小时基线。搜索先精确再受限近似回退，私人搜索
先限定 Bookmark 用户。近似标志仍经 View 传到分页响应。收藏写入沿用 PUT/DELETE，
成功使 articles/article/bookmarks 三类查询失效，不做猜测性的客户端成功显示。

### 账号与 CSRF

`Login/Register/AccountNav → lib/http.write → 先 GET auth/session 获取当前 CSRF →
POST auth/login|register|logout → news.auth → Django Session/用户模型 → Session 响应`。
登录轮换 CSRF；每次写入重新获取 token。成功后 `useAccountChange` 先取消所有
articles/article/bookmarks/assistance-status 查询，再清除这些缓存，最后更新 session。
公共 topics/sources/quote 不混入私人缓存清理。登录/注册共用 safeNextPath，保留原有
允许列表（首页、research、bookmarks、单个 article slug 及其查询参数）和反斜杠拒绝规则。
管理端 Cookie 隔离仍由原中间件处理，未合并两端身份。

### 来源更新

`import_feeds 命令 / Beat → dispatch_feeds → update_source → refresh_source →
PostgreSQL 来源 advisory lock → fetch_feed → RSS parse_entries 或 GitHub adapter →
事务写入文章/仓库/观测与成功记录 → 释放来源锁`。

下载前核验准确允许列表及公开 DNS 地址，固定 IP 保留 TLS 主机验证；无任意 URL、
重定向、压缩或 XML 实体。源锁跨网络阶段，写入事务内仍锁来源行；文章身份、唯一约束、
重复导入和收藏关系不变。失败写安全 FeedRun/Source 状态，已知任务错误按原三次退避
重试。下载失败不会删除旧内容。源码中的 RSS description/Atom summary 来源校验仍禁止
用全文回填空摘要。GitHub rename 仍靠数字 ID 保留身份。

### Research / Reading Help

`useCapabilities → GET ai/status → services.capabilities + allowance` 只检查配置/额度，
不触发模型。用户提交后 `useAssistanceRequest → write → AssistanceView/输入 Serializer →
research 或 reading_help → execute → provider → 严格校验 → UsageEvent/返回值`。

Research 先 Brave，最多五个片段，再按配置生成；模型失败时保留已有来源及安全错误。
Reading Help 只处理数据库中已有片段，拒绝 sample/空文本，最多 8,000 字符，不下载全文。
所有模型通过同一 evidence contract；Chat 检查唯一 assistant、stop、无工具调用、合法
JSON/引用/token，LM Studio 翻译另有限制说明 ASCII 规则。Relay 不启用修复或回退。
`debug_relay` 与网页调用相同的 chat_request_body/parse_chat_response；默认预览不发送。

execute 先计算原 HMAC（提示版本、任务、输入、完整模型配置、Brave Key、TTL），然后获取
用户 PostgreSQL session advisory lock。缓存按用户查询，命中不 reserve、不新增 UsageEvent；
未命中先在事务中按 global → user 的顺序预留额度，再调用供应商，finally 写使用量并释放锁。
失败尝试计额度；未知 token 保持未知。Reading TTL=86400，Web TTL 由原设置控制。
2026-10-31 的模块重构只改变导入路径；本轮 UI 改造也未改变以上锁、连接生命周期、原子性或 HMAC 输入。

Research 按账号重挂载；Reading Help 按账号与文章 ID 重挂载，清除问题/模式/答案。
Mutation 不自动重试，gcTime=0，成功或失败都刷新额度；请求中/失败时不显示旧成功答案。

### 每日名句

`DailyQuote → GET quotes/today → DailyQuoteView → quotation_for(UTC date)`。
虽然后端归在 assistance app，名句是公开轮换，不调用普通 AI 服务、不扣额度、不读用户
缓存。前端因此放在 quotes，页面失效时明确显示重试，不制造替代名句。

## 放置新代码的原则

- 新页面放进所属功能目录，在 App 增加 Route；只有确有第二个调用方或独立策略时才提取 Hook。
- 新文章展示优先复用 ArticleCard/Metadata/RepositoryStats；不同表单保留各自可读的业务字段。
- 新账号相关查询必须使用用户维度，并同步检查 account/session 的取消/删除以及 mutation 失效；
  新 AI 表单必须确认账号/文章变化后的状态重置，不自动调用模型。
- 新筛选/排序放 news/queries；搜索算法放 search；HTTP 字段/状态由 View/Serializer 控制。
- 新 provider 先补协议测试，复用 transport/evidence；在 configuration 和 generate 显式接入。
  改提示或请求配置必须单独评审缓存指纹和 prompt version，不能静默更新基线摘要测试。
- 新导入适配遵循 CONTENT_SOURCES/OPERATIONS，复用 ingestion 的锁和审计；共享的片段规则
  放 import_support，特定来源规则留适配器。不要将不同语义的 URL/文本检查合并。
- 公共基础设施应有明确多方使用者；不新增包罗万象的 utils、Repository 层或复杂 DI。

2026-10-31 模块重构记录见 [重构交付记录](REFACTOR_REVIEW.md)；本轮导航更新见 [导航交付记录](NAVIGATION_EXPLORE_REVIEW.md)。


## 导航与 Explore 更新（2026-11-11）

目录仍按上表组织，未进行第二次大规模模块搬迁。Layout 在全站统一组合 WORLDLINE、
Reading and research 业务导航和 AccountNav。Saved stories/Web research 不再属于账号模块；
AccountNav 仅处理会话加载、重试、登录注册、账号标识和退出。

首页链路：URL → readExplore → Home 的 Query key/GET articles → ArticleList →
discover_articles → search_articles → ReadingPagination → ArticleCard。
类型、主题、关键词、排序、页码和 page_size 全部进入 URL 或查询键；变更筛选会清除页码。
没有 type 时，首页默认 stories；旧 sort=stars/growth 链接恢复 projects；显式 stories
优先于旧排序。进入 Projects 默认 stars，离开后再次进入也使用 stars。

API 新增可选 type=stories|projects；省略仍保留原混合列表行为。类型与主题在搜索及分页
前过滤；stories 排除 Repository，忽略有效项目排序；projects 默认 stars。无效 type/sort
返回英文 400。沿用既有近似搜索、排序和实测增长可比性，不修改模型、迁移或导入。

SearchStories 复用表单并按 stories/projects/saved 显示范围。Research 仍经原 requests
Mutation 显式 POST；首页输入、类型选择与研究页导航不触发外部检索。
PageSize 仍被 SavedStories 使用，因此只移除首页调用，不删除共享控件或 page_size 解析。
旧 DiscoveryOrder 及其无调用方 CSS 删除；RepositoryStats 保留原职责。

新增浏览器用例在 e2e/explore.spec.ts，复用后端 test_browser 的隔离数据库和禁用真实 AI
设置。测试数据、模拟模型响应与本地已有数据库的只读目视检查分别记录在 PROGRESS。

首页 home-desk 网格将侧栏放在顶栏下的左列；标语、站内搜索、结果、来源更新和名句共享右列。隐藏筛选时退回单列，URL 查询状态不变；手机保留标语、搜索、筛选、结果的顺序。
