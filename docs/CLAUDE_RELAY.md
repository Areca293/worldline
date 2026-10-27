# Claude 中转接入与验收记录

最新排查（2026-10-27）：用户已填 Key 并重启，真实摘要请求仍被本地响应校验拒绝。
平台两条日志均显示“claude性价比”分组覆盖 system 为 ASCII-only 终端指令；
原始回答不可见，具体失败类别尚待新诊断确认。代码增加固定类别的脱敏 warning，
未放宽输出/引用校验、切换分组或发出额外收费请求。
详情见 [运行诊断](M3_OPERATIONS.md#relay-response-diagnostics) 和进度文件。
以下“Key 留空/尚未调用”等内容为先前实施时的历史记录，不能作为当前配置状态。

本轮范围：为现有 Research、英文摘要、简体中文翻译、简单英文重述添加独立
`relay` 后端；不扩展里程碑。代码已实现，**真实中转调用尚未验收**。
2026-10-27 已按用户要求把根目录 `.env` 配置为 relay / `claude-sonnet-5`，
Key 留空待用户本机填写。未发送付费请求，未重启服务或停止本地模型应用。
以下 2026-10-26 的网页核对与测试记录保留为历史证据，不代表 Sonnet 5 真实验收。

## 代码与数据流

- `AI_MODEL_PROVIDER` 显式选择 `openai`、`lmstudio` 或 `relay`。
  官方 OpenAI 仍使用固定 Responses 端点；本地模型仍限制为原来的本机/Docker 宿主机。
- relay 只接受 `https://code.anyxml.com/v1` 或 `https://cncode.anyxml.com/v1`，
  可有一个尾斜杠及显式 `:443`。统一生成 `/v1/chat/completions`，不会重复 `/v1`。
  禁止 HTTP、其他端口/域名、userinfo、查询串（含空 `?`）、fragment、编码路径和异常路径。
  客户端额外传入 endpoint/key/model/provider 等字段返回英文 400，不作为配置使用。
- 服务端使用 Bearer 鉴权，复用 urllib3 网络层：TLS 校验、无重定向、无自动重试、
  1 MB 响应上限；connect 最多 3 秒，relay read/total 默认 60 秒，可设 1–180 秒。
  这是传输超时配置，不是整个检索加生成流程的硬性总时限。
- 非流式 Chat Completions，温度 0.2，输出上限取 `AI_MAX_OUTPUT_TOKENS`；
  发送现有分任务提示和证据，强制 `response_format=json_schema`、`strict=true`。
  relay 使用通用证据 Schema；本地翻译特有的 ASCII scope-note 约束仅保留在本地适配器。
- 只接受完成的单一 assistant 正文。拒答、截断、空内容、非 JSON、无效结构或引用都失败；
  不剥离 Markdown/思考过程、不补引用、不静默降级为 JSON object、不切换模型或供应商。
  认证/限流/网络等错误通过现有安全英文提示呈现，不记录或返回供应商原始诊断。
- Brave 继续负责联网检索。Research 将问题交给 Brave，再把问题及返回的标题、URL、
  片段交给中转站；文章辅助发送已保存的元数据及最多 8,000 字符片段。
  不抓全文，不用模型记忆冒充实时搜索，不提供模型工具。
- 中转站及其上游可能保留请求；Worldline 无法保证其保留策略或路由身份。
  分组名称和返回的模型名称是供应商声明，不构成底层模型身份的独立证明。
- 登录、CSRF、原子日额度、用户并发锁、原有账号/文章/收藏保留，无新迁移。
  成功和可解析失败的 Chat 响应会映射 prompt/completion token；失败若已有合法 token
  统计也写入 UsageEvent。连接失败/缺少用量仍是未知，不按零费用计算。
- 缓存按用户、输入/证据、任务、provider、模型、规范化实际端点、密钥、超时、温度、
  输出上限、严格输出格式、配置修订和提示版本隔离。只保存 HMAC，不暴露完整配置。
  提示/输出契约版本已升为 v7；旧缓存仍按原过期时间清理，不用删除数据库解决隔离。
  读取缓存不扣额度；失败不缓存，手动重试是新的可能收费请求。

## 当前文档核对与未知事项

2026-10-26 浏览器只读核对 [模型广场](https://cncode.anyxml.com/pricing)：

- 当前仍列出 `claude-sonnet-4-6`；其 API 页的 OpenAI 示例使用
  `POST /v1/chat/completions` 和 `Authorization: Bearer`。
- 参数表列出 `response_format` 支持 JSON 对象或 Schema；未证明所选 Key 分组实际
  接受 `strict=true`、完整证据 Schema 或所有参数。首页展示的成功响应属于模板示例。
- 端点筛选仍显示 Response 0；本适配器不调用 Responses API。
  API 示例的 `http://localhost:3000` 仍是模板地址，未用作服务地址。
- 全球/中国服务地址沿用用户此前登录核对的 `code.anyxml.com` / `cncode.anyxml.com`。
  本轮未做真实认证或生成请求，不能宣称任何一个端点已经连通。
- 分组有不同倍率，页面还展示自动分组链；应用本身不重试/切换，但不能控制中转站
  内部路由。真实验收前需核对该 Key 的实际分组、倍率、是否自动路由和账单规则。
  未查看/复制 Key，未选择或修改分组，未重新核对余额；历史余额不作为当前余额。

如果真实请求拒绝 Schema，记录 HTTP 状态、应用错误类别、Schema 是否接受、
停止原因与可用 token 数等脱敏结论，暂停后续付费测试。不要把原始供应商错误或
响应写入 Git。若将来必须用 JSON object 替代，须显式评审配置、保留后端严格校验并
增加独立缓存版本；供应商不强制 Schema 时的可靠性更低。本轮**未启用该替代方案**。

## 本机配置与建议额度

2026-10-27：`.env` 仍被 Git 忽略，已选择 `relay`，模型为 `claude-sonnet-5`，
地址为 `https://code.anyxml.com/v1`，超时 60 秒，revision 为 1。Brave Key 保留，
`RELAY_API_KEY` 留空。只改对应配置行，其他设置逐项比较确认保留；未停止 Bionic 或删除权重。
后端重新加载此配置后，填 Key 前阅读辅助/生成答案会显示未配置；不会自动回退本地模型。

| 参数 | 本机当前有效值 | relay 初期建议 | 本轮处理 |
| --- | ---: | ---: | --- |
| `AI_USER_DAILY_LIMIT` | 100（继承既有代码默认） | 10 | 保留当前值 |
| `AI_GLOBAL_DAILY_LIMIT` | 50（代码默认） | 20 | 保留当前值 |
| `AI_MAX_OUTPUT_TOKENS` | 1200（代码默认） | 1200 | 保留当前值 |
| `AI_WEB_CACHE_SECONDS` | 0 | 0，除非 Brave 方案允许缓存 | 保留当前值 |

归档前的 `bbcb094` 把用户额度代码默认从 10 调整为 100；这项改动已在本开发分支中，
本轮没有将它覆盖。`.env.example` 的用户值仍为 10，全局值仍为 50，需按实际使用调整。
**次数限制不是美元预算**，也不代表每次成本一致。失败可能扣费，超时可能仍在上游执行。

以下配置已写入本机根目录 `.env`；你只需要填写 `RELAY_API_KEY` 并重启 Django。
不要把下面的配置块整体覆盖到现有文件，其他服务配置需要保留：

```dotenv
AI_ENABLED=true
AI_MODEL_PROVIDER=relay
RELAY_BASE_URL=https://code.anyxml.com/v1
RELAY_API_KEY=
RELAY_MODEL=claude-sonnet-5
RELAY_TIMEOUT_SECONDS=60
RELAY_CONFIG_REVISION=1
```

在 `RELAY_API_KEY=` 后**直接在本机填入 Key，不要发到聊天中**；不放进 `VITE_*`。
建议经用户确认后显式设置 `AI_USER_DAILY_LIMIT=10`、`AI_GLOBAL_DAILY_LIMIT=20`、
`AI_MAX_OUTPUT_TOKENS=1200`；这些是配置变更，不重置已用次数。
同一个 Key 的后台分组/路由发生变化时，递增 `RELAY_CONFIG_REVISION` 并重启 Django。

配置准备不等于真实验收授权；本轮助手不会发送付费请求。填写 Key 后，你在页面主动
提交的任务会使用中转余额；如要助手代跑验收，需要先确认预算。
前后端启动方式不变：

```sh
cd /Users/a11/Desktop/worldline
# 仅在数据服务尚未启动时：
docker compose up -d --wait db redis
cd backend
uv run python manage.py runserver 127.0.0.1:8000
```

另一终端：

```sh
cd /Users/a11/Desktop/worldline/frontend
npm run dev
```

已有后端在运行时，先在其原终端退出，再启动；不要另起重复服务。
`.env` 变化需要重启，不能依赖 Django 的代码自动重载。
状态接口只表示配置齐备，不验证 Key、余额、Schema 或模型质量。
relay 模式不要求本地模型运行，但本轮不会擅自停止用户的本地模型应用。

## 验证记录与复现

2026-10-26，本轮无真实供应商请求：

| 检查 | 结果 | 边界 |
| --- | --- | --- |
| relay 非数据库专项 | 78 passed，6 个数据库用例排除 | HTTP 和模型回复全部是明确的 synthetic mock |
| 全量 backend pytest | 149 passed、91 errors、2 deselected | 91 项在 PostgreSQL 连接阶段受沙箱阻止，不能宣称全量通过 |
| Django system check | 通过 | 不等于数据库或中转连通性验收 |
| Ruff check / format check | 通过 | 无新增 SDK/依赖 |
| 前端 npm test / npm run build | 18 passed / 通过 | 前端源码未修改 |
| 浏览器/Redis-Celery 验收 | 本轮未运行 | 无 UI/定时任务改动，不重复历史验收 |
| 真实 relay / 当前业务数据库检查 | 未执行成功 | 待密钥、费用授权及可访问数据库的执行环境 |

数据库测试使用 pytest-django 的隔离 PostgreSQL 测试库；当前执行环境连接
`127.0.0.1:5432` 报 `Operation not permitted`，未创建测试库，未执行数据库断言。
没有改用 SQLite/mock 数据库冒充通过，也没有重置业务库。
在有本机网络权限的终端按顺序补跑：

```sh
cd /Users/a11/Desktop/worldline/backend
uv run pytest assistance/tests/test_relay_provider.py assistance/tests/test_local_provider.py -q
uv run python manage.py check
uv run ruff check .
uv run ruff format --check .
uv run pytest
```

本轮沙箱还禁止写默认 uv 缓存，已用 `UV_CACHE_DIR=/tmp/worldline-uv-cache` 执行上述
检查；本机终端通常无需该覆盖。不要并发运行多个使用相同测试库名的数据库套件。

## 待授权的真实验收计划

按用户本轮要求，目标模型固定 `claude-sonnet-5`，Key 分组**待用户本机核对**，不自动选择/改变。
建议先授权 **最多 6 次模型请求、最多 2 次 Brave 检索、总计不超过 US$1**；
这是一项待确认的人工验收预算，不是基于模型卡基础价计算的费用预测，也不是应用
实现的硬性美元限额。先核对实际分组倍率与供应商可用的 Key 限额，再逐次执行和核账；
如无法确定剩余预算足够覆盖下一次请求，停止，不靠多试几次、换组或重置额度继续。
若供应商不提供硬限额，不能保证单次请求在服务端绝不超出人工预算，需另行确认。

顺序如下，任一步失败暂停，不自动消耗后续次数：

1. 最小结构化输出请求：使用同一适配器和证据 Schema，核对 strict 支持、停止原因和 token。
2. 英文摘要：核对原文事实、数字、否定和片段范围。
3. 中文翻译：原创测试片段包含 `$12 million`、币种及不确定性，检查 `1200 万美元` 等值。
4. 简单英文重述：逐句核对否定、不确定性与原文结尾，不以摘要冒充重述。
5. Brave Research：核对实际检索来源、引用与每条断言，保留真实检索时间。
6. 证据不足 Research：检查如实承认不足；Brave 无结果时不应调用模型，最多调用数仍为 6。

重复已成功的文章辅助请求验证缓存（期望零新增供应商请求和额度）；如未命中，先暂停
排查配置/证据变化，不追加预算外请求。失败路径先由 mock 验证，不额外发送故意失败的
收费请求；真实失败保留额度和记录，不擅自重试。

逐次记录 UTC 时间、配置模型、供应商返回的模型标签（不是身份证明）、实际 Key 分组、
来源与逐条事实检查、调用/token 数、延迟和控制台实际扣费。保留失败结论；仅页面说明、
有效引用 ID、一次成功和 HTTP 200 都不能代替质量/费用验收。

## 分支、合并与回退

本轮开始：工作区干净；当前 `feature/claude-relay` 与 `archive/local-llm` 同指向
`bbcb094`，`main` 为 `09aff1c`。本轮实现、测试与文档仅在 feature 工作区。
未创建重复分支，未 merge、push、创建 PR 或公开部署，未修改归档分支。
2026-10-27 用户要求阶段提交；已尝试显式暂存代码/测试/示例文件，但当前会话无权
创建 `.git/index.lock`，因此暂存与 Commit 均未成功，没有本轮 Commit Hash。
不能按计划完成“阶段测试后立即提交”，修改保留在工作区；不绕过 Git 目录权限。

后续顺序：补齐数据库测试 → 确认 Key 分组和费用授权 → 真实验收 → 用户提交/创建 PR →
评审后合并 feature 到 main。保留 `archive/local-llm`。合并时应明确审核此前携带的
100 次代码默认额度是否仍适合付费使用；不会在本轮擅自改回。

优先通过配置回退，无需切换源码分支：

```dotenv
AI_MODEL_PROVIDER=lmstudio
LM_STUDIO_BASE_URL=http://127.0.0.1:1235/v1
LM_STUDIO_MODEL=spark-x2.6-4b
LM_STUDIO_TIMEOUT_SECONDS=60
LM_STUDIO_CONFIG_REVISION=spark-q4km-llamacpp264-thinkingoff-v1
```

保留既有 `LM_STUDIO_API_KEY`（仅本地开启认证时需要）、Brave Key 和其他设置。
确认 Bionic 中原模型已加载、本地服务仍只监听 `127.0.0.1:1235`，再重启 Django；
如保存推理参数改变，更新本地 revision。可按需恢复经用户认可的本地次数限制，
但不要清空额度表。先检查配置状态，再用明确的一次本地请求验证。

若确实要查看旧源码，先提交或妥善保存 feature 上的工作，再 `git switch archive/local-llm`，
不在归档分支实施本轮改动；返回用 `git switch feature/claude-relay`。
**Git 分支不保存被忽略的 `.env`、模型权重或数据库**：切换分支不会自动恢复配置、
加载模型或还原账号/文章/收藏。旧代码也不识别 `AI_MODEL_PROVIDER=relay`，因此切回
归档时必须把运行配置改回 lmstudio 并重启。此接入没有数据库结构迁移，不需要回滚数据。

## 建议提交说明与 PR 描述

Commit / PR title:

```text
feat: add allowlisted Claude relay Chat Completions provider
```

PR description (update validation results after completing the pending checks):

```text
Worldline can now use an explicitly selected HTTPS relay for cited research,
excerpt summaries, Chinese translation and simple-English rewrites. Official
OpenAI Responses and restricted local LM Studio support remain available.

The relay uses one non-streaming Chat Completions attempt with strict JSON Schema,
server-side evidence validation, allowlisted origins, and no redirects, retries,
output repair or provider fallback. Cache fingerprints isolate relay configuration;
known token usage from failed Chat responses is retained. API inputs reject extra
configuration fields. Existing accounts, content, bookmarks and quotas are preserved.

Validation: 82 relay contract tests pass without provider access, including both
claude-sonnet-4-6 and claude-sonnet-5 request routing. Frontend tests
(18), build, Django check and Ruff checks pass. PostgreSQL-backed tests are blocked
by sandbox network permissions; see PROGRESS.md for the full-suite result. Live
relay schema, language quality, key-group routing and charges await configuration
and explicit spending authorization. No browser acceptance was repeated.

The branch also carries the earlier archived change raising the default reader
limit to 100; paid rollout should explicitly review limits. The ignored local .env now selects relay / claude-sonnet-5 with an empty key;
unrelated settings, model weights, database records and dependencies were preserved. See CLAUDE_RELAY.md for
activation, the proposed acceptance budget, and configuration-based rollback.
```


## 2026-10-27 续做验证与待执行提交

- 复核原适配器与本地适配器：104 passed，7 个 PostgreSQL 连接初始化 errors。
- Sonnet 5 配置完成后：relay 非数据库专项 82 passed、6 deselected；完整后端
  153 passed、91 个数据库初始化 errors、2 deselected。连接权限限制仍未解除。
- Ruff lint/format、Django check 通过。实际加载 `.env` 验证 provider/model/端点；
  仅用进程内 synthetic Key + mocked HTTP 验证“只填 Key”即可选择 Sonnet 5，
  该验证没有真实模型请求或数据库查询。未把此结果描述为供应商连通性成功。
- 本轮无前端改动，未重复上轮已通过的前端 18 项与构建；未运行浏览器验收。
- 本机真实配置仍缺 Relay Key，实际分组、Schema 支持、语言质量与扣费尚未验证。
- 代码与文档保持两组逻辑提交；由于 `.git` 写权限被拒绝，需在有权限的本机终端完成。
  下列命令精确列出文件，不包含 `.env`；只在核对工作区仍是本轮变更后执行：

```sh
cd /Users/a11/Desktop/worldline
git branch --show-current
# 必须为 feature/claude-relay；先核对 diff。
git diff --check
git add backend/assistance/providers.py backend/assistance/services.py backend/assistance/views.py backend/config/settings.py backend/assistance/tests/test_relay_provider.py .env.example
git diff --cached --stat
git commit -m "feat: add Claude relay integration with Sonnet 5 configuration"

git add README.md docs/M3_OPERATIONS.md docs/CLAUDE_RELAY.md docs/PROGRESS.md
git diff --cached --stat
git commit -m "docs: document relay activation rollback and validation limits"
```

这些是待执行命令，不是已经创建的提交；不会自动 push。数据库测试仍需在有本机
PostgreSQL 访问权限的环境补跑，再决定合并及付费验收。
