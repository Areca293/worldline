# Worldline reading desk

## Brief and audience

Worldline is an English reading home for a curious reader using spare moments on a
phone, with a desktop view for longer sessions. The job is to scan actual source
headlines, narrow by Technology/Economy/Finance/Music, read a feed excerpt, follow
its original link and keep a private collection. Source attribution and publication
time matter more than illustrations. Long institutional headlines and uneven excerpt
lengths are normal content, not material to replace with shorter invented stories.

Preserve `/`, `/articles/:slug`, `/login`, `/register`, `/bookmarks` and the not-found
route, every API interaction, authentication, source links, date distinctions, star
placement, pagination and the unlimited option. Retain the existing visible wording
and all real content; present uppercase labels as sentence case through styling.
Remove only non-content ornament: the orbit drawing and meaningless row indices.

## Direction: a personal reading index

Four areas of interest become a persistent reading index beside an open stream.
The most prominent visual is the actual In focus article, set on a deep teal field,
not a generic hero illustration. The rest is a quiet, readable source record.

Palette:

| Role | Token | Hex |
| --- | --- | --- |
| Workspace | Mist | #EEF3F4 |
| Reading surface | White | #FFFFFF |
| Main text | Deep ink | #173039 |
| Action and focus | Petroleum | #006B73 |
| Secondary surface | Ice | #DCECEF |
| Secondary text | Slate | #52676F |

Type: locally bundled Archivo Variable for the name, headlines and navigation;
Literata Variable for excerpts and sustained reading. Archivo carries the index's
precise character; Literata gives uneven source prose a comfortable reading rhythm.
Only regular text styles are loaded; weights establish hierarchy, not italic accent
words. Paragraphs stay about 55–75 characters wide, never justified. Body 16–18px,
metadata 13–14px, list headlines 25–30px, focus/detail headlines 32–46px. No clipped
or line-clamped source text. Font fallback must leave all information usable.

Desktop composition, all text left aligned:

```text
worldline.                                      Saved stories / account
Existing introduction                     Existing supporting paragraph
[Topic index]       [In focus: actual title, excerpt, source, date   ☆]
[page size]         Across your world                        story count
[reading note]      Actual title                                     ↗
                    Full excerpt / source / date                    ☆
                    …
                    ← 1 2 3 … last →
Brand / existing footer copy / connection state
```

Phone composition: masthead and account links wrap naturally; introduction becomes
compact; topic controls wrap into a thumb-friendly index above the quantity control;
then focus, source stream, page numbers and existing reading note. Nothing depends
on hovering. Details become a single white reading sheet, with the source dates
separate from the excerpt and a clear action row. Login and registration use the same
sheet, generous input widths and normal document flow for field errors.

## Review before implementation

Rejected: another cream-and-serif magazine with a decorative globe; it would repeat
the current template and misrepresent a text-only source collection. Also rejected:
a dense newspaper grid, which makes long headlines and phone reading compete for
space. Chosen revision: use a functional topic index and one strong focus field,
while preserving a single reading column and genuine source copy. The boldness is
concentrated in the focus article, not repeated on every card or control.

Motion responds to intent: a short arrow movement on hover/focus, a small star
confirmation on saved state, and brief press feedback. No auto-playing illustration,
scroll reveal or delayed content. Reduced-motion removes transforms/animation.

## Delivery stages

1. Record audience, task, palette, type, structure and content-preservation contract.
2. Rebuild shared styles and page composition; test/build and check real desktop and
   mobile views before committing the coherent UI change.
3. Extend regression coverage for responsive layout, keyboard focus, reduced motion,
   font loading and unchanged routes/content; record actual results and commit.

## Acceptance

Read real long titles in the homepage and detail, check all existing browser flows,
inspect desktop/tablet/phone and a 320px viewport, and compare the copy against the
previous commit. Do not change database data, add sample news, replace functional
controls, create a new design framework or publish.

## Final critique and verification

The source headline now supplies the focal point. The desktop index gives topic and
quantity controls a stable place without turning every article into a boxed card.
Archivo separates navigation and titles from Literata's source excerpts. Both fonts
are bundled locally; their OFL licenses are in `frontend/public/font-licenses.txt`.

The first phone review showed too much introductory space. Header and introduction
spacing were tightened while retaining the copy; the reading note moves below the
stream. The retained introduction still takes space on small screens, a deliberate
tradeoff under the copy-preservation requirement. Long headlines wrap instead of
being shortened. Decorative orbit artwork, duplicate wordmark ornament and row
numbers were removed; source wording, dates and route behavior were retained.

Automated checks passed at 1440, 768, 390 and 320px: no page overflow or clipped
headings, local font loading, readable forms and visible focus. Keyboard entry,
reduced motion, missing routes and weak-password errors also passed. Screenshot
review caught a mobile full-page rendering issue with an offscreen skip link; it
now remains transparent until focused, with assertions for both states. The final
browser suite passed all 10 desktop/mobile scenarios, including registration,
sign-in, private bookmark persistence and isolation, original links and pagination.
Frontend unit tests passed (6), and the production build passed. Real feed pages
were inspected separately from the disposable-database fixtures. Physical iPhone
testing and public deployment remain outside this acceptance.
