# Modern Obsidian — reading, discovery and verification

## Scope and sequence

1. Add conservative typo fallback to collected-content keyword search, with explicit
   approximate-match feedback and private-bookmark isolation. Verify and commit.
2. Import optional publisher image metadata only from reviewed feed media hosts;
   retain attribution and hide unavailable images. Verify ingestion and commit.
3. Rebuild the existing React screens in the user-specified Modern Obsidian system;
   verify all routes/states at 320/390/768/1440px, update operations/progress and commit.

No routes, accounts, bookmarks or original content are replaced. No AI search,
paid service, public deployment or repository push. Schema additions are limited to
search support and optional feed image metadata needed by the requested features.

## Jobs and data inventory

- Readers visit briefly on phones, with longer browsing sessions on desktop.
- The first question is: what can I read or investigate next, and who supplied it?
- Ten API-provided topics organize real articles and GitHub repository metadata.
- Titles and descriptions vary greatly in length; preserve every word and wrap paths.
- Article publication, source update and collection times are separate evidence.
- GitHub totals and net change are observed measurements with explicit time windows.
- Unknown growth is not zero; stale observations cannot enter growth ordering.
- Private bookmarks belong to the current session, with independent search and paging.
- Sources have independent success, delayed, failed and pending states.
- Publisher thumbnails are optional evidence, never generated decorations.
- Search, source links and bookmark actions are the frequent jobs, kept in reach.

## Direction and composition

The app-screen draw offered Data terminal and True-black flat. Choose True-black
flat: the shared black ground and neutral elevation suit a daily media reader;
no charts or decorative metrics are needed. Keep the explicitly requested palette
and type: DM Serif Display italic, Geist Mono labels, Inter body. User-specified
three fonts, glass, silver button gradient, radii and editorial heading take
precedence over conflicting skill defaults. Seed: 1754154410. No redraws. The dealt count-card list and chart-based detail do not
fit this product: topics have no count API and details contain source excerpts, not
analytics. Compose them from real reading fields, retaining the requested desktop
index and single-column detail.

Worldline's distinction between a story's date and an observation's date becomes
its editorial structure: a full title, a source, and quiet evidence beneath it.
The working interaction is the existing combined topic/search/project-order filter.

A 92vw frame contains a 224px desktop topic index, a 32px gap and the remaining
content width. The index is sticky with a viewport-bounded independent scroll;
long Source updates move after pagination, outside the sidebar entirely. On phones,
compact intro/search precede a horizontal topic row and one content column. Sort
and page size share a compact control row. No floating navigation is
needed: preserving small-screen reading space is more useful than duplicating links.

Cards with approved images reserve a separate right column; title, summary and
metadata never overlap it. Without an image, or after a load failure, the card
returns to its full-width text layout. Details/forms keep independent reading widths.


## Final app-screen critique — 2026-10-23

1. The primary task is reading: real headlines lead the stream, source links and
   bookmarks stay adjacent. Search and topic/order controls remain real API controls.
2. A single 92vw frame aligns navigation, search, stream and footer. A 24px minimum
   total inset protects narrow viewports with scrollbars. Text is never line-clamped.
3. Black/white/silver tokens carry all UI states. Original publisher image colours
   remain intact; no editorial images are recoloured to make them match the chrome.
4. Counts and repository metrics still come from the API. Growth includes its actual
   time window; there are no new vanity numbers or invented rankings.
5. Empty, pending, stale, zero, negative and failed states retain explicit wording.
   Approximate search says “similar spellings” without changing the user's query.
6. There are no charts or legends. Images occupy a separate grid cell, with visible
   attribution and original-source links. `contain` avoids clipping text inside images.
7. Mobile topics scroll within one row; sorting and page size share a row. Source
   updates follow pagination. Desktop tools scroll independently at short heights.

Review rounds corrected three issues: a wrong font package import, sort controls
below a long category list, and source-image cropping. The final narrow-width pass
also enforces a minimum outer inset. 320/390/768/1440px layouts have no page-level
horizontal overflow; long titles and repository paths remain readable. The default
390px first card begins within the initial viewport. Source status can expand
without increasing the sidebar's height. Forms and detail actions stay usable.

Verification: 20 desktop/mobile browser scenarios pass, including real API-backed
registration/bookmarks and disposable image/typo fixtures. CUA checked the actual
local application's first screen, real publisher images, search and narrow form.
The bundled `inspect.mjs` was not run: browser work used the mandated CUA channel
and the existing project Playwright acceptance harness. Do not describe this as an
inspector 0-FAIL certificate. Source lint: 0 FAIL, 5 WARN after the explicit user
exception for silver gradients. Warnings are retained and justified: two source-topic
label matches are functional metadata; mono is the requested Geist Mono; two glass
matches are the feature-support check and the requested search/form material.
No scene animation, stock photo, generated artwork or demo content was added to the
normal UI. Publisher thumbnails are not design assets; credits come from each feed
(or are explicitly labelled “Via publisher”) and remain beside their source link.

Remaining tradeoffs: thumbnail availability depends on publishers; 96px phone
thumbnails provide recognition rather than readable embedded captions, so the full
source remains linked. Spelling tolerance is conservative English keyword matching.
Physical iPhone Safari and public deployment remain outside this local acceptance.
