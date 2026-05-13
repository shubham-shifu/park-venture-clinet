# Shifu Ventures — Design Language System

**Scope:** Home (`index.html`) + About Us (`about.html`)
**Source of truth:** `css/shifu-ventures-staging.webflow.css` (167 KB) + 24 screenshots in `SV Website.pdf`
**Status:** Reverse-engineered from production code. Every value below is cited; nothing is invented.

> How to read this: each section names the **pattern**, then **what's true** (with file:line citation), then **how to apply** (the rule for new work). If something is not cited, it's an explicit observation from a screenshot — labelled "[PDF p.N]".

---

## 1. First principles (what makes this site feel like itself)

Five observations from spending real time inside the code + 24 screenshots:

| # | Principle | Where it shows up |
|---|---|---|
| 1 | **Dark canvas with subtle grid texture** — not flat black; the body always has a faint grid pattern overlay. | `body { background-image: url('../images/Body.svg') }` ([shifu-ventures-staging.webflow.css](css/shifu-ventures-staging.webflow.css) — Body.svg is 1262×4554 with a `pattern0` rect at 0.35 opacity) |
| 2 | **One accent colour, used surgically** — orange (`#f56e38`) only on hand-drawn underlines, L-bracket corners, active states, and the play icon. Never on body text. | `--_primitives---colors--brand-orange: #f56e38` (css :root) |
| 3 | **Frame-and-focus** — important / active content is wrapped by 4 orange L-bracket corner SVGs. This is the brand's visual signature. | `images/Vector-31.svg` (top-left) + `Vector-32` (top-right) + `Vector-33` (bottom-left) + `Vector-34` (bottom-right), applied via `.faq-focused-bg-copy` + `.focused-icon.*` |
| 4 | **Hand-drawn underline animation** — every section title has one or more words underlined by an animated SVG path (the "FlowDojo" `fd-svg-underline-text` attribute). | inline script in `about.html:174-234` |
| 5 | **Smooth, deferred motion** — Lenis-based smooth scroll + GSAP ScrollTrigger-driven section/heading reveals (`fd-section-reveal`, `fd-heading-reveal`, `fd-fade-reveal`, `fd-child-fade`). | webflow IX2 interactions + custom JS in `about.html:131-152` |

If a new page doesn't carry all five, it's off-family.

---

## 2. Foundation tokens

### 2.1 Colour primitives

All defined in the `:root` block of [css/shifu-ventures-staging.webflow.css](css/shifu-ventures-staging.webflow.css).

| Token | Value | Use |
|---|---|---|
| `--_primitives---colors--brand-orange` | `#f56e38` | THE accent. Used for: brand mark, hover bg on `.button`, `.nav-link-underline` colour, active-tab underline, `.faq-focused-bg` colour, `link-btn:hover`, accent inline `<em>` colour. |
| `--_primitives---colors--white` | `#fff` | Pure white. Used very sparingly — only for max-contrast text. |
| `--_primitives---colors--neutral-lightest` | `#eee` | The **off-white** that is the body's default text colour, button bg, and "cream" appearance everywhere. (Not `#fff`!) |
| `--_primitives---colors--neutral-darkest` | `black` | Used as page bg (via `--color-scheme-1--text`). |
| `--secondary-black` | `#0d0d0d` | Default button text colour. |
| `--dark-grey` | `#191919` | The navbar's container background — the pill that wraps the logo + links. |
| `--black-tertiary` | `#131313` | The 100-Companies grid card background. |
| `--cards-grey` | `#2a2a2a` | Generic card bg (rarely used directly). |
| `--grey-alternate` | `#3a3a3a` | Subtle dividers / dimmed accents. |
| `--dark-gray-border` | `#545454` | Border on the 100-Companies grid cards. |
| `--link-blue` | `#0055e8` | `.link-btn` default colour — the "Know More" style. (Yes, blue. The site uses real link blue for in-content text links.) |

> **There is no separate "cream" token.** What looks cream in screenshots is `#eee` (`neutral-lightest`).

### 2.2 Opacity tokens (the white opacity ladder)

| Token | Value | Common use |
|---|---|---|
| `--_primitives---opacity--white-5` | `#ffffff0d` | invisible-ish hairlines |
| `--_primitives---opacity--white-10` | `#ffffff1a` | very faint surfaces |
| `--_primitives---opacity--white-15` | `#ffffff26` | thin borders / dividers between FAQ rows, tabs etc. |
| `--_primitives---opacity--white-25` | `#ffffff40` | inactive tab underline (`.home_about_tab-link` border-bottom) |
| `--_primitives---opacity--white-50` | `#eeeeee80` | **secondary body text** (paragraphs, captions, inactive tab labels). Note: defined off `#eee`, not `#fff`. |
| `--_primitives---opacity--white-60` | `#fff9` | rarely used |
| `--brand-white-50` | `#eeeeee80` | duplicate alias for white-50 |
| `--brand-white-75` | `#eeeeeebf` | **navbar link colour** (`.navbar-link`) + journey card paragraph |
| `--paragraph-grey` | `#eeeeee80` | default body `p { color }` |

**Black opacities (used as overlays on imagery/video):**
- `--_primitives---opacity--neutral-darkest-45: #00000073` — the about-hero image overlay (over the video)
- Others 5/10/15/20/30/50/60 — used for hover overlays on cards.

### 2.3 Color scheme bindings

`:root` also sets:
```
--color-scheme-1--text:        var(--_primitives---colors--neutral-darkest)  /* black — bg */
--color-scheme-1--background:  var(--_primitives---colors--white)            /* white — unused on these pages */
--color-scheme-1--foreground:  var(--_primitives---colors--neutral-lightest) /* #eee — text */
--color-scheme-1--accent:      var(--_primitives---colors--neutral-darkest)
--color-scheme-1--border:      var(--_primitives---colors--neutral-darkest)
```

The page is "color-scheme-1" everywhere, which inverts `--text`/`--background` from their light-mode names — i.e. on this site `--color-scheme-1--text` is *the page background*, and `--foreground` (#eee) is the *text colour*. This is intentional but confusing; reading the CSS, remember **text** here means the canvas, not the words.

### 2.4 The L-bracket orange anomaly

The hand-drawn underline animation uses `#FF5B1A` as its default stroke colour ([about.html:180](about.html:180): `fd-svg-underline-color || "#FF5B1A"`). The L-bracket SVGs ([images/Vector-31.svg](images/Vector-31.svg) etc.) also hardcode `stroke="#FF5B1A"`. This is a slightly **brighter** orange than the CSS token `#f56e38`.

| | Hex | Where |
|---|---|---|
| Brand accent (most uses) | `#f56e38` | CSS variable |
| Underline + L-bracket stroke | `#FF5B1A` | Hardcoded inside SVG files |

Both look orange; up close they're noticeably different. Likely a legacy hex. When adding new orange marks, use the CSS variable unless you're hand-drawing an SVG underline (then match `#FF5B1A` so it harmonises with existing ones).

### 2.5 Typography — family

```
--_typography---font-styles--body:    Neuemontreal, Arial, sans-serif
--_typography---font-styles--heading: Neuemontreal, Arial, sans-serif
```

Same family for headings and body. Local `.woff2` files at [fonts/NeueMontreal-Light/Regular/Medium/Bold.woff2](fonts/), weights 300/400/500/700.

Default `body` styling ([css line ~ body block]):
- `letter-spacing: .01em` (subtle, present on body + all major headings)
- `font-size: 1rem` (16px)
- `line-height: 1.5`
- `color: var(--_primitives---colors--neutral-lightest)` (i.e. `#eee` — not pure white)

### 2.6 Typography — scale

All from grep of `css/shifu-ventures-staging.webflow.css`. Conversions assume `1rem = 16px`.

| Class | font-size | font-weight | line-height | Notes |
|---|---|---|---|---|
| `.heading-style-h1` | 3rem (48px) | 500 | 1.25 | letter-spacing `.01em` |
| `.heading-style-h1.is-44` | 2.75rem (44px) | 500 | 1.25 | letter-spacing **0** (overrides) — used on the About hero h1 |
| `.heading-style-h2` | 2.25rem (36px) | 500 (default body inheritance) | 1.25 | letter-spacing `.01em` |
| `.heading-style-h3` | 1.5rem (24px) | 500 | 1.5 | letter-spacing `.01em` |
| `.heading-style-h3.lh1` | 1.25rem (20px) | 500 | 1 | tighter variant |
| `.heading-style-h3-2` | 1.5rem (24px) | 500 | 1.5 | duplicate / variant |
| `.heading-style-h4` | 1.25rem (20px) | 500 (default) | 1.25 | letter-spacing `normal` (no `.01em` override) |
| `.heading-style-h4.foter` | 1.25rem | 500 | 1.25 | color: white, used in footer |
| `.heading-style-h4-2` | 2rem (32px) | 700 | 1.3 | bigger, bold variant |
| `.heading-style-h5` | 1.5rem (24px) | 700 | 1.4 | bold |
| `.heading-style-h6` | 1.25rem (20px) | 700 | 1.4 | bold |

**Text utilities (paragraph scale):**

| Class | font-size |
|---|---|
| `.text-size-large` | 1.25rem (20px) |
| `.text-size-medium` | 1.125rem (18px) — also sets `width: 506px` (fixed-width paragraph!) |
| `.text-size-regular` | 1rem (16px) |
| `.text-size-small` | 0.875rem (14px) |
| `.text-size-tiny` | 0.75rem (12px) |

**Font-weight utilities:** `.text-weight-light` (300) → `.text-weight-bold` (700) → `.text-weight-xbold` (800).

### 2.7 Emphasis / italic usage

From [PDF p.1-2, p.13, p.16]:
- Italic via `<em>` is used for **emphasis without underline** on phrases like *"$10M ARR"*, *"just 18 months"*, *"Shifu way"*, *"not traditional accelerators"*.
- The same `<em>` often *also* hosts the `fd-svg-underline-text` span — so the same word is **both** italic + orange-underlined.
- Italic alone (no underline) is reserved for callouts and small accent tags (e.g. *"Onboarding in 2026\*"* on the 100-Companies hero — [PDF p.6]).

**Rule:** any phrase the brand wants to single out gets italic. Layering: italic = soft emphasis; italic + orange underline = max emphasis.

### 2.8 Spacing — spacer utilities

All "spacers" are `padding-top` on a `width: 100%` block. Used as visual breathing room between elements.

| Class | padding-top (rem / px) |
|---|---|
| `.spacer-tiny` | 0.25 / 4 |
| `.spacer-xxsmall` | 0.5 / 8 |
| `.spacer-xsmall` | 1 / 16 |
| `.spacer-small` | 1.5 / 24 |
| `.spacer-medium` | 2 / 32 |
| `.spacer-large` | 3 / 48 |
| `.spacer-xlarge` | 4 / 64 |
| `.spacer-xxlarge` | 5 / 80 |
| `.spacer-huge` | 6 / 96 |
| `.spacer-xhuge` | 7 / 112 |
| `.spacer-xxhuge` | 10 / 160 |
| `.spacer-28` | 1.75 / 28 |
| `.spacer-56` | 3.5 / 56 — the canonical gap between section title block and content |
| `.spacer-60` | 3.75 / 60 |
| `.spacer-64` | 4 / 64 |

**Convention seen in code:** `.spacer-56` after a `.section-tabs-header` ([about.html:625, 994, 626]). `.spacer-60` after the careers section heading. `.spacer-32` and `.spacer-24` used inside hero stacks for the hero p / button gap.

### 2.9 Spacing — sections, containers, page padding

**Page horizontal padding** — always present at outermost level:
- `.padding-global` → `padding-left: 5%; padding-right: 5%;`
- `.padding-global.footer` → `padding-left: 1.25rem; padding-right: 1.25rem;` (footer is tighter)

**Container max widths** (centred via auto-margins):
- `.container-small` → `48rem` (768px)
- `.container-medium` → `64rem` (1024px)
- `.container-large` → `70.875rem` (1134px) — **the default**
- `.container-xlarge` → `76.375rem` (1222px) — used only in the footer

**Section vertical padding presets:**

| Class | top / bottom | Where |
|---|---|---|
| `.padding-section-small` | 3rem / 3rem | rarely |
| `.padding-section-medium` | 4.625rem / 4.625rem | "Our Journey" section in about (66 → 74 px) |
| `.padding-section-medium.is-top-100` | 6.25rem / 4.625rem | first section after hero |
| `.padding-section-large` | 5rem / 5rem | **canonical** for most content sections |
| `.padding-section-large.hero` | 7.75rem / 5rem | hero with extra top breathing room |
| `.padding-section-large.top-big` | 6.875rem / 6.875rem | bigger section |
| `.padding-section-large.top-big.bottom-200` | 6.875rem / 12.5rem | last section before footer |
| `.padding-section-about` | 9rem / 5rem | dense content sections (about page) |
| `.padding-section-custom.about-hero` | 1.75rem / 4.625rem | the About hero (tight top, loose bottom) |

**Composition rule (observed in [about.html:533-1101]):**
```
<section class="...">
  <div class="padding-global">                         ← horizontal page edge
    <div class="padding-section-{size}">               ← vertical section breathing
      <div class="container-{size}">                   ← centred max-width
        <div fd-section-reveal>
          <div class="section-tabs-header">            ← title + para (max-width 43.4rem)
            <h2>...</h2>
            <p>...</p>
          </div>
          <div class="spacer-56"></div>
          <!-- section content -->
```

There are two valid orderings of `padding-section-*` and `container-*`:
- `padding-global > container-large > padding-section-large` (about_layout — [about.html:622-625])
- `padding-global > padding-section-medium > container-large` (section-journey — [about.html:567-569])

Either works; pick one per page and stay consistent.

### 2.10 Radii

```
--_ui-styles---radius--small:  0.5rem   (8px)
--_ui-styles---radius--medium: 0px
--_ui-styles---radius--large:  0px
```

So the radius scale is essentially **8px or 0**. But specific classes override:

| Element | Radius |
|---|---|
| Buttons (`.button`) | 0.5rem |
| Navbar pill (`.navbar-container`) | 0.5rem |
| Cards / image wrappers (`.about_team_image-wrapper`, `.swiper-image-wrapper`) | 0.75rem (12px) |
| About hero video frame (`.header30_content`) | 0.5rem |
| Hero swiper image (`.hero-slider-image`) | 0.5rem |
| Tab content (`.about_layout_tab-content`) | 0.75rem |
| Form inputs | 0 |
| Mission grid cards (`.home_mission_image-wrapper-copy`) | inherits `--_ui-styles---radius--large` → 0 |

**Rule:** anything that holds an image / a "card" → 0.75rem. Buttons/pills/small UI → 0.5rem. Hard tech surfaces (numbered grid cells, form inputs) → 0.

---

## 3. The canvas (body)

```css
body {
  background-color: var(--color-scheme-1--text);   /* = black */
  background-image: url('../images/Body.svg');     /* faint grid pattern */
  background-position: 50% 0;
  background-size: cover;
  background-attachment: fixed;
  font-family: Neuemontreal, Arial, sans-serif;
  font-size: 1rem;
  line-height: 1.5;
  letter-spacing: .01em;
  color: var(--_primitives---colors--neutral-lightest);   /* = #eee */
}

p {
  color: var(--_primitives---opacity--white-50);   /* = #eeeeee80, white 50% */
  margin-bottom: 0;
}
```

**The grid texture is non-negotiable.** [PDF p.1, 3, 6, etc.] all show the subtle dot/line grid behind every section. It's a fixed-position background, so as you scroll the grid stays put — content moves across it. Sections do not set their own background colours; they let the body show through.

**Two background overrides only:**
1. About hero ([about.html:534]) has a video background → the video sits on top of the body grid.
2. Cards / specific contained surfaces have their own bg (see Cards section below).

**Text colour hierarchy** (rule when writing new copy):

| Level | Colour | Used for |
|---|---|---|
| Headings (h1-h6) | `#eee` (default body inheritance — actually `#fff` for most headings in practice) | Section titles, card titles, hero copy |
| Primary body | `#eee` | Lead lines in hero |
| Paragraph body | `#eeeeee80` (50%) | All `<p>` by default |
| Captions / muted labels | `#eeeeee80` (50%) | Image captions, footer secondary lines |
| Inactive tabs / dimmed nav | `#eeeeeebf` (75%) | Navbar link default |
| Accent / highlight | `#f56e38` | Underlines, focused brackets, hover states |

---

## 4. Navigation

**Structure** (verified in [about.html:417-486]):

```html
<div load-nav-reveal class="navbar-wrap">
  <div class="navbar w-nav" data-collapse="medium">
    <div class="navbar-container">
      <a href="index.html" class="navbar14_logo-link w-nav-brand">
        <div class="navbar14_logo w-embed"><svg>...rocket+SHIFU VENTURES wordmark...</svg></div>
      </a>
      <nav class="navbar14_menu w-nav-menu">
        <div class="navbar14_menu-link-wrapper">
          <div class="navbar14_menu-links">
            <a href="..." class="navbar-link w-inline-block [w--current]">
              <div>Home</div>
              <div class="nav-link-underline w-embed"><svg>...hand-drawn line...</svg></div>
            </a>
            <!-- 3 more links -->
          </div>
        </div>
      </nav>
      <div class="navbar14_menu-button w-nav-button">...</div>
    </div>
  </div>
</div>
```

**Styling rules** (from CSS):
- `.navbar`: `position: sticky; top: 0; margin: 0 5%` — pill floats over the page with margins.
- `.navbar-container`: `background: #191919` (dark-grey), `border-radius: 0.5rem`, `max-width: 70.875rem`, `padding` for the pill interior.
- `.navbar-link`: `color: #eeeeeebf` (75%), `padding: 0.325rem 0.125rem`, `line-height: 1`.
- `.navbar-link:hover`: `color: #fff`.
- `.nav-link-underline`: hand-drawn SVG path, `position: absolute; bottom: -4%; width: 100%`, `color: #f56e38`. **Hidden by default** (`opacity: 0` per [about.html:481]); shown only when parent has `.w--current` (`opacity: 1` per [about.html:482]).
- Variant `.nav-link-underline.b`: `bottom: -2%` (lifted slightly).

**Scroll behaviour** ([about.html:505-528]):
- The navbar gains `.nav--hidden` class (`transform: translateY(-100%)`) when the user scrolls down past `navbar.offsetHeight`. Slides back in when scrolling up.

**Mobile:** at `data-collapse="medium"` (Webflow default ~991px), the menu collapses into a hamburger; the `.w-nav-menu` becomes a panel toggled by `.w-nav-button`. `data-lenis-prevent` is added to the menu so Lenis doesn't intercept scroll within it.

**Order:** Home → Investors → About Us → Shifu Foundation. The Foundation link uses `target="_blank"` ([about.html:454]) — it goes to a different site.

---

## 5. Buttons

### 5.1 Base `.button`

```css
.button {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.625rem;
  background: var(--_primitives---colors--neutral-lightest);  /* #eee */
  color: var(--secondary-black);                              /* #0d0d0d */
  border: 1px solid var(--_primitives---colors--neutral-lightest);
  border-radius: 0.5rem;
  padding: 0.75rem 1.5rem;
  font-weight: 500;
  line-height: 1;
  text-decoration: none;
  transition: color 0.3s, background-color 0.3s;
}
.button:hover {
  background: var(--_primitives---colors--brand-orange);
  border-color: var(--_primitives---colors--brand-orange);
  color: var(--_primitives---colors--neutral-lightest);
}
```

**This is the primary button** — visible everywhere as "Co-Build with Us", "Watch Now", "Co-Build with Us →". Off-white pill, black text, padding ~12×24px. On hover, the whole button flips to orange with off-white text.

### 5.2 Variants

| Modifier | Effect |
|---|---|
| `.button.is-orange` | Orange bg + white text by default (skips the hover-to-orange transition). |
| `.button.is-alternate` | Border: white, bg: white, text: black. (Pure white version of the off-white button.) |
| `.button.is-secondary` | `background: transparent` — outline/ghost button. |
| `.button.is-secondary.is-alternate` | Transparent + white text. The "Our Ecosystem" left-rail button ([PDF p.7]). |
| `.button.is-small` | `padding: 0.5rem 1.25rem` (~ 8×20px). |
| `.button.is-icon` | `gap: 0.75rem` — extra room for the icon. |
| `.button.is-link` | Inline-style button: `background: transparent; border: none; padding: 0.25rem 0; line-height: 1;` |
| `.button.is-link.is-icon` | gap 0.5rem |
| `.button.is-diabled` (sic) | Greyed-out look, `cursor: not-allowed`. |

### 5.3 "Button with icon" pattern

Used for every primary CTA — the up-right diagonal arrow.

```html
<a data-wf--button--variant="button-with-icon" href="..." class="button w-inline-block">
  <div>Co-Build with Us</div>
  <div class="button-icon w-variant-d2a2fa23-a0c8-98e5-a757-ed61b6351ef0 w-embed">
    <svg width="100%" height="100%" viewBox="0 0 20 20">
      <path d="M15.625 5V13.125..." fill="currentColor"/>
    </svg>
  </div>
</a>
```

The icon is `currentColor` so it follows the button's text colour — black at rest, off-white on hover.

### 5.4 `.link-btn` — the subtle inline link style

```css
.link-btn {
  gap: 4px;
  color: var(--link-blue);   /* #0055e8 */
  font-size: 0.875rem;
  text-decoration: underline;
  display: flex;
}
.link-btn:hover { color: var(--_primitives---colors--brand-orange); }
```

Used for "Know More" inside hero swiper cards ([PDF p.1]). Blue underlined text + small arrow icon. Hover turns orange.

This is **the only place real blue appears on the site.** Pre-existing CMS convention; don't add new ones unless the link sits inside body copy.

---

## 6. Section structure (the canonical wrapper)

Almost every section follows this pattern. The example below is from the about page's careers section ([about.html:985-994]):

```html
<section class="section_about_team">
  <div class="padding-global">
    <div class="container-large">
      <div class="padding-section-large top-big bottom-200">
        <div fd-section-reveal class="about_team_component">
          <div class="section-tabs-header">
            <h2 fd-heading-reveal class="heading-style-h2">
              <span fd-svg-underline-text>Actively hiring</span> for these positions
            </h2>
            <p fd-fade-reveal>Work alongside founders and operators obsessed with building sustainable companies.</p>
          </div>
          <div class="spacer-60"></div>
          <!-- content -->
        </div>
      </div>
    </div>
  </div>
</section>
```

**Section header sub-pattern: `.section-tabs-header`**

```css
.section-tabs-header {
  display: flex;
  flex-flow: column;
  gap: 1rem;
  max-width: 43.4375rem;   /* 695px */
}
```

Constrains heading + para to ~695px so paragraphs stay readable. The h2 carries `fd-heading-reveal`, the p carries `fd-fade-reveal`.

**Alternative section header: `.section-header.right`**

Used when there's no paragraph subtitle — just the heading on its own ([about.html:571]):

```html
<div fd-heading-reveal class="section-header right">
  <div>
    <h2 fd-svg-underline-stroke="4" fd-svg-underline-text="scroll" class="heading-style-h2">Our Journey</h2>
  </div>
</div>
```

Note: here the `fd-svg-underline-text` is **on the h2** (whole heading underlined). In `.section-tabs-header` it's typically on a `<span>` inside the h2 (only the highlight phrase underlined). Both patterns are valid in production code; pick by feel:

| Pattern | Use when |
|---|---|
| Underline on whole h2 (`Our Journey`, `core values`) | Short heading, 1-3 words |
| Underline on span inside h2 (`Actively hiring for...`) | Longer heading where only one phrase is the "punch" |

---

## 7. The hand-drawn underline (signature decoration)

**HTML:**
```html
<span fd-svg-underline-text="scroll" fd-svg-underline-stroke="4">phrase to underline</span>
```

**Attributes (read by the script in [about.html:174-234]):**
- `fd-svg-underline-text="load"` — draw immediately when the page loads (with delay 0.825s, duration 0.75s).
- `fd-svg-underline-text="scroll"` — draw when element scrolls into view (`start: "top 70%"`).
- `fd-svg-underline-text=""` — draw immediately on load with no scroll trigger.
- `fd-svg-underline-stroke="N"` — stroke width in px. Defaults to `4`. Values seen: `2`, `2.5`, `3`, `4`, `8`.
- `fd-svg-underline-offset="N"` — vertical offset in px (negative pushes the line up under the text). Values seen: `-5`, `-4`, `0`.
- `fd-svg-underline-color="..."` — hex. Defaults to `#FF5B1A`.

**What it does:** wraps the text in a `<span class="fd-underline-text">` (z-index 2), then inserts a sibling `<div class="fd-underline-svg">` containing a `<svg>` with a curved path `M2 7.7C42 5.2 155 -3.8 243 7.7` — a hand-drawn-looking wave. GSAP animates the `strokeDashoffset` from `length → 0` to "draw" the line.

**Where seen** (screenshot evidence + code):

| Phrase | Underline mode | Stroke | Page |
|---|---|---|---|
| "AI-first B2B" in home h1 | load | 4 (default) | [PDF p.1] |
| "Shifu way" in hero comparison card | inline `<em>` | 8 (heavy) | [PDF p.1] |
| "not traditional accelerators" | inline `<em>` with offset -5 | 3 | [PDF p.2] |
| "100 Companies" in section heading | (load) | 4 | [PDF p.6] |
| "Portfolio Companies?" | scroll | 4 | [PDF p.7-12] |
| "300% Growth" | inline `<em>` | 4 | [PDF p.13] |
| "Frequently Asked Questions" | scroll, offset -5 | 2.5 | [PDF p.14] |
| "$10M ARR" in footer CTA | scroll, offset -4 | 2.5 | [PDF p.15] |
| "next few decades" in About hero | load | 4 | [PDF p.16] |
| "Our Journey" | scroll | 4 | [PDF p.17] |
| "core values" | (load) | 4 (default) | [PDF p.19-20] |
| "team behind" in About team section | (load) | 4 | [PDF p.21] |
| "Actively hiring" | (load) | 4 | [PDF p.23] |

**Rule for new pages:** every section h2 should have at least one underlined phrase. Use `scroll` mode on sections below the fold; use `load` only on above-the-fold headings (hero).

---

## 8. The L-bracket "frame and focus" pattern (the visual signature)

**This is THE most distinctive design device on the site.** Four orange L-shaped corner brackets that frame an active / focused element.

**Markup** ([about.html:635-642] for tab variant, [index.html:1775-1777] for FAQ variant):

```html
<div class="focused-bg">                 <!-- or .faq-focused-bg, depending on context -->
  <div class="faq-focused-bg-copy">
    <img src="images/Vector-31.svg" alt="" class="focused-icon top">   <!-- top-left  -->
    <img src="images/Vector-32.svg" alt="" class="focused-icon _2">    <!-- top-right -->
    <img src="images/Vector-34.svg" alt="" class="focused-icon _3">    <!-- bottom-right -->
    <img src="images/Vector-33.svg" alt="" class="focused-icon _4">    <!-- bottom-left -->
  </div>
</div>
```

**CSS** ([css/shifu-ventures-staging.webflow.css]):
```css
.focused-bg, .faq-focused-bg {
  position: absolute; inset: 0%;
  pointer-events: none;
  color: var(--_primitives---colors--brand-orange);
  /* ...flex centering... */
}
.focused-icon          { position: absolute; }
.focused-icon.top      { inset: 0%  auto auto 0%; }   /* TL */
.focused-icon._2       { inset: 0%  0%   auto auto; } /* TR */
.focused-icon._3       { inset: auto 0%  0%   auto; } /* BR */
.focused-icon._4       { inset: auto auto 0%   0%; } /* BL */
```

Each SVG is 17×17px, stroke-width 3, hardcoded `stroke="#FF5B1A"` ([images/Vector-31.svg]). Vector-31 = top-left L. Vector-32 = top-right L (mirrored). 33 = bottom-left. 34 = bottom-right.

**Visibility rule (CRITICAL):** `.focused-bg` / `.faq-focused-bg` is **always in the DOM but hidden by default**. It becomes visible only when the parent element has the **active / current / open state**. The visibility is driven by Webflow IX2 interactions (the `data-w-id` attributes on the parent).

**When the pattern is used** (from PDF observation):
1. **Active tab** in the home comparison rail — [PDF p.3-5] left card has orange brackets, right card has light grey brackets (the same SVG markup but with a different colour CSS variable applied).
2. **Active card** in the "How we help" feature ([PDF p.7-12]) — the entire content frame is bracketed in orange.
3. **Active FAQ** — only the open accordion item has visible brackets ([PDF p.14]).
4. **Stat cards** wrapped in brackets (e.g. "40+ in-person ICP research meetings" — [PDF p.7]).
5. **Hovered team card** — [PDF p.21] shows Aniruddha highlighted with orange brackets while the other 7 cards have faint grey brackets.
6. **Active feature tabs** in the core values section ([PDF p.20]) — "1. Have Fun" tab has orange brackets, others don't.

**Two color variants of the same SVG** — used in tandem to indicate state:
- Default (inactive) cards still have corner brackets, but rendered in a **light grey** colour ([PDF p.21, p.6 Fractional cards]). This is achieved by using a different markup wrapper (the team cards in PDF p.21 show light corner brackets even when not active — probably via the `--brand-white-15` colour applied to the parent or sibling element). The orange version is the "hot" state.

**Rule for new pages:** the L-bracket frame is the way you communicate **"this is active / this is the focus."** Do not use box-shadows, glows, or border-color changes for active states — use brackets.

---

## 9. Cards

### 9.1 Team card (`.about_team_item`) — [about.html structure, PDF p.21-22]

```css
.about_team_item {
  display: flex; flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem 0.75rem 1.25rem 0.75rem;
}
.about_team_image-wrapper { border-radius: 0.75rem; overflow: hidden; }
.about_team_image { aspect-ratio: 1; object-fit: cover; }
.team-name       { color: #ffffffbf; font-size: 1.25rem; font-weight: 500; line-height: 1.25; }
.team-designation{ color: #eeeeee80; line-height: 1.25; }
.team-list       { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 1.25rem column, 1.75rem row; }
```

**Composition** (from PDF p.21-22):
- 4-column grid on desktop.
- Each card: padded box → square (1:1) image with rounded corners → name (#fff 75%) → role (#fff 50%) below.
- Photos are **grayscale by default**, **color on hover/active** ([PDF p.21-22] — the active card in the upper grid is the only color one). The grayscale filter is implied by visual evidence; need to confirm the exact CSS but it's clearly an on-hover transition.
- Around the active card → orange L-brackets. Around the others → faint grey brackets (default state of the same SVG set with a different color).

### 9.2 Careers card (`.about_team_item.team` inside swiper) — [about.html:998-1014, PDF p.23]

Same `.about_team_item` markup, but wrapped in a Swiper. CSS overrides:
- `.team .team-name` → `rgba(255,255,255,0.75)`
- `.team .social-link` → `opacity: 0`
- `.team .team-focused-bg` → `filter: grayscale(100%)`
- `.swiper-slide-active .team-name` → `#fff`
- `.swiper-slide-active .social-link` → `opacity: 1`
- `.swiper-slide-active .team-focused-bg` → `filter: grayscale(0%)`

So the active swiper slide gains: brighter name, visible social icons, removed grayscale on the bg.

### 9.3 Journey card (`.journey-card`) — [about.html:581-588]

```css
.swiper-slide.journey-card {
  display: flex; flex-direction: column;
  gap: 1.5rem;
  width: 55%;          /* desktop card width inside swiper */
  flex: none;
}
.journey-heading { color: white; font-size: 1.25rem; line-height: 1.25; }
.para-75         { color: #ffffffbf; }                    /* white-75 paragraph for journey description */
.swiper-image-wrap { aspect-ratio: 16/9; border-radius: 0.75rem; overflow: hidden; }
```

[PDF p.17-19]: heading on top, paragraph below in lighter grey (`#ffffffbf` not `#eeeeee80`), then a 16:9 image with 12px rounded corners.

### 9.4 100 Companies grid card (`.home_mission_image-wrapper-copy`) — [PDF p.6]

```css
.home_mission_image-wrapper-copy {
  aspect-ratio: 84 / 50;                        /* ~1.68:1 — wider than tall */
  background: var(--black-tertiary);            /* #131313 */
  color: #ffffff59;                             /* white at 35% — for the number */
  border: 1px solid #545454;                    /* dark-gray-border */
  border-radius: var(--_ui-styles---radius--large);   /* = 0 — sharp corners */
}
.home_mission_image-wrapper {
  grid-template-columns: repeat(11, 1fr);
  gap: 1.375rem;                                /* 22px */
}
```

Sharp-corner cards (NOT rounded), almost-black bg, faint white number. 11-column grid (drops to 5 on tablet, see Responsive section). Notable: real PortCos replace their numbered card with a coloured/branded card (e.g. blue PHOTON LEGAL, yellow CURIOUS MEN FILMS).

### 9.5 Stat card pattern — [PDF p.7-12 right column]

Repeating pattern. Not a single CSS class — the structure varies. Two flavours observed:

**Flavour A (with orange L-brackets):** dark card with `.focused-bg` overlay applied — gives the bracket frame. Inside: large bold number + smaller label.
**Flavour B (without brackets):** plain dark card, same number + label structure.

Numbers use `.heading-style-h4-2` (32px / 700) or similar heavy size. Labels use `.text-size-small` (14px) in `--brand-white-50`.

### 9.6 Hero swiper "comparison" card (`.home_hero-header_card`) — [PDF p.1-2]

```css
.home_hero-header_card {
  display: grid;
  grid-template-columns: 0.75fr 1fr;   /* image left, content right */
  gap: 2rem;
}
.home_hero-header_card-content {
  display: flex; flex-direction: column;
  justify-content: space-between;
  gap: 1rem;
  height: 100%;
}
```

Each slide: a small caption (`Shifu Ventures` / `Traditional Accelerators` in [PDF p.1]) above an image (Kung Fu Panda GIF), with an h3 + small `link-btn` ("Know More") on the right. The slide structure is in [index.html:585-625].

---

## 10. Tabs

### 10.1 Home comparison tabs ([PDF p.3-5], [index.html:779-905])

Vertical rail on the right, horizontal content on the left.

```html
<div data-duration-in="0" data-duration-out="0" fd-tabs-scroll fd-child-fade
     data-current="Type of Company" class="home_about_tabs w-tabs">
  <div class="home_about_tabs-menu w-tab-menu">
    <a data-w-tab="Startups per year"  fd-tab-link class="home_about_tab-link first w-inline-block w-tab-link">...</a>
    <a data-w-tab="Northstar Metric"   fd-tab-link class="home_about_tab-link w-inline-block w-tab-link">...</a>
    <a data-w-tab="Type of Company"    fd-tab-link class="home_about_tab-link w-inline-block w-tab-link w--current">...</a>
    <a data-w-tab="Execution Ownership" fd-tab-link class="home_about_tab-link tab-last w-inline-block w-tab-link">...</a>
  </div>
  <div class="w-tab-content"> <!-- 4 tab panes --> </div>
</div>
```

```css
.home_about_tab-link {
  border-bottom: 1px solid var(--_primitives---opacity--white-25);   /* #ffffff40 — faint */
  background: transparent;
  /* etc */
}
.home_about_tab-link.w--current {
  border-bottom-color: var(--_primitives---white-80);                /* brighter */
  color: var(--_primitives---white-80);
}
.home_about_tab-link.tab-last { border-bottom: none; }
.home_about_tab-link.first    { padding-top: .5rem; }
```

Inactive label: dim white. Active label: bright white, brighter underline. Rail uses thin horizontal dividers between items.

### 10.2 Core values tabs ([PDF p.20], [about.html:632-722])

Same Webflow `w-tabs` system, different markup class:

```html
<div data-duration-in="400" data-duration-out="200" class="about_layout_tabs w-tabs">
  <div class="about_layout_tabs-menu w-tab-menu">
    <a data-w-tab="Tab 1" focused-bg-color class="about-tab-link w-inline-block w-tab-link w--current">
      <div class="tabs-links">1. Have Fun</div>
      <div class="tabs-para-wrap">
        <p class="tabs-desc">There is only one life...</p>
      </div>
      <div class="focused-bg"><div class="faq-focused-bg-copy">...4 L-brackets...</div></div>
    </a>
    <!-- 4 more tabs -->
  </div>
  <div class="about_layout_tabs-content w-tab-content">
    <div class="about_layout_tab-pane w--tab-active">
      <div class="about_layout_tab-content">
        <video autoplay muted loop playsinline>...</video>
      </div>
    </div>
    <!-- 4 more tab panes -->
  </div>
</div>
```

Key differences from comparison tabs:
- Active tab gets orange L-bracket frame (the `.focused-bg` overlay activates).
- Active tab grows: `font-size: 1.5rem` (up from 1.25rem) and `padding: 1.875rem 1.25rem` (up from 1rem).
- Active tab description (`tabs-desc`) is revealed; inactive tabs hide it.
- Active tab gets `background: #23232380` (dark-alternate-50, 50% opacity over a dark grey).
- Content side: video plays in a 578:406 aspect frame, autoplaying.

### 10.3 Nested "How we help" tabs ([PDF p.7-12], [index.html w-tabs-2 / w-tabs-3])

Hierarchical: section group (GTM, Product, Fundraising, OPS, Hiring) → numbered sub-tabs (1. ICP Research, etc.) → within content area, sometimes another tab row (Sales Deck / Website, Outbound / ABM / Capacity Building).

- The outer rail is vertical on the left, text-only.
- Section group labels: white, bold, underlined when active.
- Numbered items underneath: muted grey when inactive, white when active.
- The inner content has its own horizontal tab strip with thin underlines (similar to home comparison tabs).

This is the most complex tab system on the site. Replicating it requires Webflow's nested `w-tabs` markup.

---

## 11. FAQ accordion ([PDF p.14-15], [index.html:1750-1830])

**Structure:**
```html
<div class="home_faq_accordion">
  <div data-click="faq" class="home_faq_question">
    <div>Why we're building Outcome-as-a-Service companies?</div>
  </div>
  <div class="home_faq_answer">
    <div class="home_faq_answer-text">
      <p clamped-text="true">Traditional agencies have always been hard to scale.<br>...</p>
    </div>
  </div>
  <div class="faq-focused-bg">
    <div class="faq-focused-bg-copy">
      <img src="images/Vector-31.svg" class="focused-icon top">
      <img src="images/Vector-32.svg" class="focused-icon _2">
      <img src="images/Vector-34.svg" class="focused-icon _3">
      <img src="images/Vector-33.svg" class="focused-icon _4">
    </div>
  </div>
</div>
```

**Behaviour** ([about.html:154-168]):
```js
$('[data-click="faq"]').click(function () {
  if (!$(this).is('.open')) {
    $('[data-click="faq"].open').each((i, item) => { item.click(); });   /* close any currently-open */
    $(this).addClass('open');
  } else {
    $(this).removeClass('open');
  }
});
$('[data-click="faq"]').first().click();   /* open the first one on page load */
```

So **only one FAQ open at a time**, the first one is open by default, clicking another closes the previous.

**CSS** ([css/shifu-ventures-staging.webflow.css]):
```css
.home_faq_question        { padding: 1rem 1.25rem; font-size: 1.25rem; cursor: pointer; }
.home_faq_question.open   { font-size: 1.5rem; }    /* active grows */
.home_faq_answer          { overflow: hidden; }     /* height animated via Webflow interaction */
.home_faq_list            { border-bottom: 1px solid var(--color-scheme-1--border); }
```

When `.open` is added to `.home_faq_question`:
1. The font of the question grows from 1.25rem → 1.5rem.
2. The `.home_faq_answer` height transitions from 0 → auto (Webflow IX2 interaction).
3. The L-bracket frame (`.faq-focused-bg`) becomes visible (Webflow interaction toggles its display).

**"Read more" pattern:**
```css
[clamped-text="true"] {
  display: -webkit-box;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

When the FAQ opens, the answer's `clamped-text="true"` attribute remains, clamping the answer to ~5 lines with a "Read more" link below ([PDF p.14] — visible below the first FAQ). Clicking "Read more" presumably unclamps. The link uses `.link-btn` styling.

---

## 12. Swiper / slider patterns

The site uses **Swiper v12** ([about.html:129] CDN load). Three swipers seen across the two pages:

| Swiper | Where | Behaviour |
|---|---|---|
| **Home hero swiper** | [index.html:585-625] | Auto-rotates between "Shifu Ventures" and "Traditional Accelerators" comparison cards. Pagination dots below. [PDF p.1-2 show 2 slides side-by-side mid-transition.] |
| **About journey swiper** | [about.html:579-593] | Scroll-pinned on desktop: `ScrollTrigger.create({trigger: ".section-journey", pin: true, scrub: 1, ...})` → scrolling the page advances slides without Lenis. On tablet/mobile (max-width: 990px), normal Swiper drag. 5 slides with pagination dots. [PDF p.17-19.] |
| **About careers swiper** | [about.html:996-1019] | Single Swiper on mobile only (`if (window.innerWidth < 991)`) — on desktop, the careers list is a grid. |

**Pagination dots** (visible at [PDF p.17, 19]): small circles, white when active, faint grey otherwise. Implemented via Swiper's `pagination` config and Webflow's `.w-slider-dot` styling.

---

## 13. Footer ([PDF p.15, p.24], [about.html:1187-1266])

```html
<footer class="footer11_component">
  <div class="padding-global footer">                  <!-- tighter 1.25rem horizontal -->
    <div class="container-xlarge">                     <!-- widest container -->
      <div class="padding-vertical">
        <div class="w-layout-grid footer11_top-wrapper">
          <!-- LEFT: CTA -->
          <div class="footer11_left-wrapper">
            <div class="max-width-small bit-sm">
              <h2 class="heading-style-h3-2">
                <strong>Want to build a </strong>
                <span><strong fd-svg-underline-stroke="2.5" fd-svg-underline-text="scroll" fd-svg-underline-offset="-4">profitable $10M ARR</strong></span>
                <strong> company?</strong>
              </h2>
              <a class="button" data-wf--button--variant="button-with-icon" href="...">
                <div>Co-Build with Us</div>
                <div class="button-icon"><svg>...arrow...</svg></div>
              </a>
            </div>
            <a href="index.html" class="footer11_logo-link"><!-- SHIFU VENTURES logo --></a>
          </div>
          <!-- RIGHT: contact + location + legal -->
          <div class="footer-right-wrapper">
            ...
          </div>
        </div>
      </div>
    </div>
  </div>
</footer>
```

**Visual** ([PDF p.15, 24]):
- A single dark "card" the width of `container-xlarge` (1222px), sitting with margins to the body grid (so the body's grid pattern shows around it).
- Slight rounded corners.
- Left column: heading with underlined accent on `$10M ARR`, primary button below.
- Right column: `Contact:` + `team@shifuventures.com` (clickable), `Location:` + address block, copyright + Privacy Policy + Terms of Service links.
- Bottom-left: SHIFU VENTURES wordmark.

---

## 14. Effects, animation & motion

### 14.1 Lenis smooth scroll
```js
var lenis = new Lenis({ lerp: 0.1, infinite: false, normalizedWheel: false, smoothTouch: false });
function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
requestAnimationFrame(raf);
lenis.stop(); // starts after document ready
$(document).ready(() => lenis.start());
```
([about.html:131-152])

Applies to the whole page. Adds `html.lenis.lenis-smooth` class. Pauses inside menus / iframes via `[data-lenis-prevent]`.

### 14.2 GSAP + ScrollTrigger

Loaded from CDN ([about.html:123-127]). Plugins registered: `ScrollTrigger`, `SplitText`, `TextPlugin`.

Used for:
- Drawing the hand-drawn underline (GSAP `gsap.to(p, {strokeDashoffset: 0, ...})` in [about.html:213-232])
- Pin-and-scrub of the Journey swiper ([about.html:1330-1354])
- Fade/slide reveals via the `fd-*-reveal` attributes (presumably wired in Webflow's IX2 system or via inline JS not yet read)

### 14.3 Reveal attributes (FlowDojo conventions)

| Attribute | Effect |
|---|---|
| `fd-section-reveal` | Marks a whole section for staged reveal of its children. |
| `fd-heading-reveal` | Initial state: `opacity: 0; transform: translateY(32px)` ([about.html:62-66]). Reveals on scroll into view. |
| `fd-fade-reveal` | Soft fade-in for paragraphs / content blocks. |
| `fd-child-fade` | Cascades fades to direct children (used on FAQ list — [index.html:1765]). |
| `fd-tab-content` | Initial state: `opacity: 0; transition: opacity 0.25s ease` ([about.html:44-47]). |
| `fd-tabs-scroll` | Marks tab system for scroll-triggered switching. |
| `fd-tab-link` | Tab link participation. |
| `load-reveal` / `load-heading-reveal` / `load-nav-reveal` | Reveals on page load with different translate distances (16px / 32px / -12px). |

**CSS guard** ([about.html:19]): `html.w-mod-js:not(.w-mod-ix3) :is([fd-heading-reveal], [fd-fade-reveal], [fd-child-fade]) { visibility: hidden !important; }` — keeps reveal elements hidden until JS / Webflow IX3 has initialised.

### 14.4 Brand blink animation ([about.html:80-99])
```css
@keyframes brandBlink {
  0% { color: inherit; }
  0.01% { color: var(--_primitives---colors--brand-orange); }
  50% { color: var(--_primitives---colors--brand-orange); }
  50.01% { color: inherit; }
  100% { color: inherit; }
}
.orange-blink-animation { animation: brandBlink 1.2s infinite linear; }
```

A 1.2s loop that flashes between inherited colour and brand orange. Not sure where it's applied — search the markup if needed.

### 14.5 Transitions

Common timings observed:
- Buttons: `transition: color 0.3s, background-color 0.3s`
- Tab content: `transition: opacity 0.25s ease`
- Hover transitions on team cards: `transition: filter 0.2s` (likely the grayscale → color flip)
- Underline drawing: `duration: 0.75s, delay: 0.825s, ease: power2.out`

---

## 15. Responsive breakpoints

The site collapses at two breakpoints (Webflow's medium and small defaults):

| Breakpoint | What changes |
|---|---|
| **≤ 991px (tablet)** | Navbar collapses to hamburger (`data-collapse="medium"`). `.team-list` & `.about-careers-swiper-list` go from 4 cols → 2 cols. `.home_mission_image-wrapper` goes from 11 cols → 5 cols. About careers becomes a Swiper instead of a grid. Journey ScrollTrigger pin disabled — Swiper becomes drag-only. |
| **≤ 768px (mobile)** | `.team-list` goes from 2 cols → 1 col. `.section-tabs-header` gap increases to 1.5rem ([css line near `@media (max-width: 767px)`]). Various `desktop-hide` / `mobile-show-flex` classes activate. |

The site is **mobile-aware but desktop-first** — most components have a tablet override and a mobile override but design decisions are made at desktop scale.

---

## 16. Page-specific patterns

### 16.1 Homepage section sequence

From [index.html:562-1838]:

1. **`section-home-hero`** — page hero with H1, lead p, primary button, and the auto-rotating Kung Fu Panda comparison swiper.
2. **`section_home_about`** — "We co-build only with..." comparison section with the 4-tab vertical rail (Startups per year / Northstar Metric / Type of Company / Execution Ownership).
3. **`section_home_mission`** — "On a mission to co-build 100 Companies" with the 5 Fractional cards + 100-cell number grid.
4. **`section_home_portfolio-companies`** — "How we help our Portfolio Companies?" with nested tabs (GTM / Product / Fundraising / OPS / Hiring) and inner sub-tabs per section.
5. **Testimonial section** — "Here's how we helped Photon Legal to achieve 300% Growth" with the YouTube thumbnail.
6. **`section_home_faq`** — Frequently Asked Questions accordion (5 questions).
7. **Footer**.

### 16.2 About page section sequence

From [about.html:533-1267]:

1. **`section_header30`** — hero with full-width video background, centered overlay text ("We're a lean team of founders and operators...").
2. **`section-journey`** — "Our Journey" with the 5-slide scroll-pinned Swiper.
3. **`section_about_layout`** — "We live by these core values" with 5 vertical tabs each playing its own video.
4. **`section_about_core-values`** (team section) — "The team behind this massive vision" — 4×2 grid of team members.
5. **`section_about_team`** (careers section) — "Actively hiring for these positions" with single Founder's Office card (CMS-driven).
6. **Footer**.

---

## 17. Anti-patterns — what doesn't belong on this site

Things I built into the investor page that are off-family. Avoid these going forward:

| Anti-pattern | Why it's wrong | Correct pattern |
|---|---|---|
| Light/cream/paper section backgrounds (`#faf7f2`, `#fff`) | The whole site is dark-on-dark. White cards look glued-on. | Sections are transparent; let body's `#000 + Body.svg` show through. Cards use `rgba(35,35,35,0.5)` or have no fill, just borders. |
| Box shadows (e.g. `8px 8px 0 rgba(...)`) | The site uses **L-bracket frames** for focus, not shadows. There are no chunky shadows anywhere in screenshots. | Use the L-bracket pattern (`.focused-bg` + 4 Vector-3X.svg corners). |
| Editorial uppercase + JetBrains Mono kickers | Site uses Neue Montreal exclusively. No mono fonts. No uppercase letter-spaced labels. | Captions in Neue Montreal at `text-size-small` (14px), colour `--brand-white-50`. |
| Serif headlines (Newsreader, Georgia, etc.) | All headings are Neue Montreal sans. | `.heading-style-h1` / `h2` / etc. |
| Hand-rolled custom heading sizes (e.g. inline `font-size: 22px`) | Site has a strict scale (`heading-style-h1`..`h6`). | Always use the heading classes. |
| Bright pure-white text everywhere | Site uses `#eee` (off-white) as default. White is reserved for max emphasis. | Default to `--_primitives---colors--neutral-lightest` (`#eee`). Use `#fff` only on active card titles and a few hero h1s. |
| Custom underline animations | Site has ONE underline animation system. | Use `fd-svg-underline-text` attribute. |
| Wooden / pegboard / decorative textures | No textures on the site. | Use plain dark surfaces. |
| Sharp 0-radius cards with dark fills (other than the 100-grid) | Cards on the site have 0.75rem radius. | Use 0.75rem for cards, 0.5rem for buttons/pills. |
| Hand-coded section paddings (e.g. `padding: 80px 0`) | Site uses the `.padding-section-*` utility scale. | Use the classes. |
| Multiple accent colours (green checks, blue dots, red X) | Site has ONE accent: brand orange. Inactive things are muted white. | Active = orange. Inactive = `--brand-white-50`. |
| Visible borders everywhere (1px solid white-15 on every card) | Borders are sparing — used to separate strips, not wrap every element. | Default cards are bg-only; borders only where they communicate structure. |

---

## 18. Quality-check parameters (the rubric)

When you (or I) want to grade a new page against this design system, score it on these **23 testable items**. Each is **yes/no** — don't soften with maybes.

### Foundation
1. **Body bg.** Does the page inherit body's `#000 + Body.svg` grid texture? (Reproduce: load page, take screenshot, verify the faint grid is visible behind every section.)
2. **Font.** Are *all* headings + paragraphs in Neue Montreal? (DevTools → computed style on any text → font-family is `Neuemontreal, Arial, sans-serif`.)
3. **Text colour.** Are paragraphs `--brand-white-50` (`#eeeeee80`) and headings `#eee` or `#fff`? No paragraphs in pure white.
4. **Accent discipline.** Is the only accent colour the brand orange (`#f56e38` / `#FF5B1A`)? No green, no blue (except the existing `.link-btn`), no other oranges.

### Layout
5. **Section wrapper.** Does every section use `padding-global > [padding-section-* | container-large] > [padding-section-* | container-large]`? No raw vertical paddings on direct content blocks.
6. **Container width.** Is content constrained to `.container-large` (1134px)?
7. **Section title block.** Does each section have a `.section-tabs-header` (h2 + p) followed by `.spacer-56`? (Or `.section-header.right` if no p.)
8. **h2 underline.** Does every section h2 have at least one `fd-svg-underline-text` span?

### Typography
9. **Heading scale.** Are all h1/h2/h3 using the `.heading-style-h*` classes? No inline `font-size`.
10. **Hero h1.** Is the hero h1 in `.heading-style-h1` (48px) or `.heading-style-h1.is-44` (44px)?
11. **Body para size.** Are paragraphs in `.text-size-medium` (18px) or `.text-size-regular` (16px)? Not arbitrary sizes.
12. **Italic emphasis.** Are emphasised phrases wrapped in `<em>` (italic), often combined with an underline span?

### Buttons
13. **Primary CTA.** Is the main button using `.button` with the `button-with-icon` variant + arrow SVG? Off-white pill, dark text by default, orange on hover.
14. **No custom button styles.** No buttons with hand-coded background colours, borders, or padding.

### Cards
15. **Card radius.** Are all "card" elements at `border-radius: 0.75rem`? (Not 0px, not 1rem.)
16. **Image radius.** Are images inside cards wrapped in a `.about_team_image-wrapper`-style container with `border-radius: 0.75rem; overflow: hidden`?
17. **Card padding.** Cards follow `padding: 0.75rem 0.75rem 1.25rem` (top/right/left = 0.75rem; bottom = 1.25rem)? Or close to it.

### The L-bracket signature
18. **Active = brackets.** Every place that shows "this is active / this is the focus" uses 4 corner SVGs (Vector-31, 32, 33, 34) — not box shadows, glows, or border colour shifts.
19. **Bracket position.** Corner SVGs use `inset: 0% auto auto 0%` / `0% 0% auto auto` / `auto 0% 0% auto` / `auto auto 0% 0%` (TL / TR / BR / BL).

### Animation & motion
20. **Reveal attributes.** Every section has `fd-section-reveal`; major h2s have `fd-heading-reveal`; paragraphs have `fd-fade-reveal`.
21. **Underline animations work.** Loading the page and scrolling triggers the underline drawing on every flagged span (no broken/missing ones in DevTools console).
22. **Smooth scroll.** Lenis is initialised and `html.lenis.lenis-smooth` is on the `<html>` element.

### Navigation continuity
23. **Nav consistency.** The new page's nav matches every other page's nav (same logo SVG, same link order, same `.w--current` active state on its own link).

**Scoring:** 23 / 23 = pass. Any miss → fix before shipping. This is not a 70% rubric.

---

## 19. Open questions / verified gaps

Things I want to flag rather than assume:

1. **Team card hover transition** — [PDF p.21] clearly shows grayscale → color on hover/active, but I haven't pinned the exact CSS rule. Likely a `filter: grayscale(100%) → 0%` transition on `.about_team_image` triggered by `:hover` on `.about_team_item` or by a `.team-focused-bg` sibling. Worth confirming before reproducing.

2. **Inactive vs active L-bracket colour** — [PDF p.21] shows white-15 brackets on inactive team cards and orange brackets on the active one. The CSS shows `.faq-focused-bg-copy { color: var(--_primitives---colors--brand-orange) }` — so the *colour* is set by a parent (likely the parent gets `color: white-15` in the inactive state, `color: brand-orange` in active). Need to grep more to find the exact rule.

3. **Mission grid card sizing** — `aspect-ratio: 84/50` means 1.68:1, but [PDF p.6] shows the cards looking square-ish. Either the screenshot is misleading or the cards are squished by the grid. Worth measuring on a real device.

4. **"Our Ecosystem" rail button** ([PDF p.7-12]) — appears at the bottom of the GTM/Product/etc. rail. Looks like `.button.is-secondary` but with thin border. The exact rendering needs verification.

5. **`fd-svg-underline-color` defaults** — script defaults to `#FF5B1A` not the CSS variable `#f56e38`. Mentioned in §2.4 but worth re-checking that this is intentional (so colour stays consistent across the underline animations).

6. **Footer's "Want to build..." h2** uses `.heading-style-h3-2` (24px) wrapped in `<strong>` to get 700 weight. Curious choice — not h2 size, but called h2. May indicate the heading scale gets reused at different sizes for visual rhythm.

---

## 20. How to use this doc

- **Before building any new page**, read §17 (anti-patterns) and §18 (rubric) first. Bookmark them.
- **While building**, refer to §2 (tokens) and §6 (section structure) — they tell you the building blocks.
- **When stuck on a component**, find it in §4-13 and copy the markup pattern verbatim from the cited file:line.
- **After building**, score yourself against the 23-item rubric. Fix anything below 23 before showing.

Source files: this doc was built from [css/shifu-ventures-staging.webflow.css](css/shifu-ventures-staging.webflow.css), [index.html](index.html), [about.html](about.html), and 24 design screenshots (`SV Website.pdf`).
