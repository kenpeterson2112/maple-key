# Maple Key redesign handoff: Crisp orchard + mobile first

> Read this file and `CLAUDE.md` before starting. This handoff covers the visual
> refresh and mobile overhaul that Ken agreed on in planning (2026-11-06).
> Work on a branch (`redesign/crisp-orchard`), not on `main`. Vercel auto-deploys `main`.

## 0. Ground rules

- **Mobile first.** Write the base styles for a ~375px viewport, then add `md:` / `lg:` for larger screens. Test at 375, 390, 768 and 1280 widths.
- **No hardcoded colours.** This rule is already in `CLAUDE.md`, and it's broken roughly 700 times. Every colour has to come from a token.
- **No em dashes** in any user-facing copy you write.
- **Phases ship as separate PRs**, in order. Each PR must pass `pnpm typecheck` and `pnpm build`.
- **Don't change meaning-carrying colours.** The `--signal-1..4` assessment scale (orange, yellow, light green, dark green) stays as it is in both modes.
- **Update `CLAUDE.md`'s design system section** in the same PR as any token or font change. It's the shared contract with Claude Design.
- Verify PDF exports (`jspdf` / `student-activity-pdf`) after every font or colour change. `CLAUDE.md` explains why.

## 1. Decisions already made (don't relitigate)

| Topic | Decision |
|---|---|
| Palette | **Crisp orchard**: bright autumn. Apple red primary, teal secondary, goldenrod pop. It should feel fresher and brighter, not brown. |
| Dark mode | **In scope now**, with a warm dark palette (not greyscale) and a working toggle |
| Display font | **Replace Alteix Sans** (a demo licence with watermarked digits and punctuation) with a free Google font. Compare Bricolage Grotesque and Fraunces (see §4). |
| Teal's role | **Secondary actions**: outline buttons, text links, the active tab indicator, focus accents |
| Goldenrod's role | **Pop only**: badges, "new"/bookmarked dots, small highlights. Never use it for body text (contrast). |
| Mobile nav | **Bottom tab bar** for Plan / Search / Track / Lessons |
| Sign-in | **Split hero**: a colour panel plus the form. Stacked on phones, side by side on desktop. |
| First pass scope | Foundation (tokens + hex cleanup) + mobile shell + sign-in. The other screens follow. |

## 2. Palette tokens

Replace both blocks in `src/index.css` (`:root` and `.dark`). Hex values are fine in Tailwind v4. If you'd rather keep OKLCH for consistency, convert them and check the round trip.

### Light (`:root`)

```css
--background: #FFFDF8;        /* warm near-white, replaces cream #FAF3E0 */
--foreground: #2A1E1A;
--card: #FFFFFF;
--card-foreground: #2A1E1A;
--popover: #FFFFFF;
--popover-foreground: #2A1E1A;

--primary: #E8432F;           /* apple red */
--primary-hover: #D13521;
--primary-foreground: #FFFFFF;
--primary-tint: #FDE7E3;      /* chips, selected rows */

--secondary: #14A889;         /* teal, for fills and borders */
--secondary-strong: #0D6E5A;  /* teal for text and links (AA on white) */
--secondary-foreground: #FFFFFF;
--secondary-tint: #DDF5EE;

--pop: #FFC53D;               /* goldenrod */
--pop-foreground: #5A3E00;    /* text on goldenrod */
--pop-tint: #FFF3D1;

--muted: #F7EFE8;
--muted-foreground: #7A6A61;  /* replaces #888, #666, #A8998E */
--accent: var(--secondary-tint);
--accent-foreground: var(--secondary-strong);
--destructive: #C62828;
--destructive-foreground: #FFFFFF;
--border: #F1E2D6;            /* replaces #E8D5C4 */
--border-strong: #E3CDBC;
--input: #FFFFFF;
--ring: #14A889;              /* teal focus ring */
--radius: 0.875rem;
```

### Dark (`.dark`): warm cocoa, not grey

```css
--background: #1C1714;
--foreground: #F5EDE6;
--card: #262019;
--card-foreground: #F5EDE6;
--popover: #2D2620;
--popover-foreground: #F5EDE6;

--primary: #FF5A43;           /* lifted so it stays vivid on dark */
--primary-hover: #FF7360;
--primary-foreground: #1C1714;
--primary-tint: #3D211C;

--secondary: #2DD4AE;
--secondary-strong: #5FE3C3;
--secondary-foreground: #0B2A23;
--secondary-tint: #15332C;

--pop: #FFC53D;
--pop-foreground: #3A2800;
--pop-tint: #3A2F14;

--muted: #2D2620;
--muted-foreground: #B3A498;
--accent: var(--secondary-tint);
--accent-foreground: var(--secondary-strong);
--destructive: #EF5350;
--destructive-foreground: #1C1714;
--border: #3A3029;
--border-strong: #4A3E35;
--input: #2D2620;
--ring: #2DD4AE;
```

Register every new token in the `@theme inline` block (`--color-primary-hover`, `--color-primary-tint`, `--color-secondary-strong`, `--color-secondary-tint`, `--color-pop`, `--color-pop-foreground`, `--color-pop-tint`, `--color-border-strong`) so utilities like `bg-pop-tint` work.

**Contrast check:** before merging, run a quick script that checks WCAG AA (4.5:1 for body text, 3:1 for large text and UI) for every foreground/background pair above, in both modes. Fix the values if any pair fails, and note the changes in the PR.

## 3. Phase 1a: hex cleanup (the important one)

Most of the current look comes from hardcoded Tailwind arbitrary values, not tokens. If they stay, the new palette and dark mode will only half apply.

### Worst offenders, by file (count of 6-digit hex values)

`lesson-planner/setup-steps.tsx` 49 · `mobile-filters-drawer.tsx` 40 · `assessment-modal.tsx` 31 · `sidebar-filters.tsx` 28 · `user-materials-section.tsx` 27 · `curriculum-filter-bar.tsx` 26 · `top-nav.tsx` 23 · `results-section.tsx` 22 · then a long tail. Run `grep -rnE "#[0-9A-Fa-f]{3,6}\b" src --include=*.tsx` to get the full list.

### Mapping table

| Current hex (approx. uses) | Was used as | Replace with |
|---|---|---|
| `#E8D5C4` (124) | borders | `border-border` |
| `#2C2C2C` (98), `#444`, `#555` | body/heading text | `text-foreground` |
| `#8B4513` (97) | saddle-brown headings/labels | `text-foreground` for headings; `text-secondary-strong` when it marks an interactive label |
| `#FF6B35` (88), `#D9742A`, `#EA580C`, `#C65D3B` | brand orange | `bg-primary` / `text-primary` / `border-primary`; hover uses `primary-hover` |
| `#888` (57), `#666`, `#999`, `#A8998E` | secondary text | `text-muted-foreground` |
| `#FAF3E0`, `#FFF5ED`, `#FFF6EC`, `#F5F5F5` | page/section backgrounds | `bg-background` or `bg-muted` |
| `#FFE5CC` (27) | orange tint chips | `bg-primary-tint` (or `bg-pop-tint` if it marks a highlight rather than a selection) |
| `#4CAFB5`, `#849657` | ad hoc teal/olive | `secondary` family |
| `#166534`, `#16A34A`, `#CA8A04` etc. | status / assessment | the `signal-*` tokens if it's assessment level; otherwise add `--success` / `--warning` tokens rather than leave hex |
| `#7C3AED`, `#A21CAF` | subject/category colours | Leave them, but move them into named tokens (`--subject-*`) so dark mode can adjust them |

When a hex value doesn't fit cleanly, **add a token, don't keep the hex**. Explain any new token in the PR description.

Also replace `bg-white` with `bg-card` and `text-black` with `text-foreground`; both break dark mode.

**Acceptance:** `grep -rnE "\[#[0-9A-Fa-f]{3,6}\]" src` returns nothing (or only documented exceptions in PDF export code, where CSS variables can't reach).

## 4. Phase 1b: typography

1. Remove the `@font-face` for Alteix Sans and delete `public/fonts/AlteixsansRegulardemo-E4j1n.otf` (and the `docs/fonts` copy on the next Pages build).
2. Load the candidates from Google Fonts with `display=swap`:
   - **Bricolage Grotesque** (500/700): friendly, modern, slightly quirky. This is the lean.
   - **Fraunces** (soft, 600): warmer and more editorial.
3. Build a throwaway `/dev/type` route or Storybook-style page that renders the real home hero, a resource card title, the sign-in tagline and some numerals in both fonts. Screenshot both at 375 and 1280 and **ask Ken to pick** before committing. Default to Bricolage if he doesn't answer.
4. Set `--font-display` to the winner. The "letters only" restriction in `CLAUDE.md` no longer applies; remove that gotcha from the doc.
5. Body type stays Geist. Set the mobile base size to 16px so iOS doesn't zoom into inputs.

## 5. Phase 1c: dark mode wiring

`.dark` exists but nothing toggles it.

- Add a theme setting (System / Light / Dark) in `settings-modal.tsx`, saved to `localStorage` (`mk-theme`). Wrap storage access in try/catch.
- Apply it with an inline script in `index.html` that sets `class="dark"` on `<html>` **before first paint**, so there's no flash. "System" follows `prefers-color-scheme` and listens for changes.
- Add `<meta name="theme-color">` for both modes (`#FFFDF8` / `#1C1714`).
- Check every Radix dialog and popover, the Framer overlays, and the sticky headers/footers in dark mode. Pure-white hardcoded panels are the usual leak.

## 6. Phase 2: mobile shell

### Bottom tab bar (new: `src/components/bottom-tab-bar.tsx`)

- Shown below `md` (768px); hidden at `md` and above, where the existing desktop toggle stays.
- Four tabs from the existing `TOGGLE_ITEMS` in `top-nav.tsx` (Plan, Search, Track, Lessons). Lift that array into a shared module rather than duplicating it.
- Layout: `fixed bottom-0 inset-x-0`, `bg-card/95 backdrop-blur border-t border-border`, height 64px plus `padding-bottom: env(safe-area-inset-bottom)`. Add `viewport-fit=cover` to the viewport meta tag.
- Each tab: icon (24px) above a label (12px), with a minimum touch area of 48x48. Active tab shows the icon and label in `text-secondary-strong` with a 3px teal pill indicator above the icon. Inactive tabs use `text-muted-foreground`.
- When `isHome` is true, no tab is active.
- Add bottom padding to the main content (`pb-[calc(64px+env(safe-area-inset-bottom))]` below md) so nothing hides behind the bar.
- Hide the bar while a full-screen modal or the on-screen keyboard is open (`visualViewport` resize heuristic) so it doesn't cover inputs.
- Check for clashes with `back-to-top-button.tsx` and the sticky footer of the Acorn lesson remote (`stage-review-footer.tsx`). Lift those elements above the bar.

### Slim top header (mobile, `top-nav.tsx` ~line 158 onward)

- Left: the logo (taps go home). Right: a materials button and an account avatar.
- **Remove the hamburger menu** (`isMobileMenuOpen` block ~line 209). Its contents move to:
  - the space links into the bottom tab bar
  - settings, account and sign out into a bottom sheet opened from the avatar (Radix Dialog styled as a sheet, Framer slide-up, drag handle, closes on swipe down or backdrop tap)
- Make the header sticky, 56px tall, with `bg-background/90 backdrop-blur`.

### Global mobile hygiene

- Tap targets ≥ 44px everywhere: chips, filter pills, icon buttons.
- The mobile filters drawer (`mobile-filters-drawer.tsx`) becomes a bottom sheet with a sticky "Show N results" primary button.
- Use `min-h-dvh` instead of `min-h-screen`.
- No horizontal scrolling at 375px on any route. Check with DevTools at that width.
- Follow the repo's `zero-cls` habit: reserve space for status messages, loaders and errors so content doesn't jump.

## 7. Phase 3: sign-in page

Files: `src/components/account/account-space.tsx` (sign-in card around line 164; `signInWithGoogle` already exists) and `require-account.tsx`.

### Layout

**Mobile (<md), stacked:**

```
┌───────────────────────────┐
│ ← Back      (on red)      │
│ 🍁 Maple Key               │
│                           │  Hero panel, bg-primary, text white
│ Plan tomorrow's lesson    │  display font, 28px
│ in minutes.               │
│ Ontario-aligned resources,│  16px, white/90
│ ready to teach.           │
│ ● ● ●  (pop, teal, white) │  decorative dots
├───────────────────────────┤  panel bottom edge: 24px rounded overlap
│ Sign in                   │  form sheet, bg-card, rounded-t-3xl, -mt-6
│ Use your school Google…   │
│ [ Continue with Google ]  │  primary, full width, 52px, Google "G" icon
│ ──────── or ────────      │
│ [ you@school.ca        ]  │  52px input
│ [   Email me a link    ]  │  outline teal, full width, 52px
│ Privacy · Terms           │
└───────────────────────────┘
```

**Desktop (≥md), split:** a two-column grid at `min-h-dvh`. The left 5/12 is the red hero panel (text vertically centred, with an optional large soft leaf or abstract shape in `primary-hover` / `pop` at low opacity, built in CSS or SVG with no images). The right 7/12 has the form card centred, max-width 420px.

### Copy (no em dashes)

- Tagline: "Plan tomorrow's lesson in minutes."
- Sub: "Ontario-aligned resources, ready to teach."
- Helper under "Sign in": "Use your school Google account, or get a sign-in link by email. If your school invited you, use the address the invite went to."
- Keep the existing helper text logic if invite-specific copy already exists.

### States (reserve the space for them; no layout shift)

- **Sending:** the email button shows a spinner and "Sending…", and the input becomes read-only.
- **Link sent:** replace the email row in place with a teal-tint panel: a mail icon, "Check your inbox", "We sent a link to {email}. It expires in 1 hour.", and a "Use a different email" text button.
- **Error:** an inline message under the input in `text-destructive`, with `aria-live="polite"`.
- **Google redirecting:** the Google button shows a spinner and stays the same width.
- Validate the email client-side before sending.

### Accessibility

- The form `<h1>` is "Sign in". The hero tagline is a `<p>`, not a heading.
- The input has a visible `<label>` (it can be visually small) plus `autocomplete="email"`, `inputmode="email"` and `autocapitalize="off"`.
- Focus ring: 2px `ring` with offset, visible on both the red and white backgrounds.

### Acceptance

- At 375px, the Google button is visible without scrolling on an iPhone SE-height viewport (667px).
- Looks right in light and dark mode (in dark, the hero panel uses dark `--primary` and the sheet uses `--card`).
- Lighthouse mobile accessibility ≥ 95 on the sign-in route.

## 8. After this pass (don't start yet; noted for sequencing)

Each of these gets its own mobile pass in this order: home (`home-space.tsx`, `hero-personalize.tsx`), search (`resources-space.tsx`, `results-section.tsx`, `resource-card.tsx`; see `DESIGNER_HANDOFF.md` for the card brief), lesson planner (`lesson-planner-modal.tsx` and the `lesson-planner/*` steps, which should become full-screen steps on mobile), Track (`class-dashboard.tsx`, `curriculum-orb-dashboard.tsx`).

## 9. Definition of done for this handoff

- [ ] PR 1: tokens (light + dark), `@theme` registration, contrast report, `CLAUDE.md` updated
- [ ] PR 2: hex cleanup; the grep for arbitrary hex comes back empty
- [ ] PR 3: font swap after Ken picks; Alteix removed; PDF export checked
- [ ] PR 4: dark mode toggle with no flash on load
- [ ] PR 5: bottom tab bar, slim header, avatar sheet, filters sheet
- [ ] PR 6: sign-in split hero with all its states
- [ ] Each PR includes screenshots at 375 and 1280, in light and dark
