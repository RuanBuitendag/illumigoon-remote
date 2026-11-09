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

**D68. One component page, a plain page on the dev server**

Chosen: `?components` on the dev server (`npm run dev`, then `http://localhost:5173/?components`) shows every
component that the two doors export, in each of its states, with made-up props: default, pressed or selected,
held, disabled, empty, long text and error where the component has them. The page is a screen in
`src/domain/screens/component-page`, laid out by `ComponentPageLayout`, `ComponentEntry`, `ComponentState`,
`ComponentFrame` and `PaintSample` in `src/composites/component-page-layout.tsx`. A screen, sheet or toast that fills
the window stands in a `ComponentFrame`, whose `contain` keeps it inside the frame; a sheet or dialog opens on a key,
because an open one makes the rest of the page inert. The app has no hover look, and the one focus ring shows on
Tab, so neither has a cell of its own. `lint:rules` fails when a door exports a component that the page does not
import and name, and the story `LIFE-1955 the component page draws every component` draws it at 375 by 812 and 1440
by 900 and fails on any error. `src/main.tsx` asks for the page only under `import.meta.env.DEV`, and its style
sheet `component-page.css` loads when the page first shows, so the release build carries none of it.
Why: TL-2, ST-1 and CM-7 had no page that shows each component in each state (LIFE-1955). Storybook and Ladle were
weighed. Both add a dependency tree and a second build, and their story files would sit outside the three layers,
so the lint would need an exception for them. Ladle is the lighter of the two, but it still needs its own
config and a story glob for every check. A plain page uses the app's own Vite server, as `?demo` does, and the
layer rules allow it as it is: a domain screen that joins fixed data to composites. One job, one way.
Date: 2026-11-04

**D69. Every size outside the tokens is a lint failure**

Chosen: `lint:rules` reports a raw `height`, `width`, `min-*` or `max-*` and a raw `box-shadow` edge in the CSS of
`src/design-system` below the tokens and of `src/composites`, and in the inline styles of their components. Sizes
that recur or have a job are tokens in the size group (`--home-header`, `--scene-card`, `--switch-width`,
`--measure`, `--strip-tile` and the rest); a part of a mark is a `calc` on the mark's token or a percentage of it.
Edges are `--line`, `--line-strong` or the new `--line-thick`. `design-system.css` now gets the spacing check too,
which found `gap: 1.5px`. `--space-half` is the space inside one small thing: a chip's padding, a mark beside its
word, the rows of one wrapped control, a ring's offset, a scrollbar thumb's inset. Never a size.
Why: GE-10, GE-4, TO-2, SP-1 and SP-2. Sizes were the one kind of geometry no check covered, so 24 raw ones had
gathered.
Date: 2026-11-04

**D70. Sheets, dialogs and the toast come and go with one short motion**

Chosen: four tokens, `--ease-enter` (decelerate), `--ease-exit` (accelerate), `--duration-enter` 200 ms and
`--duration-exit` 140 ms. A sheet or dialog rises in and sinks out over a fading scrim; the toast rises in and sinks
out. Base UI marks a leaving popup with `data-ending-style` and calls `onOpenChangeComplete` when its motion ends,
and only then does `Dialog` call `onClose`. The new primitive `Presence` keeps a child that has gone on the page
until its motion ends. Under `prefers-reduced-motion` every one of them only fades.
Why: MO-2. Things appeared and vanished in one frame, so a toast's going read as a flicker. Exit is shorter than
enter, since a thing that is going needs less of the eye.
Date: 2026-11-04

**D71. The tokens answer more contrast and forced colours**

Chosen: under `prefers-contrast: more`, in dark and in light, the quiet text steps (`--text-3` to `--text-5`) move
one place up the ramp, and the track, the off thumb, the washes and the scrim grow strong enough to read as edges.
Under `forced-colors: active` the tokens hold system colours (Highlight for focus and fill, CanvasText for text and
track, GrayText for quiet text), and the switch, the fader, the marks and the chosen line take
`forced-color-adjust: none` so the system does not wipe their fills. Lit strips, swatches, the colour pad and a bar
of colours keep the colours of the look. The toast has a clear outline that forced colours draw. `--info` is the
colour of the bottom notice; `--radius-pill`, `--radius-round` and `--background-clear` were used nowhere and are
gone.
Why: CO-7, CO-8 and the unused tokens of GE-1 and CO-3.
Date: 2026-11-04

**D72. Each move deeper is a step of the browser's history, and a link opens its screen**

Chosen: `src/domain/store/screen-history.ts` follows the navigation store. A move deeper (a room, a page, a page
under Room settings) pushes a history step; a move to the side replaces it; a way back in the app goes back through
the history, so the system Back gesture and the browser's Back go back one screen. A step the browser added for a
typed address is taken as the app's own. Edit with unsaved changes takes the Back gesture and asks first. On the
iPhone the `illumigoon` scheme opens the screen its link names (`illumigoon://room/<id>/looks`), through
`appUrlOpen` and the launch link of `@capacitor/app`; Edit is never opened from a link, and a link that comes while
Edit is open is let go.
Why: NA-7. The address changed with `replaceState` only, so Back left the app.
Date: 2026-11-04

**D73. The voice rules that a machine can check are a lint**

Chosen: `lint:rules` parses each source file in `src` and checks the words the app shows (text in JSX, a text prop
such as `label` or `title`, and every string with a space in it) against `voice.md`: none of the words the app does
not use (palette, preset, firmware, lamp, zone and the rest), no "please", "successfully" or "oops", British
spelling, the 24-hour clock in text and in date formats, and no exclamation. That a light is called a light and
never a device is a matter of meaning, and stays with review.
Why: BR-5 and BR-6. Two slips, "Name of the palette" and "each device on the network", had passed every check.
Date: 2026-11-04

**D74. One icon canvas and one icon line**

Chosen: `ICON_CANVAS` 14 and `ICON_STROKE` 1.2, in `src/design-system/icons.tsx`. Every icon of the set is drawn on
the 14 by 14 canvas with the 1.2 line; a glyph smaller than the canvas sits at its middle, so every icon takes the
same box beside a word. The grip joins the frame, in `--text-5` with no opacity. `icons.test.ts` renders every icon
and fails on another canvas, another line or an opacity. Edit's own line drawings, its wave shapes, still take their
own canvas through `IconFrame`, as they are drawings and not icons of the set.
Why: BR-8. The set had ten canvases and four line weights.
Date: 2026-11-04

**D75. Edit's text is no fainter than `--text-4`**

Chosen: words in Edit, dim ones included, are `--text-4` or brighter, and the blend chip is `--text-3`. `--text-5`
stays for disabled words, icons, meters, the scrollbar and the stage dots, which are not text a person must read.
Why: axe found 45 places in Edit under the contrast minimum, most of them `--text-5` words. After the change it finds
none, on the phone and the laptop, dark and light.
Date: 2026-11-04

**D76. Edit draws its controls from one folder, and its gate says so**

Chosen: `packages/patch-editor/src/ui/controls` holds Edit's `Key`, `Pill`, `IconKey`, `Toggle`, `Field` and
`Choice`, and is the only place in Edit that writes a `<button>`, `<input>`, `<select>`, `<textarea>` or `<a>`.
`Field` and `Choice` need a `label`, and `IconKey` needs one too, which a pointer also shows. `lint:rules` in the
package (`scripts/edit-rules.mjs`) fails a raw control anywhere else, a `:hover` outside `@media (hover: hover)`, a
box-shadow edge written in pixels rather than `--line` or `--line-strong`, and a height or width in pixels that equals
a size token. Edit keeps its own `Key` rather than the design system's `Press`, because `Press` takes no `title`, `ref`,
data attributes or pointer handlers, which Edit's rows need.
Why: TL-5, ST-5, GE-4 and GE-10. Edit had 62 raw buttons, 18 raw fields and menus, 19 bare hover rules and 7 raw edges.
Date: 2026-11-04

**D77. Edit's choice row is the app's `OptionRow`**

Chosen: Edit's `Seg` draws `OptionRow` from the design-system door, set closer and in note type to sit inline with
what it sets. It takes a `label`, which names the group for a screen reader.
Why: CM-4. The two did one job twice.
Date: 2026-11-04

**D78. A toggle in Edit shows on with the selected mark, not a wash**

Chosen: `Toggle` (mute, solo, a wired source, a kept part of a roll) is `--text-4` when off and wears `Picked`, the one
selected mark (D48), when on. It says so with `aria-pressed`.
Why: CM-4. A wash is how Edit says a thing is raised; on a toggle it said "chosen" a second way.
Date: 2026-11-04

**D79. One inline message**

Chosen: Edit's inline messages (a control that cannot be saved, a dead modulator, a warning on a row, a fragment left
behind, a palette store error) are the composites' `LookProblem`. Edit's `.warnline` is gone.
Why: CM-2. There were two forms of one message.
Date: 2026-11-04

**D80. Edit's dials and layers move by keyboard**

Chosen: a dial is a `slider` with its range and value text. The arrows step a hundredth of the sweep, Shift a
thousandth, Page Up and Page Down a tenth, and Home and End go to the two ends, all in the dial's taper, so a key moves
as evenly as a drag. A layer's grip is a key, "Move Layer 2": the up and down arrows move the layer one place, and the
focus goes with it. Stories check both.
Why: NA-17. Both were pointer only.
Date: 2026-11-04

**D81. Nothing in Edit is only on hover**

Chosen: Edit has no `title` tooltip and no SVG `<title>`. Edit's keys, fields and text props do not take one. A name
that does not fit wraps instead of being cut off. A reason shows as text in its row. A key that is only an icon has its
accessible name, and a dial's help is an SVG `<desc>`. Edit's gate fails on a `title`, an ellipsis or a line clamp.
Why: CM-8, DA-14. A finger cannot hover, and about 80 tooltips held words a phone never showed.
Date: 2026-11-04

**D82. Edit's words follow voice.md, checked by its gate**

Chosen: the voice rules a machine can check live in `docs/design-system/voice-rules.json`, and Edit's gate checks
every word Edit shows against them. A layer's colours are "colours"; only "palette store" keeps "palette". A set of
control positions kept under a look is a "variation", never a "preset". The save form's fields have labels.
Why: BR-5, BR-6, FO-1. `scripts/lint/rules.mjs` runs its checks when it is imported and exports nothing, so Edit
could not import them. The root rules should read the same JSON file, so there is one list.
Date: 2026-11-04

**D83. Edit's popovers move like the app's dialogs**

Chosen: the control menu, the control editor and Edit's toast sit in the app's `Presence`. They rise in with
`--duration-enter` and `--ease-enter`, and sink out with `--duration-exit` and `--ease-exit`. Under reduced motion
they only fade. `transitions.md` lists every motion in the app and in Edit.
Why: TR-1, TR-4. They appeared and vanished with no motion.
Date: 2026-11-04

**D84. Edit's tabs are a tab list, and its rows and tiles take keys**

Chosen: `Tabs` is a `tablist`. Only the chosen tab is in the Tab order, and the arrows, Home and End choose another.
A layer's name is a key that chooses the layer. A modulator tile takes focus: Enter opens it, and Space picks it, so
Enter on a focused setting binds it. Escape lets go. Tiles do not reorder, because their order is the slot number,
which is the address. Stories check all three.
Why: AC-5, AC-8, CM-10, NA-17. Each was pointer only.
Date: 2026-11-04

**D85. Edit names its own sizes**

Chosen: every height, width and offset in Edit is a token. Edit uses the design system's token where one means the
same thing. Otherwise it uses one of its own, defined in a single `:root` block at the top of its `styles.css` and
named for the part in full words, such as `--edit-tile-width`. Rows are at least `--space-1` apart. The half step
stays inside one small thing (D69). Edit's gate fails on any raw length, and it runs every check and reports all
the failures in one run.
Why: GE-10, SP-1, SP-2. About 90 sizes were written by hand, and the half step was used between rows.
Date: 2026-11-04

**D86. Undo lasts the same time in Edit as in the app**

Chosen: Edit's undo offer lasts `UNDO_SECONDS` from the design-system door, 10 seconds, as the app's does.
Why: ST-13, AC-14. Edit's lasted 6 seconds.
Date: 2026-11-04

**D87. The iPhone's back swipe walks back through the app's screens**

Chosen: the iPhone shell turns on the web view's back and forward swipe, in `ios/App/App/AppViewController.swift`.
A swipe from the left edge goes back one screen, the same as the back key and the device's Back. Each screen has
its own history step, so the swipe has somewhere to go.
Why: NA-6, NA-7. A swipe from the edge did nothing on the iPhone.
Date: 2026-11-04

**D88. Offsets are tokens too**

Chosen: `lint:rules` reads `inset`, `top`, `right`, `bottom`, `left`, `scroll-margin`, `scroll-padding` and
`outline-offset` in the app's style sheets and inline styles, and fails a raw length. A negative offset is
`calc(-1 * var(--token))`. The room to clear a sticky heading is `--clear-sticky`.
Why: TO-2, SP-1. Offsets were the last lengths written by hand.
Date: 2026-11-04

**D89. A light moves in a list by keys**

Chosen: the grip of a light in Rename and arrange is a key named "Move" and the light's name. The up and down arrows
move the light one place, and the focus stays on its grip. A drag still works.
Why: AC-5, NA-17. A light could only be moved by a drag.
Date: 2026-11-04

**D90. The component page says how each component is used**

Chosen: each component on the page has five short notes: its parts, its keys, its role, one thing to do and one not
to. The first state is drawn again in a focus state, with the one focus ring worn through `data-focus-visible`.
Loading and error states are named so. There is no hover state, because the app has no hover look. `lint:rules`
fails a component with no notes.
Why: ST-1, CM-7. The page showed states only, and nothing showed the focus ring without a keyboard.
Date: 2026-11-04

**D91. Every token pair passes contrast**

Chosen: `lint:rules` works out the contrast of each word and mark token on each ground, in dark, light and more
contrast, and fails text under 4.5:1 and marks and edges under 3:1. To pass, the danger red, the off thumb and
light's quiet words are darker in light and lighter in dark. Hairlines on `--track` are not checked, because they
only divide.
Why: TL-11. Sixteen pairs failed, among them the danger red on a strong wash in dark.
Date: 2026-11-04

**D92. One undo time for the whole app**

Chosen: `UNDO_SECONDS`, 10, exported from the design-system door, is how long an undo stays on offer. The app's
store and Edit use it.
Why: ST-13, AC-14. The time was written in two places.
Date: 2026-11-04

**D93. Edit's sizes live with the app's tokens**

Chosen: the `--edit-*` sizes move from the `:root` block of Edit's `styles.css` to the first `:root` of
`src/design-system/design-system.css`, under a comment that names them. Edit's gate now fails on any custom property
that holds a length in `styles.css`. D85 still holds for how they are named.
Why: TO-1, LIFE-1948. Tokens lived in two files.
Date: 2026-11-04

**D94. Edit shows no codes, and the voice check reads more**

Chosen: Edit's colour rows drop the hex code field. The swatch opens the picker, which sets the colour. Edit's error
screen and connection notes say what happened and what to do, with no node names, ids or "fw". Both voice checks
also read a one-word label (a capital, then small letters), and fail "node", "fw", a sentence over 25 words and
three capitalised words in a row.
Why: BR-5, BR-6, LIFE-1956. "Palettes", "Pick another device" and "a device over the mesh" passed the check,
because they sat in a record, a template or a function.
Date: 2026-11-04

**D95. Storybook is the catalogue**

Chosen: Storybook 10 (`npm run storybook`, port 6006) shows the tokens, every component of the two doors and of
Edit in each state, and the real screens on the made-up lights of `?demo`, on the phone and laptop sizes. The
stories sit in `stories/`, outside the three layers, and import the doors. A component's story draws its specimen
and notes from `src/domain/screens/component-page`, so Storybook and `?components` show the same thing until the
page goes. In Storybook the screens answer `/api` in the page, as on the phone, so no light is reached.
`lint:rules` fails a component with no story (`missing-story`).
Why: TL-2, TL-6, LIFE-1986. Ruan: "I want the entire illumigoon app's ui inside storybook for quick prototyping and
eval". The component page could not show a screen at a phone size, a token, or a prototype made of components.
Date: 2026-11-09

**D96. The sound mark is a musical note**

Chosen: `SoundMark` draws a musical note in place of three bars, 12 px tall.
Why: Ruan, 9 Nov 2026: "sound mark should also be a note".
Date: 2026-11-09

**D97. No status mark**

Chosen: `StatusMark` is deleted. A light's strip shows whether it is on, and its note says when it does not answer.
Why: Ruan, 9 Nov 2026: "status mark? is that really even relevant.... the light strip already has that info". No
screen used it. One fact in one place.
Replaces: D51.
Date: 2026-11-09

**D98. Keys have ranks**

Chosen: `TextKey` takes `rank`. A primary key is filled with ink, one on a screen or sheet at most: the main action
of a sheet, such as SAVE. A secondary key is framed by a dim line: an action that opens or changes something here,
such as EDIT on a room's look. A key with no rank stays words only.
Why: Ruan, 9 Nov 2026: "the buttons look too much alike.... its literally just text... theres no primary button and
secondary buttons", "the keys need to be better differentiated". Tried in Storybook, Prototypes / Room with looks
first.
Date: 2026-11-09

**D99. The power key is the power symbol**

Chosen: `PowerKey` draws the power symbol in thin line, --row each way. Off, it is dim. On, a bright line draws
itself over it in --duration-draw and glows. It stays a switch for a screen reader. It shows no look.
Why: Ruan, 9 Nov 2026: "I dont like the power key", "the power key should be simple it shouldnt show the look", "I
do like the simbol more". Rejected in the prototype: ON/OFF word keys, a split key, a rounded square and a pill
filled with the look's light.
Replaces: the sliding switch.
Date: 2026-11-09

**D100. A piece of light travels round a ranked key**

Chosen: a short bright piece of line travels round a primary or secondary key once in --duration-travel, over the dim
frame, and outside the fill of a primary key. It stops for a disabled key and for reduced motion.
Why: Ruan, 9 Nov 2026: "theres no animations.... a super minimalist app like this should have cool animations", then
"Plain outline" over a band of wire mesh.
Date: 2026-11-09

**D101. A destructive key has its own rank**

Chosen: `TextKey` takes `rank="destructive"` for a key that deletes, forgets, resets or removes: words only, in the
danger colour --bad, with no frame and no travelling light. It is never primary, because the rank has one value. An
action with undo acts at once; one without undo asks for a second tap through `ArmedKey`, which says TAP AGAIN TO
and its word. Used on DELETE (scenes, looks, recordings), FORGET, RESET on a light, and REMOVE on a schedule.
Why: LIFE-1988. Apple, Carbon, Polaris and Geist all mark a destructive action apart, and Apple says it is never the
main action. Before this, DELETE looked like any key, and --bad was in no key.
Date: 2026-11-09

**D102. A group shows three keys, and MORE holds the rest**

Chosen: `KeyGroup` takes the keys that always show as children, most used first, and the rest in `more`. While the
group has three keys or fewer, all show. With more, the children show and a MORE key with three dots opens a menu of
the rest. A pair of arrow keys that move a thing counts as one control. The main action never goes in `more`. In the
menu, a destructive key without undo asks for a second tap as `ArmedKey` does.
Used on the scene shelf (MANAGE, + SAVE; UPDATE and RECENT fold) and a look of Mine (RENAME, COPY; EXPORT and DELETE
fold).
Why: LIFE-1988. Carbon puts actions over three in an overflow menu, and Apple uses a pull-down button for the same.
Before this, the scene shelf had four keys in its heading row.
Date: 2026-11-09

**D103. lint:rules fails a second primary key**

Chosen: a screen or sheet is one file, so `lint:rules` fails a file in the layers with more than one
`rank="primary"`.
Why: LIFE-1988. D98 wrote the rule, and nothing kept it. Carbon allows one primary action per page. Proved with a
second primary key added to save-scene-sheet.tsx, which the check failed.
Date: 2026-11-09

**D104. A key that shows only an icon has a label**

Chosen: `TextKey` takes `label`, the name a reader hears. `lint:rules` fails a `TextKey` or `Press` whose only child
is an icon and that has no label. An icon stands alone only where its meaning is common: an arrow to move, three dots
for MORE, the power symbol. Anything else says a word.
Why: LIFE-1988. Carbon and Material require a name on an icon-only button. The arrow keys in the colour editor had
none. Proved with an icon-only key added to save-scene-sheet.tsx, which the check failed, and one with a label, which
it passed.
Date: 2026-11-09

**D105. Work under way shows a running light**

Chosen: `Activity` is a hairline with a piece of light that runs along it in --duration-activity, a progress bar with
no value for a screen reader. It shows under the words that say what is under way: a light's software update, and a
light sought by its address. A strip that waits for its recording has a soft light that sweeps over its slot. With
reduced motion the line pulses and the strip stays still.
Why: LIFE-1989. Apple shows an activity indicator for work with no known end, and Polaris has Spinner and
Progress. Before this, nothing in the app moved while a light updated. A running light keeps to the app's one motif,
the light (LIFE-1993), where a spinner would not.
Date: 2026-11-09

**D106. An empty list says what is missing, and its one step**

Chosen: `EmptyState` holds a short title in body type and, only when the step is not plain, the one step under it.
Used on Recent. Favourites keep only their heading and key, since the star on Looks is plain (9 Nov 2026).
Why: LIFE-1989. Polaris gives an empty state one clear first step. Ruan asked on 9 Nov 2026 for no hint that states
the obvious, so the step is there only when it is not.
Date: 2026-11-09

**D107. Motion has a productive kind and an expressive kind**

Chosen: the tokens for press, settle, push, enter and exit are productive: quick, for what happens often. Expressive
motion, --duration-expressive, is for the few big moments: a room's strip glows once when a new look starts on it,
and a part the light took glows once (`[data-feedback='took']`). A part the light refused shakes
(`[data-feedback='refused']`). The parts of a room or page that opens rise in one after another, --stagger-step
apart, up to eight. A press and a colour slot spring with --ease-spring, in a transition, so a new change starts from
where the part is. Every one has a reduced-motion version in transitions.md.
Why: LIFE-1990. Carbon splits productive and expressive motion. Fluent staggers what enters. Material 3 Expressive
and Apple use springs that can be caught part-way. Apple says to keep motion off what happens often, so the
expressive kind stays on rare moments.
Date: 2026-11-09

**D108. No shared element between screens**

Chosen: no part moves from a room card into the room screen. The push from the side links the two.
Why: LIFE-1990. Fluent's container transform suits a card that grows into a page. The room screen slides in as an
iPhone navigation push, which Apple uses for a step down a hierarchy, and Home stays mounted under it, so a part
flying between the two would fight the push. Look again if the room screen ever opens in place.
Date: 2026-11-09

**D109. Haptics follow a role table**

Chosen: `feel(role)` in `src/domain/store/haptics.ts` is the one way the app taps the finger, through
`@capacitor/haptics`. The roles: power on or off is a light impact; a look or scene picked is a medium impact; a hold
that starts a preview is a heavy impact; a change the light refused is the error notification; a delete, forget or
reset is the warning notification. A fader, a scroll and a colour pick have none, since they fire many times a
second. The laptop, and an iPhone build from before the plugin, stay silent.
Why: LIFE-1991. Apple pairs visual feedback with haptics and keeps them off frequent events. Reviews name haptics as
what sets Things 3 apart. The plugin is native, so it reaches the iPhone with the next app build from
`ios-app.yml`, not with a web update.
Date: 2026-11-09

**D110. A change to a light is sent, then answered or refused**

Chosen: one pattern for power, level, a look and a scene.

- Sent: the screen shows the new state at once, with the haptic of its role (D109). The app holds that state for
  `LOCAL_WRITE_HOLD_MS`, because the next heartbeat can still carry the old value. A light whose socket is down keeps
  the write and gets it when it is back (LIFE-1931); its card already says that it does not answer.
- Answered: the first heartbeat after the hold agrees with what was asked (`answerOf` in `light-answer.ts`). Nothing
  more shows, because the strip already shows it and the light itself is in the room.
- Refused: that heartbeat disagrees. The screen goes back to what the light says, the light's strip shakes once (dims
  once with reduced motion), and the finger feels the error haptic. The room's strip on Home shakes if any of its
  lights refused.
- No answer: a light that stops sending heartbeats is offline, and the room card names it as a light that does not
  answer. That fact stays in that one place.

A light reports power and brightness, not its look, so a look and a scene are judged by the power that rides on the
same write. A change made from another phone during the hold can show as a refusal; this is rare and costs one shake.
Why: LIFE-1992. Reviews criticise Nanoleaf because its app never confirms that a change was taken, and LIFX users
report scenes sent twice. A silent answer keeps the app quiet when all is well, so a refusal stands out.
Date: 2026-11-09

**D111. The LED strip is the one signature**

Chosen: the app's identity is the light itself, drawn as the LED strip. It is the only colour on a screen and the
only part that moves without a touch.

- It appears only where it stands for a light or a look: a room card, a light card, a look tile, a scene row, and the
  strip that waits while the app looks for lights. It is drawn through `LookStrip`, so it always shows a real look.
- It never decorates: no strip as a divider, a background, a header, a splash or an empty page.
- No second motif joins it: no logo mark in the screens, no coloured accent, no tinted panel.
- `lint:rules` reports `strip-outside-a-light` for a `<LedStrip` outside `look-strip.tsx` and the component page.
  Proved with a strip added to room-summary.tsx, which the check failed.

Why: LIFE-1993. Monochrome products keep one owned device each: Nothing has its Glyph lights, Teenage Engineering its
instrument face. The strip is the product, it already moves, and it is already the app's only colour.
Date: 2026-11-09

**D112. Geist stays, as the quiet face**

Chosen: `--sans` stays Geist and `--mono` stays Geist Mono (D8). The type is a quiet carrier for names and numbers.
The identity is the strip (D111), so the type does not try to carry it.
Why: LIFE-1993 asked whether Geist makes the app read as Vercel. Few people outside web work know the face, and a
face of our own would add a licence or a drawing job for no gain the strip does not give. A change of face would
also need every type token tuned again and a check on the iPhone. Geist Mono's even figures keep levels and times
from moving as they change. Revisit if a person says the app looks like another product.
Date: 2026-11-09

**D113. Icon set rules**

Chosen, in one place for the set in `src/design-system/icons.tsx`:

- Stroke: one line, `ICON_STROKE`, in `currentColor` or the one colour given. No fill, no opacity (D74).
- Size: one square canvas, `ICON_CANVAS`; a smaller glyph sits at its middle. `size` scales the whole drawing.
- Corner: round caps and round joins on every line, set in `IconFrame`.
- When an icon is allowed: beside a word, or alone where its meaning is common (an arrow to move, three dots for
  more, the power symbol, a cross to close), and then with a label (D104). Never as decoration, and never a second
  icon for a fact a word already says.
- New icons join `Icon` and are drawn in `IconFrame`; Edit's wave drawings take their own canvas (D49).

`icons.test.ts` holds every icon to the canvas, the line, no opacity, and the round caps and joins.
Why: LIFE-1993. Things and Apple keep one line weight and one corner across the set. D2, D49, D74 and D104 held parts
of this; the corner and when an icon may appear were not written.
Date: 2026-11-09

**D114. A key that can be held carries a dot**

Chosen: `Press` marks a key with `onHold` as `data-holdable`. The key carries one small dot (`--hold-mark`) at its
bottom left, in `--text-4`. While a finger is down the dot grows along the bottom edge over `--duration-hold`, the
same 400 ms as `HOLD_MS`, and it reaches the far side as the hold starts. A tap lets go before that, so the dot
shrinks back. A place key carries it at the top, clear of the iPhone's home bar. A light card holds by its name and
its strip, and only the strip carries the dot. With reduced motion the dot does not grow and fills the edge when the
hold starts. This replaces the words "Tap to play. Hold to try." on Looks and Recent.
Why: LIFE-1997. Ruan asked for holdable keys to be marked. A hold that only words explain is hidden, and the words
were removed as obvious hints. The growing dot also shows how long to keep the finger down.
Date: 2026-11-09

**D115. The power symbol is for power alone; a setting takes a SettingSwitch**

Chosen: `PowerKey` stays on the controls that turn lights on or off: Home's room cards, the room's level row and
each light card. Every other on or off setting (a look's Blend, Auto update, the room lock and the app settings)
takes `SettingSwitch`: a ring that is a dim outline when off and fills when on. `ToggleRow` draws a SettingSwitch. (Edit keeps its own `Toggle` for mute and solo, D82.)
Why: Ruan, 10 Nov 2026: "the power button is only for power stuff". A power symbol on Blend says that Blend turns
something off. The sliding switch was rejected for power (D99), so the SettingSwitch is a mark of its own.
Date: 2026-11-10

**D116. No long grey lines**

Chosen: a text field has no line under it; its placeholder and its caret show where it is. The place bar has no line
on its top or side, the laptop's room column has none on its edge, and Edit's rows, wells and panels have none
between them. Space separates them. A fader's track and the activity line stay, since they are the control itself.
Why: Ruan, 10 Nov 2026: no line on the search bar or anywhere. This extends "No dividers" (9 Nov 2026).
Date: 2026-11-10
