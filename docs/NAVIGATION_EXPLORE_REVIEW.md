# Navigation and Explore review

## PR title

refactor: separate business navigation and make Explore content-specific

## PR description

Worldline mixed saved stories and web research with account actions, and combined
content type and project ordering in a single selector. The home feed now defaults
to stories, with explicit Stories/Projects controls and a prominent Web research link.

### Changes

- Keep shared business navigation separate from account state and actions.
- Label local search by selected content type; preserve saved search and explicit research submission.
- Add optional API `type` filtering before PostgreSQL search and pagination. Calls without
  `type` retain mixed results; existing `sort=stars` and `sort=growth` links remain supported.
- Restore type, topic, query, order and pagination from URLs, including browser history.
- Show project ordering only for Projects, preserving growth eligibility and fallback behavior.
- Remove only the home page-size control; preserve existing page_size links and saved-page controls.
- Keep desktop filters independently scrollable with visible native scrollbars; stack filters on phones.
- Document module responsibilities and extension points in ARCHITECTURE.md.

### Validation

- Frontend Vitest: 47 passed; TypeScript/Vite build passed.
- Django check and Ruff lint/format passed.
- Backend pytest: 308 passed, 2 deselected, using real isolated PostgreSQL.
- Chrome browser harness: 1 passed, 309 deselected (37 browser cases passed;
  the desktop-only scrollbar case is intentionally skipped in the mobile project).
- Covered guest/authenticated navigation, bookmarks, keyboard input, scrollbar dragging,
  wheel scrolling, both project orders, local search, URL pagination, refresh and history.
- Existing synthetic provider/browser responses exercised research citations and failure states.
  Home interactions and navigation were verified to make zero research POST requests.
- Desktop and 320/390px screenshots inspected; no horizontal page overflow.

### Limits and risks

No paid provider calls, public deployment, remote PR or remote CI execution. Mobile Chrome
emulation is not physical iPhone/Safari acceptance. Physical trackpad gestures were not
separately tested; the sidebar uses native overflow scrolling. The optional German-learning
app reference was not accessed. No schema, dependencies, ingestion or provider protocol changed.

API callers omitting type intentionally still receive mixed content. Explicit stories takes
precedence over a valid project sort. Entering Projects resets its order to Most stars.
CSS retains the existing design and stylesheet order; selectors are scoped to avoid older
mobile rules overriding the new layout. Native scrollbar appearance remains browser dependent.

### Suggested pre-merge checks

- Review the three local commits and rerun the documented frontend/backend/browser commands in CI.
- Check Safari/iPhone focus, touch scrolling, narrow account names and native scrollbar rendering.
- Confirm stories-only default and preserved legacy links against desired product behavior.
- Keep live provider quality/cost validation and deployment as separately authorized work.

## 本轮职责对应与删除依据

| 原位置/职责 | 最终位置/职责 |
| --- | --- |
| AccountNav 同时包含研究、收藏和账号 | Layout 负责业务导航；AccountNav 保留会话与账号操作 |
| repositories.tsx 的 DiscoveryOrder 混合类型和排序 | ExploreFilters.tsx 负责类型/排序呈现及 URL 状态解析；RepositoryStats 专注指标展示 |
| Home 以 sort 隐式决定混合内容/项目 | Home 显式传 type，将其纳入查询键；后端 queries 在搜索分页前过滤 |
| SearchStories 固定首页文案 | 原共享表单按模式调整文案，收藏仍复用同一实现 |
| Home 和 SavedStories 都渲染 PageSize | 仅移除 Home 调用；pagination.tsx 与收藏控件保留 |

真实复用仍是 SearchStories、useReadingPages、PageLinks、ArticleCard、Session 和原 AI
Mutation。未提取无第二调用方的通用控件框架。删除仅包含已无调用方的 DiscoveryOrder
及其 CSS；没有删除分页协议、测试场景、账号安全分支或 provider 功能。

阶段提交：API `2024de5`；前端 `6e84457`；文档单独提交。不 push、不改写历史。
