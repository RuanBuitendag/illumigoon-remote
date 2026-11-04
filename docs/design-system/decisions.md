# Decisions: where the public systems disagree

Chosen by an agent on Ruan's instruction of 3 Nov 2026; Ruan can overrule any line.

Each choice rests on what the code already does. Where the app and the patch editor differ, the editor's look is the
base (LIFE-1935), except for the palette store and fragments panels. Where the code holds nothing, the choice fits the
existing look and the platform limits, and the "Why" line says so. Ruan's fixed rules hold throughout: no orange or
amber accent, no tinted cards, no small print, and no duplicated information.

## Another choice the checklist asks for

**CO-3. The warning role**

Chosen: Neutral. `--warn` stays a grey from the text ramp. A warning shows by its words and its place, never by an
orange or amber fill.
Why: `design-system.css` sets `--warn: var(--text-2)` in both themes, and the owner rejects orange and amber accents.
Date: 2026-11-03

**CO-3 and CO-5. The other status roles and the on-colour**

Chosen: `--good: var(--text-1)` and `--info: var(--text-3)`, from the ink ramp. `--on-fill: var(--background)` is the
colour for text and marks on an ink fill.
Why: the editor's memory budget already shows a good state in `--text-1` (`bits.tsx`), the toast and the power key put
the paper colour on ink, and the owner wants neutral states with no orange or amber.
Date: 2026-11-04

## Where systems disagree: options side by side, unranked

Each table lists what exists, not what to pick. "Verified" says how strong the evidence is for the facts in that row. Rows the owner's existing rules already settle are noted in the owner table above.

### Brand and icons

**D1. Where brand stops**

| Option | Used by | Tradeoff | Verified |
|---|---|---|---|
| Logo rules inside the design system site | [Atlassian](https://atlassian.design/foundations/logos) | One home; marketing material sits beside product rules | Official |
| Separate brand site, shared icon set as the link | [GitHub](https://brand.github.com/graphic-elements/iconography), [Mozilla](https://raw.githubusercontent.com/mozilla/protocol/main/docs/index.md) | Clean split; two places to keep in step | Official for the structure |
| Boundary set by audience and detail | [Frontify](https://frontify.com/en/guide/brand-guidelines) | Simple test; written by a vendor of brand software | Weak |

Chosen: Logo rules inside the design system site, which here is `docs/design-system`.
Why: The code holds nothing: there is no brand site or marketing material. One person and one repo need one home.
Date: 2026-11-03

**D2. Icon construction**

| Option | Used by | Tradeoff | Verified |
|---|---|---|---|
| One master, fixed stroke | Lucide, Polaris | Checkable numbers; small sizes may look heavy | Official |
| Separate drawing per size | Octicons, Carbon, Fluent | Tuned at each size; multiplies drawing work | Official in part |
| Variable axes or text-matched weights | Material Symbols, SF Symbols | Weight follows text; font delivery cost, and SF Symbols has no web path in the notes | Official for Material; mirror for Apple |

See the icon table for numbers.

Chosen: One master, fixed stroke.
Why: `src/design-system/icons.tsx` draws each glyph once, in `IconFrame`, with one fine round-capped line. It is the one set for the app and the editor (D49).
Date: 2026-11-03

### Colour and type

**D3. What a ramp step means**

| Option | Used by | Tradeoff | Verified |
|---|---|---|---|
| Position | Tailwind, Carbon | Flexible; the job comes from a role layer | Official |
| Job | Radix, Geist | Fewer ambiguous choices, by the researcher's inference; Radix says customising breaks balance | Official |
| Tone mapped to roles | Material | Dark and contrast themes generate from tone maps; needs HCT tooling | Official, summarised |

Chosen: Job.
Why: The code has no ramp. Every colour token is named for a job: `--background`, `--text-1` to `--text-5`, `--track`, `--wash`, `--fill`.
Date: 2026-11-03

**D4. Increased contrast**

| Option | Used by | Tradeoff | Verified |
|---|---|---|---|
| Separate token set | Primer, Apple, Material | Full control; one more value per role | Official; web mapping to `prefers-contrast` is Inference |
| Operating-system palette | Fluent | No third palette; Windows `forced-colors` only | Official for constants |
| No named theme | Carbon, Geist as far as found | Less to build; nothing for users who ask for more contrast | Weak, absence only |

Chosen: Operating-system palette.
Why: The code holds nothing. This adds no third palette to the flat neutral look, and Electron on Windows exposes `forced-colors` (platform limits).
Date: 2026-11-03

**D5. Text on vivid fills**

| Option | Used by | Tradeoff | Verified |
|---|---|---|---|
| Darken the fill to carry white | Primer | One on-colour; amber loses vividness (#9a6700) | Official |
| Keep the fill bright, use dark text | Polaris, Radix (five scales) | Vivid fills; on-colour varies by hue | Official |
| Vivid by default, darker fill and flipped label in increased contrast | Apple | Keeps vividness; two states per colour | Official |
| Neutral brand fill, colour for status only | Polaris | No vivid conflict; no colourful brand action | Official |

Ratios were not computed for any option.

Chosen: Neutral brand fill, colour for status only.
Why: `--fill` is the ink colour, and the only vivid colour is the light's own colour in strips and palettes. The editor toast puts `--background` on `--text-1`.
Date: 2026-11-03

**D6. Contrast metric**

| Option | Used by | Tradeoff | Verified |
|---|---|---|---|
| WCAG 2.2 ratios | Conformance basis; Material uses ratio curves | The only conformance basis; authors of the rival metric say it overstates dark contrast | Official |
| APCA Lc targets | Radix: step 11 Lc 60, step 12 Lc 90 ([Radix](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale)) | Accounts for size and weight; not a standard; library last updated July 2022 ([APCA](https://raw.githubusercontent.com/Myndex/apca-w3/master/README.md)) | Official, advocate source |
| WCAG for compliance plus APCA as a second check | Researcher's reading of practice | Two numbers to reconcile | Inference |

Chosen: WCAG 2.2 ratios.
Why: `scripts/friction/measure.mjs` already runs axe with `wcag2a`, `wcag2aa` and `wcag22aa`.
Date: 2026-11-03

**D7. Base UI text size**

| Option | Used by | Tradeoff | Verified |
|---|---|---|---|
| 13 px | Polaris | Dense; under the 16 px iPhone input threshold | Official |
| 14 px | Carbon productive, Fluent, Primer, Material Body M | Dense laptop screens; under the same threshold | Official |
| 16 px | Material Body L, Carbon expressive, Tailwind base | One rem root across platforms | Official |
| 17 pt on iPhone, smaller on laptop | Apple per platform: iOS 17, macOS 13 | Platform-native; two tables or a per-platform root | Official |

Chosen: 13 px, the editor's base.
Why: `.patch-editor` sets `font-size: var(--size-note)`, and the editor's phone query keeps all text at `--size-note`. Ruan prefers the editor's look (LIFE-1935), so the app's body text moves to it. Input zoom on iPhone is row FO-22.
Date: 2026-11-03

**D8. Tracking**

| Option | Used by | Tradeoff | Verified |
|---|---|---|---|
| Positive at small sizes | Carbon, Material | Opens small text; tuned to those fonts | Official |
| Negative only at large headings | Polaris | Few tokens | Official |
| None | Primer, Fluent | Simplest; depends on the font | Official |
| Automatic by font | Apple SF Pro | Nothing to tune; native text only | Official |

Chosen: Positive at small sizes.
Why: `--tracking-label` opens the small capital labels in both sets. `--tracking-title` stays as the one tighter role, for large titles.
Date: 2026-11-03

**D9. Large-heading scaling**

| Option | Used by | Tradeoff | Verified |
|---|---|---|---|
| Fixed rem plus a breakpoint step for large headings | Polaris, Carbon, Primer | Body stays fixed, keeping 200% zoom simple | Official |
| `clamp()` with rem plus vw | Utopia ([formula](https://utopia.fyi/blog/clamp/)) | Smooth scaling; Roselli's test saw 64 px text reach 68 px at 200% zoom ([Roselli](https://adrianroselli.com/2019/12/responsive-type-and-zoom.html)) | Weak: desktop tests only; no W3C formula |
| Fixed sizes, browser zoom only | Material, Fluent | Least code; no fit to width | Inference from token files |

Chosen: Fixed sizes, browser zoom only.
Why: Every size is a fixed token and nothing uses `clamp()`. This needs zoom, and `index.html` sets `user-scalable=no`, so that has to go.
Date: 2026-11-03

**D10. Dynamic Type on iPhone**

| Option | Mechanism | Tradeoff | Verified |
|---|---|---|---|
| `font: -apple-system-body` as the base, rem for the rest | [Use Your Loaf](https://useyourloaf.com/blog/using-dynamic-type-with-web-views/), [Furbo](https://furbo.org/?p=2791) | Follows the setting; live change needs a reload or bridge; the table must be re-expressed from a 17 px base | Weak: shown in WKWebView, not Capacitor |
| `@capacitor/text-zoom` | [Plugin](https://ionicframework.com/docs/native/text-zoom) | Capacitor-specific; zooms the WebView | Weak: third-party summary |
| Read native size, set a CSS variable | [Forum report](https://dev.to/gualtierofr/dynamic-fonts-in-wkwebview-2c0f) | Works with custom fonts; needs native code | Weak |
| Do not follow Dynamic Type | No source | Fixed layout; Apple advises support ([Apple](https://developer.apple.com/design/human-interface-guidelines/typography.md)) | None |

Chosen: Do not follow Dynamic Type.
Why: All sizes are fixed tokens and the screens are laid out for them. The other routes are Weak or not shown in Capacitor (platform limits).
Date: 2026-11-03

**D11. Font source**

| Option | Used by | Tradeoff | Verified |
|---|---|---|---|
| Platform system fonts | Apple; Fluent per platform | No files; different look and metrics per platform | Official |
| Brand font first, system fallback | Primer Mona Sans VF, Polaris Inter | One look; packaged path and fallback shift risks | Official for stacks |
| Open brand family | Carbon IBM Plex | Open files in the stack | Official |
| Variable or static files | [web.dev](https://web.dev/articles/font-best-practices) | Variable helps with many styles; often larger for one style | Official; no size data |

Chosen: Brand font first, system fallback, static files.
Why: `--sans` is Geist then `-apple-system`, `--mono` is Geist Mono then `ui-monospace`, loaded from `@fontsource` one weight per file in `src/design-system/index.ts`.
Date: 2026-11-03

### Geometry and layout

**D12. Smallest spacing step**

| Option | Used by | Tradeoff | Verified |
|---|---|---|---|
| 4 px floor | Radix, Tailwind | Short list; no icon alignment steps | Official |
| 2 px floor | Carbon | One extra step | Official |
| 2, 6 and 10 px steps | Fluent, Atlassian in part | Aligns icons; more choices for agents | Official |
| 1 px floor | Polaris | Finest control; longest list | Official, may be legacy |

Chosen: 2 px floor.
Why: The editor uses 2 px gaps (`.seg`, `.surfacemenu`) on a 4 px rhythm, and the app's `--space-1` to `--space-7` are 4 px steps. The editor's odd values move to the nearest step.
Date: 2026-11-03

**D13. Density**

| Option | Used by | Tradeoff | Verified |
|---|---|---|---|
| Discrete component sizes | Carbon | Explicit per component; no global switch | Official |
| Named modifiers | Primer `condensed`, `normal`, `spacious` | Token-level; pairs of tokens multiply | Official |
| Global multiplier | Radix `--scaling` 0.9 to 1.1 | One switch; also scales font and radius | Official |
| One ramp | Polaris | Nothing to maintain; no density choice | Official |

Chosen: One ramp.
Why: There is no density switch. The editor's phone query lifts targets to 44 px by window width, which is layout, not density.
Date: 2026-11-03

**D14. Dark-mode elevation**

| Option | Used by | Tradeoff | Verified |
|---|---|---|---|
| White overlay | Material 2: 5% at 1 dp to 16% at 24 dp on #121212 ([M2](https://m2.material.io/design/color/dark-theme)) | Mechanical; older approach | Official |
| Surface tones | Material 3 surface containers | Role-based; tint table not retrieved | Official in part |
| Black-alpha shadow plus 1 px ring | Radix | Shadow stays visible; multi-layer tokens | Official |

Chosen: White overlay.
Why: Raised things are faint washes, `--wash` and `--wash-strong`, in both sets. The editor header says a raised thing is a faint wash.
Date: 2026-11-03

**D15. First breakpoint**

| Option | Used by | Tradeoff | Verified |
|---|---|---|---|
| 490 to 520 | Polaris, Radix | Large phones and small windows | Official |
| 600 | Android | Matches window classes | Official |
| 640 | Tailwind, Fluent large | Tailwind default | Official |
| 672 | Carbon | Tied to its 2x grid | Official |
| Compact or regular only | Apple | No numbers; the web must choose one anyway | Official |

The researcher calls the choice arbitrary within this band, since sets differ by only 50 to 100 px.

Chosen: Compact or regular only, with the line at 900 px wide.
Why: `screen-stack.tsx` (`WIDE`), `composites.css` and `styles.css` all switch at 900 px. None of the other options matches the code.
Date: 2026-11-03

**D16. Component foundation**

| Option | Offers | Tradeoff | Verified |
|---|---|---|---|
| [Base UI](https://base-ui.com/react/overview/quick-start) | 37 unstyled, single package | Includes Toast, Drawer, Field, OTP | Official; v1.9.0 shown |
| [Radix](https://www.radix-ui.com/primitives/docs/overview/introduction) | Unstyled; ARIA, focus, keyboard | Full list not read | Official in part |
| [React Aria](https://react-aria.adobe.com/) | Date, calendar, combobox, table parts | Full list not read | Official in part |
| [shadcn/ui](https://ui.shadcn.com/docs) | 66 items; code copied in | Owned code; no automatic upstream fix | Official |

No comparison of bundle size, maintenance, touch or virtual-keyboard handling was found. Ark UI was not read.

Chosen: Base UI.
Why: `@base-ui/react` is the only component library in `package.json`. `fader.tsx` and `PowerKey` in `keys.tsx` use it.
Date: 2026-11-03

### States and feedback

**D17. Disabled controls**

| Option | Used by | Tradeoff | Verified |
|---|---|---|---|
| Native disabled | Material default, 0.38 and 0.12 opacity | Simple; not keyboard-focusable | Official |
| Soft-disabled, focusable | [Material](https://raw.githubusercontent.com/material-components/material-web/main/docs/components/button.md), [PatternFly](https://patternfly.org/2022.05/components/button/accessibility) | Discoverable; a reason must still be shown | Official |
| Generally avoid | [Primer](https://primer.style/product/components/button/accessibility/), Atlassian | Keeps reasons reachable; more validation states | Official for Primer; snippets for Atlassian |
| Keep enabled, show an error | [Hennepin](https://www.hennepin.us/design-system/components/components-library/buttons), Primer save buttons | No hidden reason; pressing can fail | Official |

No usability research was found. Disabling submit is argued not to be a WCAG failure in one [forum thread](https://webaim.org/discussion/mail_message?id=49730).

Chosen: Native disabled.
Why: Both sets use the `disabled` attribute. The app fades with opacity, the editor greys text with `--text-5`; the editor's treatment is the base.
Date: 2026-11-03

**D18. Button while loading**

| Option | Used by | Tradeoff | Verified |
|---|---|---|---|
| Do not disable | [Primer](https://primer.style/product/components/button/accessibility/) | Focus kept; repeat presses must be handled | Official |
| Disable | [Carbon](https://carbondesignsystem.com/components/button/usage/), [Polaris source](https://raw.githubusercontent.com/Shopify/polaris/main/polaris-react/src/components/Button/Button.tsx) | Blocks repeats; focus may drop | Official; Polaris file may be legacy |

Chosen: Disable.
Why: The GET key turns into a disabled GETTING key while it works (`docs/friction/report.json`).
Date: 2026-11-03

**D19. Loading indicator timing**

| Wait | NN/g | Primer |
|---|---|---|
| Under 1 s | Nothing | Nothing |
| 1 to 3 s | About 2 to 10 s: spinner or skeleton | Indeterminate |
| 3 to 10 s | Same | Determinate if possible |
| Over 10 s | Progress bar and estimate, a way to interrupt | Determinate, background task if possible |

Sources: [NN/g skeletons](https://www.nngroup.com/articles/skeleton-screens/), [NN/g limits](https://www.nngroup.com/articles/response-times-3-important-limits/), [Primer](https://primer.style/product/ui-patterns/loading/). The NN/g values are stated judgement, not measured results. Carbon adds skeletons rather than spinners for expected waits ([Carbon](https://carbondesignsystem.com/components/data-table/usage/)).

Chosen: Primer's column.
Why: The code holds no timers. The editor shows a quiet line while it waits (`.await-catalog`) and a real message when the wait fails (`.catalog-fail`), which is the shape of that column.
Date: 2026-11-03

**D20. Transient messages**

| Option | Used by | Tradeoff | Verified |
|---|---|---|---|
| Toast with timer | Base UI, Radix, Sonner | Unobtrusive; can be missed; a required action needs a persistent route | Official |
| One at a time, new replaces old | Material Snackbar | Simple queue; messages can be lost | Official |
| Avoid toasts, use inline or banner | [Primer on github.com](https://primer.style/product/ui-patterns/saving/) | Persistent, more layout work | Official |

WCAG time-limit criteria were not read.

Chosen: One at a time, new replaces old.
Why: `packages/patch-editor/src/app/useToast.ts` holds one toast, and `src/domain/store/undo.ts` holds one undo offer.
Date: 2026-11-03

### Forms and data

**D21. Required fields**

| Option | Used by | Tradeoff | Verified |
|---|---|---|---|
| Asterisk on required, before the label | [NN/g](https://www.nngroup.com/articles/required-fields/) | Familiar; qualitative evidence | Official, older |
| "(optional)" on optional, never asterisks | [GOV.UK](https://design-system.service.gov.uk/patterns/question-pages/) | Plain text; assumes most fields are required | Official |
| Mark the minority group | Researcher's middle path | Depends on each form | Inference |

Chosen: "(optional)" on optional fields, never asterisks.
Why: The code holds nothing. Plain words fit the text-only look, and the few forms (names, Wi-Fi) are mostly required.
Date: 2026-11-03

**D22. Validation timing**

| Option | Used by | Tradeoff | Verified |
|---|---|---|---|
| On submit, with focused error summary | [GOV.UK](https://design-system.service.gov.uk/patterns/validation/); React Hook Form default `onSubmit` | No premature errors; late feedback | Official |
| On leaving the field | [NN/g](https://www.nngroup.com/articles/errors-forms-design-guidelines/), [Baymard](https://baymard.com/blog/inline-form-validation), [Apple for email](https://developer.apple.com/tutorials/data/design/human-interface-guidelines/text-fields.json) | Earlier feedback; needs a submit fallback | Official, qualitative |
| At correct length for fixed-length fields | Baymard | Avoids premature errors on codes | Official, commerce only |
| First leave, then every change | [React Hook Form `onTouched`](https://react-hook-form.com/docs/useform) | Clears errors as fixed; library behaviour, not research | Official |

No measured completion or error data were found for timing.

Chosen: On submit.
Why: The code holds little: `own-wifi-form.tsx` keeps its key disabled until the fields are filled. Forms are short, so late feedback costs little and no error shows early.
Date: 2026-11-03

**D23. Form pacing**

| Option | Used by | Tradeoff | Verified |
|---|---|---|---|
| One question per page | [GOV.UK](https://design-system.service.gov.uk/patterns/question-pages/) | Simple on phone; more pages, built for long journeys | Official |
| One long column | [NN/g](https://www.nngroup.com/articles/web-form-design/) | Everything visible; longer scroll | Official, qualitative |
| Groups on one page | GOV.UK for repeat-use services, with research | Faster for repeat users | Official |

Chosen: Groups on one page.
Why: Sheets hold groups of controls on one page (`.control-group`, `.sheet-body`).
Date: 2026-11-03

**D24. Save model**

| Option | Used by | Tradeoff | Verified |
|---|---|---|---|
| Explicit save | [Primer](https://primer.style/product/ui-patterns/saving/) for text, checkbox groups, radios, native select | Clear state; extra step | Official judgement |
| Instant save | Primer for switches and segmented controls; Carbon switches | Direct; hard to reconcile with Save buttons | Official |
| Field-level save for mixed screens | Researcher's reading of Primer's no-mixing rule | Consistent per field; more buttons | Inference |
| Autosave for text | No source | Unknown | None |

Chosen: Instant save, with the editor's patch as the one document saved by hand.
Why: Faders and switches send to the lights at once. The editor keeps a draft and saves it from `SavePanel.tsx`; a patch is a document, not a form.
Date: 2026-11-03

**D25. Long lists**

| Option | Used by | Tradeoff | Verified |
|---|---|---|---|
| Pagination | Primer from about 20 rows; Carbon | Landmarks; suits comparing | Official |
| Load more | [NN/g](https://www.nngroup.com/articles/infinite-scrolling-tips/) | Footer reachable; extra tap | Official |
| Infinite scroll | NN/g for homogeneous streams | Fluid; poor for search and accessibility tools | Official, no numbers |
| Virtualised rendering | [TanStack Virtual](https://raw.githubusercontent.com/TanStack/virtual/main/docs/api/virtualizer.md) | Handles large sets; off-screen rows are not in the DOM | Official for API; Weak for accessibility |

Chosen: Infinite scroll.
Why: Every list is one plain scroll, such as `look-library.tsx`. The friction report finds a 76-swipe route in Looks, so search has to reach long lists.
Date: 2026-11-03

**D26. Tables at phone width**

| Option | Used by | Tradeoff | Verified |
|---|---|---|---|
| Sideways scroll, frozen first column | [NN/g](https://www.nngroup.com/articles/mobile-tables/) | Keeps columns; "somewhat acceptable" | Official, undated |
| Fewer columns, column chooser, accordions | NN/g | Less at once | Official, undated |
| Stacked cards | No source | Unknown | None |

Chosen: Stacked cards.
Why: The editor's phone query hides `.sheetcols` and wraps each `.mrow` onto its own lines.
Date: 2026-11-03

### Charts

**D27. Chart rendering**

| Option | Used by | Tradeoff | Verified |
|---|---|---|---|
| SVG | Recharts, Plot, visx, Nivo, D3 | CSS variables can flow in directly, by inference | Official for render type |
| Canvas | Chart.js, ECharts default | Needs a token-to-theme step | Official for render type |
| Wrapped library | shadcn over Recharts | Tokens and accessibility layer included | Official |

No accessibility or dark-mode comparison exists, and performance at scale was not researched. See the library table.

Chosen: Canvas.
Why: The editor's `BandScope.tsx` draws on canvas and reads `--warn`, `--modulation-soft` and `--background` from the tokens. No data charts exist yet.
Date: 2026-11-03

**D28. Series limit**

The limits table holds the options. Primer's limits are per chart, Carbon's 14 is a palette, Datawrapper and Atlassian sit between. Each is stated guidance. None was tested in the notes.

Chosen: Limits per chart, as Primer gives them.
Why: No charts exist. The band scope draws two series, inside any limit.
Date: 2026-11-03

**D29. Chart baseline**

| Option | Used by | Tradeoff | Verified |
|---|---|---|---|
| Zero required for bars, area, part-to-whole | [Carbon](https://carbondesignsystem.com/data-visualization/axes-and-labels/) | Honest length; small differences hidden | Official |
| Zero sensible, range chosen by purpose | [Apple](https://developer.apple.com/design/human-interface-guidelines/charts.md) | Heart-rate style charts stay readable; needs judgement | Official |
| Lines may start above zero | Carbon page, though [Carbon Charts defaults](https://raw.githubusercontent.com/carbon-design-system/carbon-charts/main/packages/core/src/configuration.ts) to `includeZero` true | Page and code differ | Official |

Chosen: Zero sensible, range chosen by purpose.
Why: No charts exist. A live level display needs its range set by what it shows.
Date: 2026-11-03

### Navigation and flows

**D30. Destination count**

The navigation table holds the options. Five or fewer fits all listed sources, and the researchers state that as a fit, not a rule. Sources conflict on the medium width: rail in [Android's default](https://developer.android.com/develop/ui/compose/layouts/adaptive/build-adaptive-navigation), bar in [SAP Fiori](https://www.sap.com/design-system/fiori-design-android/v26-1/components/m3-standard-components/navigation-bar/usage).

Chosen: Five or fewer. Now one top level: Home.
Why: `screen-stack.tsx`: Home is the only start. Rooms and pages are pushed from it.
Date: 2026-11-03

**D31. Overlay choice**

| Need | Apple | Material | NN/g |
|---|---|---|---|
| Warning, irreversible confirmation | Alert | Basic dialog | Modal for critical warnings |
| Short related task, wide screen | Popover or sheet | Standard sheet or menu | Nonmodal |
| Short related task, phone | Sheet, medium detent; no popover at compact width | Modal bottom sheet | Modal if brief |
| Long or multi-step task | Full-screen modal | Full-screen dialog | Full page |
| Choices tied to an action | Action sheet | Modal bottom sheet or menu | - |

This table is assembled from [Apple](https://developer.apple.com/design/human-interface-guidelines/popovers), [Material dialog](https://raw.githubusercontent.com/material-components/material-components-android/master/docs/components/Dialog.md), [Material sheet](https://raw.githubusercontent.com/material-components/material-components-android/master/docs/components/BottomSheet.md) and [NN/g](https://www.nngroup.com/articles/modal-nonmodal-dialog/). No system gives a field or step count that justifies a full page.

Chosen: Apple's column.
Why: On the phone, sheets take the whole screen (`Sheet`, and `.editor-sheet` in the phone query). On the laptop, the editor uses a centred sheet over `--scrim` and popovers (`.surfacepop`).
Date: 2026-11-03

**D32. Where state lives**

| Option | Tradeoff | Verified |
|---|---|---|
| URL holds route and filters | Deep links, reload and Electron restore the same way; matches Android's realistic-stack rule | Inference |
| In memory only | Simple; nothing restored on cold start | Inference |
| URL for route, session storage for scroll and drafts | Restores more; two stores | Inference |

No source ranks these. `history.scrollRestoration` facts are official ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/History/scrollRestoration)), but its behaviour for apps that render after load is not documented in the pages read.

Chosen: In memory only.
Why: State lives in zustand stores, and `screen-stack.tsx` keeps Home, room and page mounted. No screen has a URL.
Date: 2026-11-03

**D33. Undo**

| Option | Used by | Tradeoff | Verified |
|---|---|---|---|
| Transient toast with Undo | [Material Snackbar](https://raw.githubusercontent.com/material-components/material-components-android/master/docs/components/Snackbar.md) | Quick; time-limited, no seconds sourced | Official |
| Persistent undo stack | [Apple](https://developer.apple.com/design/human-interface-guidelines/undo-and-redo) | No limit; native gestures absent from a WebView, by inference | Official for Apple |
| Confirmation for serious acts | [NN/g](https://www.nngroup.com/articles/confirmation-dialog/), [Apple alerts](https://developer.apple.com/design/human-interface-guidelines/alerts) | Backstop; click-through on routine use | Official |
| Soft delete with restore | Researcher's reading of NN/g | Avoids dialogs; storage and purge rules | Inference |

Chosen: Transient toast with Undo, and the editor's undo stack inside Edit.
Why: `src/domain/store/undo.ts` offers Undo for a short time. The editor keeps a full history (`useHistory.ts`) with undo and redo keys.
Date: 2026-11-03

### Motion

**D34. Curves or springs**

| Option | Used by | Tradeoff | Verified |
|---|---|---|---|
| Bezier and duration | Carbon, Atlassian, Fluent, Primer | Native CSS; interruption restarts from rest | Official |
| Springs | Material Android, Apple | Keeps velocity when interrupted; needs a library or `linear()` sampling on web | Official |
| Mixed: springs for position, no-overshoot for colour and opacity | Material spatial and effects | Two families of token | Official |

Chosen: Bezier and duration.
Why: All motion is CSS `transition` with curves, in both sets.
Date: 2026-11-03

**D35. Motion implementation**

| Option | Size | Tradeoff | Verified |
|---|---|---|---|
| CSS transitions only | None | No springs; compositor-friendly | Official for rules |
| Motion `motion` component | 43 kb | Full features | Official; gzip not stated |
| Motion `m` with LazyMotion | About 5 kb, +24 or +38 kb | Split loading | Official |
| Motion `useAnimate` mini | 3.3 kb | WAAPI only | Official |
| Motion `useAnimate` hybrid | 23 kb | Sequences, motion values | Official |
| React Spring | Not retrieved | Unknown | None |

Sources: [Motion](https://motion.dev/docs/react-reduce-bundle-size). View Transitions are a further route, limited by the platform section.

Chosen: CSS transitions only.
Why: `package.json` has no motion library.
Date: 2026-11-03

**D36. Reduced motion**

| Option | Used by | Tradeoff | Verified |
|---|---|---|---|
| Motion off, instant | [Atlassian](https://atlassian.design/foundations/motion) | Simple; removes state cues | Official |
| Replace with fade | [MDN example](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion) | Keeps continuity; opacity is excluded from WCAG 2.3.3 ([W3C](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)) | Official |
| Reduced or static alternatives | [Carbon](https://carbondesignsystem.com/elements/motion/overview/) | Per-element judgement | Official |

Chosen: Replace with fade.
Why: The code holds nothing. The screen push already animates `transform` and `opacity`, so the reduced version keeps the opacity and drops the slide.
Date: 2026-11-03

**D37. Press and entrance scale**

| Option | Source | Verified |
|---|---|---|
| Press 0.97 | [Kowalski](https://emilkowal.ski/ui/7-practical-animation-tips) | Weak: practitioner |
| Press 0.96 to 0.9 | [Freiberg](https://raw.githubusercontent.com/raunofreiberg/interfaces/main/README.md) | Weak: practitioner |
| Colour state layer, no scale | Material | Official |
| Entrance from 0.9 to 0.93 or higher | Kowalski | Weak |
| Dialog entrance about 0.8 | Freiberg, through a summariser | Weak |

Chosen: Colour state layer, no scale.
Why: The editor answers a hover or press with a wash (`--wash`, `--wash-strong`) and never scales. The app's lift on a held button (`button[data-held]`) gives way to it.
Date: 2026-11-03

### Tokens, tools and agents

**D38. Token source**

| Option | Tradeoff | Verified |
|---|---|---|
| Tailwind `@theme` CSS as the source | No build layer; tied to Tailwind; no typed metadata | Official |
| DTCG JSON with Style Dictionary | Portable, typed; resolver unsupported ([issue via summary](https://project.pages.drupalcode.org/design_system_api/prior-art/tokens/)); adds a build step | Official in part |
| DTCG JSON with Terrazzo | Evaluates resolver; licence and maturity unread | Secondary |
| Tokens Studio | Figma-linked; pricing unverified | Secondary |

The notes hold no comparison of these on a real project.

Chosen: CSS custom properties as the source, with no build step.
Why: `src/design-system/design-system.css` `:root` is the one source, and the editor reads it. This is the first option's CSS route, without Tailwind.
Date: 2026-11-03

**D39. Tiers and naming**

| Option | Used by | Tradeoff | Verified |
|---|---|---|---|
| Three tiers | Primer base, functional, component | Clear lifecycle; more tokens | Official |
| Two tiers plus a domain set | Carbon core, component, AI | Layer-pairing number in the name | Official |
| No stated tiers, meaning-based names | Atlassian | Short; internal layer unseen | Official |
| Name anatomy over tiers | Curtis | Vocabulary, not a structure; 2020 | Official, older |

Chosen: No stated tiers, meaning-based names.
Why: The tokens are one flat list in `:root`, and only a few refer to another (`--fill`, `--modulation*`, `--warn`).
Date: 2026-11-03

**D40. Theme mechanism**

| Option | Tradeoff | Verified |
|---|---|---|
| DTCG resolver modifiers | Multi-axis; thin tool support | Secondary; spec not read |
| Token-set combinations | Tokens Studio model; differs from the resolver ([Swatchbook](https://unpunnyfuns.github.io/swatchbook/concepts/theming-inputs)) | Secondary |
| CSS variables under `:root` and a dark selector | No tool risk; axes hand-combined | Inference; Tailwind dark page not read |
| Media queries for OS settings | Follows the system | Official in part |

Chosen: Media queries for OS settings.
Why: `design-system.css` switches light and dark with `prefers-color-scheme`. Dark is the default.
Date: 2026-11-03

**D41. Sharing across repos**

| Option | Tradeoff | Verified |
|---|---|---|
| Package with Changesets | Versions, updates reach apps; publishing overhead | Official; page says it is outdated |
| Git dependency | No registry; pinning unresearched | None |
| shadcn-style registry copy | Owned code, static hosting possible; no automatic fix to copies | Official |
| Shared `@theme` import | Tokens only | Official |

No drift-cost evidence and no Capacitor or Electron source was found.

Chosen: Shared import of tokens, tokens only.
Why: There is one repo. The editor is the workspace package `@illumigoon/patch-editor` and reads the app's tokens through `:root`.
Date: 2026-11-03

**D42. How agents read the system**

| Option | Tradeoff | Verified |
|---|---|---|
| Prose in agent files | Cheap; [arXiv 2602.11988](https://arxiv.org/abs/2602.11988) found no success gain and over 20% more cost on general coding tasks | Official study, different task |
| Lint and tests | Blocks the agent; needs a complete token set first | Weak: anecdotes |
| Storybook manifest and MCP | Structured props; preview status, off by default | Official; effect unmeasured |
| shadcn registry and MCP | Static and documented | Official; effect unmeasured |
| Figma MCP or Code Connect | Seat-gated; conflicts with free-tools rule | Mixed |
| llms.txt | Mainly coding agents consume it, per vendor blogs | Weak |

zeroheight's survey of 123 practitioners reports 48% running an MCP server and 59% reporting UI that bypasses the system; it is a self-selected vendor sample ([zeroheight](https://zeroheight.com/resources/state-of-ai-in-design-systems/)).

Chosen: Lint and tests.
Why: `npm run lint` with `scripts/lint/rules.mjs` blocks off-system values, and `CLAUDE.md` stays short.
Date: 2026-11-03

**D43. Visual regression**

| Option | Tradeoff | Verified |
|---|---|---|
| Playwright screenshots on a kitchen-sink page | Free, no cap; baselines per OS, Windows differs from Linux CI | Official |
| Chromatic | Hosted; hard cap of 5,000 snapshots a month | Official |
| Storybook interaction tests only | Behaviour, not appearance | Official |
| Review by eye on demand | No baselines; depends on attention | None |

Chosen: Review by eye on demand.
Why: This is what happens now: there is no kitchen-sink page and no baseline. The owner rule keeps screenshots out of every gate.
Date: 2026-11-03

### One component per job (LIFE-1950)

The audit (CM-2, CM-4, BR-8) found six jobs done twice, once in the app and once in the editor. Each now has one
component in `src/design-system` or `src/composites`, with the editor's look, and both sides use it.

**D44. One fader**

Chosen: `Fader` in `src/design-system/fader.tsx`, on the Base UI slider. A fine track and its fill, with no ticks and no
thumb drawn. It carries the editor's marks as `FaderBand` and `FaderDot`, and its halo as `halo`: armed, hot or driven.
A gradient bar still draws its thumb, as it has no fill.
Why: the editor's bar was the look to keep. Base UI gives the editor's bars the keyboard, which they lacked. The
editor's `ui/Fader.tsx` now only turns a parameter into a 0 to 1 position along its taper. The editor passes
`isRelative`: a drag moves the value from where it was, shift makes it ten times finer, and a tap that does not move
sets the value where it lands, as the editor's bar did before. The app's bars set the value where the press lands.
Date: 2026-11-04

**D45. One sheet**

Chosen: `Sheet` in `src/composites/sheet.tsx`, on `Dialog` in `src/design-system/dialog.tsx`, which wraps the Base UI
dialog. A head with the name and the way out (its own keys, or a cross), over `SheetBody`. A form is
`--dialog-width` wide and a table `--dialog-wide`; on the phone a sheet is the whole screen.
Why: the editor's dialog on a scrim was the look to keep. Base UI moves the focus in, keeps Tab inside and gives the
focus back on close (story K-2). The dialog stays where it is rendered, so it keeps the styles and stacking of the
screen that opened it.
Date: 2026-11-04

**D46. One toast**

Chosen: `Toast` in `src/composites/toast.tsx`: paper text on an ink bar, at the foot of the screen, one at a time
(D20). In the editor it sits over the dock.
Why: the editor's toast was the look to keep. The app's undo notice moved onto it, with SAVE and UNDO as its keys.
Date: 2026-11-04

**D47. One swatch**

Chosen: `Swatch` in `src/design-system/colour-chips.tsx`: a box painted one colour, with a fine edge. Given `onPick`,
it is a key that opens the system colour picker. Its size comes from where it sits.
Why: the two were nearly the same. The editor's system picker drew its own grey frame, which is gone, so a swatch
looks the same in both.
Date: 2026-11-04

**D48. One selected mark**

Chosen: `Picked` in `src/design-system/text.tsx`. Under a choice, bright text with a line `--mark-gap` under it; a row
of tabs moves the line down onto the tab rule. Down the side of a selected row, a `--line-strong` rule.
Why: the editor's choices, tabs and selected rows drew three marks of their own, and the app a fourth. The line now
sits where the editor drew it.
Date: 2026-11-04

**D49. One icon set**

Chosen: `Icon` and `IconFrame` in `src/design-system/icons.tsx`, the editor's glyphs. The app's chevron, grip, lock and
cross marks are gone; the app draws its icons in `currentColor`. The editor's modulator icons stay in the editor,
drawn in `IconFrame`.
Why: the editor's fine round-capped line was the look to keep (D2).
Date: 2026-11-04

**D50. Where the editor takes its look from**

Chosen: the editor imports the app's two look doors, `src/design-system/index.ts` and `src/composites/index.ts`, and
no other app file. The rule `the-app-only-through-its-look-doors` in `packages/patch-editor/.dependency-cruiser.cjs`
checks it.
Why: one component per job needs the editor to use the app's components. Logic that only the editor needs stays in
the editor.
Date: 2026-11-04

### The app reads like Edit (LIFE-1935)

**D51. The live mark is a bar**

Chosen: `.status-mark` is Edit's live mark, a short flat bar: `--fill` when on, `--thumb-off` when off, dashed in
`--text-4` when the light is silent.
Why: Edit draws no circles. The app's round dot was the only round mark left on the room cards.
Date: 2026-11-04

**D52. A flat switch**

Chosen: `PowerKey` is a flat track with a square thumb, both on `--radius`, a hairline edge in `--track`; on, the
track fills with `--fill`. The hit area stays 44 px tall through `::after`.
Why: Edit has no pills. The rounded pill switch was the loudest shape on Home and the room screen.
Date: 2026-11-04

**D53. Add keys are keys**

Chosen: `+ Add a light` and `+ Add a schedule` use the key type: small capitals, `--tracking-label`, `--text-2`.
Why: every other key in the app and Edit's `+ ADD LAYER` speak this way (voice BR-5). The two add keys were the only
keys in sentence case.
Date: 2026-11-04

**D54. One title size**

Chosen: page titles and room names use `--type-heading`, Edit's title. Fields and the main action key use
`--type-body`. The tokens `--size-title`, `--size-page`, `--type-title`, `--type-page`, `--tracking-title` and
`--weight-light`, and the Geist 300 font file, are removed. This replaces the `--tracking-title` part of D8: no role
uses tighter tracking now.
Why: Edit's largest text is `--type-heading`. The app's 36 px light and 28 px titles, and fields and keys as large as
the title, made every page read louder than Edit.
Date: 2026-11-04

**D55. Control labels are small capitals**

Chosen: `.control-label` is Edit's dial label: `--type-label`, `--tracking-label`, upper case, `--text-4`. The value
beside it keeps its own case and tracking.
Why: Edit names every dial this way. The app's labels were body text, so a slider row read like a sentence.
Date: 2026-11-04

**D56. One wording for a light's state**

Chosen: a light that does not answer reads "Isn't answering" everywhere. A light in use elsewhere reads "In use",
and says nothing when the room's lock note already says so.
Why: the same state had three wordings ("ISN'T ANSWERING", "Isn't answering", "Not answering."), and "IN USE" under
each light repeated the room's lock note (one fact in one place).
Date: 2026-11-04

**D57. A hairline under section heads**

Chosen: `.heading-row` has a `--line` rule in `--track` under it.
Why: Edit's panel heads sit over a hairline. The app's heads floated, so a section's start was hard to see.
Date: 2026-11-04

**D58. A note shared by every look is said once**

Chosen: when every playable look carries the same "Plays on ..." note, Looks says it once at the top of the list and
not under each look.
Why: the same line under every look was duplicated information.
Date: 2026-11-04

**D59. The open room is Picked**

Chosen: on the laptop the open room's name in the side list is marked with `Picked`, the one selected mark (D48).
Why: it had its own text underline, a second selected mark.
Date: 2026-11-04

**D60. Text areas start bare**

Chosen: `textarea` gets the same reset as `input`: no box, no border, inherited type.
Why: Paste a look showed the browser's grey box with a full border, unlike every other field.
Date: 2026-11-04

**D61. Sheet heads line up with the body**

Chosen: on the phone the sheet head is padded `--space-3` by `--space-5`, the body's side gutter.
Why: the head's title sat 8 px left of the rows under it.
Date: 2026-11-04

**D62. One list of controls**

Chosen: Transition lays its controls out in `ControlList`, as the room does; Recent puts its empty note in its own
`PageSection`. `RoomSection` loses its unused title, and `.section-title` is removed.
Why: two components did one job, so the same controls sat at different gaps on two pages.
Date: 2026-11-04

**D63. One list of choices**

Chosen: `ChoiceList` in `src/composites/choice-list.tsx` lists choices as Edit lists its layers: rows a thumb tall
(`--row`) with no gap between them, and the chosen row marked with `Picked` down its side (D48). The rows reach
`--space-3` into the gutter, so a name lines up with the text above it and the mark sits left of it. Off timer, Which
lights and Save scene use it; Which lights may mark several rows.
Why: the rows stood `--space-5` apart, so four lengths filled half the phone, and a chosen row carried the under line
meant for a row of choices side by side.
Date: 2026-11-04

**D64. The room keeps one step**

Chosen: the room's sections, its scene shelf included, stand `--space-5` apart, the step between the controls inside
them. The look's name and its settings are one section, so the settings follow the name by that one step.
Why: sections stood `--section` apart, and the settings were a second section with the control list's own margin on
top, so 56 px of air split a look from its colours. Edit packs its panels close; one step reads as one page.
Date: 2026-11-04

**D65. A name over its choices**

Chosen: `NamedSelectRow` in `src/composites/control-rows.tsx` puts a thing's own name in body type and `--text-1`
over its choices. Rename and arrange uses it for the room of each light, under the section's small capitals.
Why: the light's name was drawn as a control label, so "LEFT" sat in small capitals right under "ROOM OF EACH
LIGHT" and two labels read as one stacked heading. A light's name is a name, as it is everywhere else in the app.
Date: 2026-11-04

**D66. Edit throws the shared switch**

Chosen: Edit's `Switch` in `packages/patch-editor/src/ui/bits.tsx` draws the app's `PowerKey` with its name beside it,
inside a `label`, so a tap on the name throws it as before. Its own `.sw` bar and the unused `.livedot` styles are
deleted; a live light in Edit is shown with `StatusMark` where one is needed.
Why: Edit drew a third switch, a 16 by 3 px bar in a 22 by 16 px key, under the thumb's 44 px, beside the app's
`PowerKey` (D52), and a second live mark beside `StatusMark` (D51). One job has one component (D44 to D50).
Date: 2026-11-04

**D67. The search screen names itself as a page does**

Chosen: the search screen says what it found in the heading type ("No lights found.") and what to do about it under
it as the page intro, in the note type. On the laptop it stands in the room's centred column, not across the window.
Why: a two-sentence instruction in the heading type filled three lines on the phone and read louder than any title
in Edit, and on the laptop the strip, the text and the keys' arrows ran the full 1440 px apart. Take back already
reads like the other pages and keeps its look.
Date: 2026-11-04
