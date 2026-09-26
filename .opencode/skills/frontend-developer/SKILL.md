---
name: frontend-developer
description: Expert frontend developer with BOLD Anthropic-Claude aesthetics. Use when building components, pages, or web apps with React, Next.js, Vue, Nuxt, Svelte, or HTML/CSS/JS. Produces production-grade, distinctive, memorable interfaces and avoids generic AI aesthetics (Inter, Roboto, purple gradient). Covers design thinking, typography, color theory, motion, performance, accessibility, and testing.
license: MIT
---

# Frontend Developer — Distinctive Production Interfaces

This skill turns you into a senior frontend developer with **high taste**. Before writing code you **must** choose a bold aesthetic direction, then execute it with precision.

> **Core philosophy:** Bold maximalism and refined minimalism are both valid. The key is *intentionality*, not intensity. Never ship a design that could be mistaken for any other AI-generated project.

## 1. Design Thinking

### Purpose

Generic output is a failure mode, not a neutral default. An AI agent that ships Inter with a purple gradient on white has produced the visual equivalent of lorem ipsum: technically valid, completely forgettable, and indistinguishable from every other AI-generated page on the internet.

This skill exists to force a decision. Before writing a single line of markup, commit to one specific aesthetic direction and execute it with conviction. The goal is not "clean and modern." The goal is a surface that could only have come from this product, this brand, this moment.

Judge every choice against one question: **would a designer have made this deliberately, or would an AI have defaulted to this?**

### Tone

Pick one direction. Do not blend three. Bold and coherent beats safe and muddled. The following ten are not a spectrum from safe to risky — all are viable if executed fully.

| Direction | Key Characteristics | Commit To |
| --- | --- | --- |
| **Brutally Minimal** | Extreme whitespace, one accent, hairline rules, no shadows, no radius, oversized type doing the work | Deleting everything until the layout breaks, then deleting one more thing |
| **Maximalist Chaos** | Layered depth, clashing saturated color, dense ornament, overlapping elements, kinetic collage | Adding the fifth layer that "shouldn't work" but does |
| **Retro-Futuristic** | Chrome bevels, gradient meshes, scanlines, neon on deep navy, LCD/monospace data, 70s–80s industrial | Every single retro signifier, because half of them is a costume |
| **Organic / Natural** | Asymmetric hand-drawn shapes, warm earth palette, generous curves, texture over flatness, blurred blob accents | Uneven, human, slightly imperfect — no perfect rectangles |
| **Luxury / Refined** | Restrained palette, editorial serif display, wide letter-spacing, high contrast, slow motion, silent UI | Restraint as the loudest choice; the absence is the statement |
| **Playful / Toy-like** | Chunky rounded shapes, saturated primaries, bouncy easing, sticker-like badges, micro-interactions everywhere | Maximum personality per element, zero corporate restraint |
| **Editorial / Magazine** | Strong typographic hierarchy, asymmetric grid, drop caps, pull quotes, rules and margins, image-dominant | The layout should read like a spread nobody scrolls past |
| **Brutalist / Raw** | Unstyled HTML energy, default monospace, harsh borders, exposed structure, jarring scale jumps, visible grid | Ugly on purpose and technically correct at the same time |
| **Art Deco / Geometric** | Symmetry, fan and chevron motifs, thin double rules, gold on deep green, tall condensed display, tall spacing | Strict, geometric discipline with zero casual elements |
| **Industrial / Utilitarian** | Monospace, uppercase micro-labels, technical data density, functional palette, visible structure, 1px borders | It should look like well-made equipment, not a brand |

Aesthetic commitment does not excuse inaccessibility or a broken trust boundary. Direction governs visual language; it never overrides semantic markup, contrast requirements, keyboard operability, or the repo's existing security and architecture rules.

### Differentiation

Before designing, find the specific things that cannot be generalized:

- **The subject.** What does this product actually do, and what does its data *look like*? Design the components around the real shape of the data, not a generic card grid.
- **The audience.** Who reads this, in what state, on what device, at what hour? A trader at 3am and a wedding guest at 2pm need opposite interfaces.
- **The context.** Embedded in another product, or a destination in itself? A dashboard inside an OS chrome has different weight requirements than a full-bleed marketing page.
- **The occasion.** A single-purpose flow is a single-purpose surface. Do not build a nav, a footer, and three sections for a two-field form.
- **The one memorable element.** Decide what the user will remember. Make it strong enough that removing it would be noticed.

If the brief is genuinely open, choose the direction that best fits the subject and the audience — then make every decision inside it consistently. Do not hedge toward safety halfway through.

### Constraint

Constraints are what separate a direction from a mood board. Establish them before implementation and treat them as non-negotiable for the duration of the build.

- **Write the constraint set down.** One or two sentences, before implementation. Example: *"Monospace-forward, single amber accent, dark-only, no rounded corners, no icons."*
- **Pick a hard limit on every axis.** One accent color. Two font families. One radius scale. Two easing curves. No more.
- **Enforce the limit in code.** Tokens in `globals.css` or a theme module. A token that only exists once is not a system — delete it.
- **Reject additions by default.** A new color, weight, or shadow during implementation is a cost, not a gift. It must displace something.
- **Consistency outranks richness.** A fully executed constraint always reads as more designed than a partial one with extra decorations.
- **Do not introduce a second direction to fix a problem.** If a page feels empty, that is a hierarchy and spacing problem, not a cue to add a hero gradient.
- **Existing system wins.** If the repo already has tokens, theme primitives, or a component library, the new surface must live inside them. A new direction is expressed through composition, proportion, type, and motion — not by forking the design system.
- **Verify the gate.** Lint, typecheck, and build must be green before the work is called done. Visual ambition is not an exception to a broken build.

---

## 2. Frontend Aesthetics Guidelines

### 2.1 Typography

Typography carries more identity per byte than any other decision. Choose deliberately, load deliberately, and set a real scale.

**Forbidden fonts.** These are the universal defaults. Using one is acceptable only when the design direction is explicitly one that requires it, and even then consider the alternatives: `Inter`, `Roboto`, `Open Sans`, `Lato`, `Helvetica`/`Arial` as a *primary* display face, `Poppins`, `Montserrat`, `Nunito`, `Source Sans Pro`, system `ui-sans-serif` as the only typeface on the page.

**Distinctive fonts by category.**

| Category | Options | Use For |
| --- | --- | --- |
| Editorial serif | `Fraunces`, `Instrument Serif`, `Playfair Display`, `Bodoni Moda`, `Newsreader` | Display headlines, luxury, magazine feel |
| Geometric sans | `Space Grotesk`, `Sora`, `Outfit`, `General Sans`, `Chivo` | Modern technical, product UI |
| Grotesque / neo-grotesque | `Archivo`, `Darker Grotesque`, `Familjen Grotesk`, `Darker Sans` | Strong headlines, poster energy |
| Monospace | `JetBrains Mono`, `IBM Plex Mono`, `Space Mono`, `Geist Mono`, `Martian Mono` | Code, data, labels, industrial/technical |
| Humanist | `Public Sans`, `Karla`, `Work Sans`, `Manrope` | Body copy needing warmth |
| Condensed | `Oswald`, `Bebas Neue`, `Archivo Narrow`, `Barlow Condensed` | Tall display, Art Deco, dense headlines |
| Retro / characterful | `Silkscreen`, `VT323`, `Pixelify Sans`, `Bungee`, `Rubik Mono One` | Retro-future, maximalist, poster |
| Rounded / playful | `Bricolage Grotesque`, `Gabarito`, `Baloo 2`, `Fredoka` | Playful, toy-like, consumer |
| Variable workhorses | `Roboto Flex`, `Recursive`, `Amstelvar` | One family, many weights/widths — use to span a whole system |

**Pairing rules.**

- Two families maximum. One for display, one for everything else — or one variable family with two `font-variation-settings` axes doing both jobs.
- Never pair two fonts of similar weight, width, and x-height. Contrast must be in *character*, not just size.
- Pair a display face with a neutral body face. A display face with a neutral body face is safe; two display faces is a fight.
- Fix the body size at `1rem` with `line-height: 1.6`. Fix headings tighter: `1.1` to `1.25`. Editorial display can go as tight as `0.95`.
- Use real hierarchy: at least three visually distinct type levels on any non-trivial page. Differentiate by more than size alone — weight, width, case, and letter-spacing all carry signal.
- Set letter-spacing deliberately: negative for large display (`-0.03em` to `-0.02em`), neutral for body, positive for uppercase micro-labels (`0.08em` to `0.16em`).
- Pick a width. Body copy wider than ~70 characters is hard to read; constrain with `max-width: 65ch` and mean it.

**`next/font` usage.** Self-host, subset, and let the framework handle the binary. `next/font/google` downloads at build time and self-hosts automatically:

```tsx
// src/app/layout.tsx
import { Fraunces, Geist_Mono } from "next/font/google";

const display = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  axes: ["SOFT", "WONK", "opsz"],
});

const mono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
```

For local files use `next/font/local` with explicit `src` and `weight`/`style` declarations. Expose every family as a CSS variable, declare `@theme` tokens in `globals.css`, and reference the token in components — never a raw font name. That is what makes the type system swappable.

**Fluid type scale with `clamp()`.** One scale, viewport-aware, no per-component breakpoints. Define it once as tokens and never repeat a magic number:

```css
/* src/app/globals.css */
@theme {
  --font-sans: var(--font-body), ui-sans-serif, system-ui, sans-serif;
  --font-display: var(--font-display-face), ui-serif, Georgia, serif;

  --text-xs: clamp(0.75rem, 0.72rem + 0.15vw, 0.8125rem);
  --text-sm: clamp(0.875rem, 0.84rem + 0.18vw, 0.9375rem);
  --text-base: clamp(1rem, 0.95rem + 0.25vw, 1.0625rem);
  --text-lg: clamp(1.125rem, 1.05rem + 0.4vw, 1.3125rem);
  --text-xl: clamp(1.375rem, 1.24rem + 0.65vw, 1.75rem);
  --text-2xl: clamp(1.625rem, 1.38rem + 1.2vw, 2.5rem);
  --text-3xl: clamp(2rem, 1.5rem + 2.4vw, 3.5rem);
  --text-4xl: clamp(2.5rem, 1.6rem + 4.2vw, 5rem);
}

h1,
h2,
h3 {
  font-family: var(--font-display);
  line-height: 1.1;
  letter-spacing: -0.025em;
  text-wrap: balance;
}

p {
  text-wrap: pretty;
}
```

Tailwind v4 maps `--text-*` to the `text-*` utilities, so the scale is available everywhere with no config.

### 2.2 Color & Theme

Color is a system, not a palette. Pick a limited set, give it meaning, and expose it as semantic tokens.

**Forbidden palette.** Any of these, in any combination, is the signature of an unconsidered AI-generated interface:

- Purple-to-blue gradient (`#667eea` → `#764ba2`) on white
- Indigo/violet as the primary brand color
- `#3B82F6`-style stock blue as the sole accent
- Pure `#000000` text on pure `#FFFFFF` background
- Dark mode implemented as "invert the light theme"

**CSS variables.** Define every color once, as a semantic token with a light and dark value. Components reference the token, never a hex, and never an arbitrary Tailwind color.

```css
/* src/app/globals.css */
@theme {
  --color-background: oklch(98.5% 0.008 85);
  --color-surface: oklch(100% 0 0);
  --color-foreground: oklch(22% 0.015 60);
  --color-muted: oklch(55% 0.02 70);
  --color-border: oklch(88% 0.012 75);
  --color-accent: oklch(52% 0.14 35);
  --color-accent-foreground: oklch(99% 0 0);
  --color-ring: var(--color-accent);
}

@layer base {
  :root {
    color-scheme: light;
  }

  [data-theme="dark"] {
    color-scheme: dark;
    --color-background: oklch(18% 0.012 60);
    --color-surface: oklch(23% 0.014 60);
    --color-foreground: oklch(95% 0.01 85);
    --color-muted: oklch(70% 0.015 70);
    --color-border: oklch(32% 0.016 65);
    --color-accent: oklch(72% 0.15 40);
    --color-accent-foreground: oklch(18% 0.012 60);
  }

  body {
    background-color: var(--color-background);
    color: var(--color-foreground);
  }

  :focus-visible {
    outline: 2px solid var(--color-ring);
    outline-offset: 2px;
  }
}
```

Prefer `oklch()` for perceptual uniformity across hues. It is the only practical way to keep a scale of tints looking like one family.

**The 60-30-10 rule.** Roughly 60% dominant surface, 30% secondary (surfaces, borders, muted text, secondary type), 10% accent (primary action, key data, focus states). Exceeding 10% accent is the single most common reason an interface looks amateur. Assign a role to every color in the system and remove anything without one.

**Example palette — "Midnight Editorial."** Deep navy ground, warm paper text, one ochre accent. Reads as considered and expensive; suits dark technical or editorial surfaces.

```css
/* Midnight Editorial */
[data-theme="midnight-editorial"] {
  color-scheme: dark;

  --color-background: oklch(17% 0.028 258);
  --color-surface: oklch(21% 0.03 258);
  --color-surface-raised: oklch(26% 0.032 258);
  --color-foreground: oklch(95% 0.014 85);
  --color-muted: oklch(66% 0.022 80);
  --color-border: oklch(31% 0.028 258);

  --color-accent: oklch(78% 0.145 78);
  --color-accent-foreground: oklch(17% 0.028 258);
  --color-accent-soft: oklch(78% 0.145 78 / 0.14);

  --color-success: oklch(70% 0.13 155);
  --color-danger: oklch(64% 0.19 22);
  --color-warning: oklch(76% 0.15 70);
}
```

**Example palette — "Warm Cream."** Paper ground, ink text, single terracotta accent. Suits reading, writing, commerce, and any content-first surface.

```css
/* Warm Cream */
[data-theme="warm-cream"] {
  color-scheme: light;

  --color-background: oklch(97.5% 0.012 82);
  --color-surface: oklch(99.2% 0.008 85);
  --color-surface-raised: oklch(100% 0 0);
  --color-foreground: oklch(24% 0.018 55);
  --color-muted: oklch(52% 0.022 65);
  --color-border: oklch(89% 0.014 78);

  --color-accent: oklch(54% 0.13 38);
  --color-accent-foreground: oklch(99% 0 0);
  --color-accent-soft: oklch(54% 0.13 38 / 0.1);

  --color-success: oklch(52% 0.12 150);
  --color-danger: oklch(52% 0.17 25);
  --color-warning: oklch(66% 0.14 65);
}
```

### 2.3 Motion

Motion is how a static design reveals its hierarchy. It should be short, purposeful, and never move the content the user is trying to read.

**Rules.**

- Durations: `120ms` micro-feedback, `200ms` standard transitions, `300–400ms` entrances. Anything over `500ms` feels broken.
- Easing: one enter curve (`cubic-bezier(0.16, 1, 0.3, 1)`), one exit curve (`cubic-bezier(0.4, 0, 1, 1)`), one linear for spinners and progress.
- Animate `transform` and `opacity`. Animating `width`, `height`, `top`, or `filter` forces layout or paint — avoid it.
- Motion is hierarchy: animate what matters, on a stagger, once, on mount. No loops, no attention-seeking bounce.
- Never animate on scroll-jacked containers. Reveal-on-scroll is fine, but it must stay subtle and never hide content from users who disable it.

**Staggered reveal.** Delay each child by a fraction of the total budget so the sequence reads as one gesture, not five separate ones.

```css
/* src/app/globals.css */
@keyframes reveal-up {
  from {
    opacity: 0;
    transform: translate3d(0, 12px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

.stagger > * {
  animation: reveal-up 400ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
}

.stagger > *:nth-child(1) { animation-delay: 0ms; }
.stagger > *:nth-child(2) { animation-delay: 60ms; }
.stagger > *:nth-child(3) { animation-delay: 120ms; }
.stagger > *:nth-child(4) { animation-delay: 180ms; }
.stagger > *:nth-child(5) { animation-delay: 240ms; }
.stagger > *:nth-child(6) { animation-delay: 300ms; }
.stagger > *:nth-child(n + 7) { animation-delay: 360ms; }

/* cap the stagger for long lists */
.stagger > *:nth-child(n + 8) {
  animation: none;
  opacity: 1;
}
```

The `backwards` fill is what keeps elements hidden during their delay — without it, everything flashes visible first.

**Reduced motion.** Not optional. Kill transforms and long durations; keep opacity and color so nothing jumps.

```css
/* src/app/globals.css */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }

  .stagger > * {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
```

**CSS first.** Hover, focus, reveal, and state transitions should be CSS. CSS keeps the client boundary small and costs nothing at runtime.

```css
/* src/components/ui/card.css or globals.css */
.card {
  transition:
    transform 200ms cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 200ms cubic-bezier(0.16, 1, 0.3, 1),
    border-color 150ms linear;
}

.card:hover {
  transform: translate3d(0, -2px, 0);
}

@media (hover: none) {
  .card:hover {
    transform: none;
  }
}
```

**Motion for React.** Reach for `motion` (formerly Framer Motion) only for what CSS cannot do: shared-element transitions, layout animation, gesture-driven physics, scroll-linked transforms, or an animated presence on unmount. Keep it in a leaf client component — never in `layout.tsx` or a `page.tsx` that does not need it.

```tsx
"use client";

import { motion, useReducedMotion } from "motion/react";

export function RevealList({ items }: { items: string[] }) {
  const reduce = useReducedMotion();

  return (
    <ul>
      {items.map((item, i) => (
        <motion.li
          key={item}
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.4,
            delay: reduce ? 0 : i * 0.06,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          {item}
        </motion.li>
      ))}
    </ul>
  );
}
```

Branch on `useReducedMotion()` in JSX. A CSS `prefers-reduced-motion` block does not stop JS-driven animation.

### 2.4 Backgrounds & Visual Details

A flat fill reads as unbuilt. One or two well-placed surface treatments will separate the work from a template. Restraint: this is a layer, not a theme.

**Gradient mesh.** Multiple soft radial gradients at low opacity, over a base color. This is the single highest-impact background treatment and the fastest way to avoid white.

```css
/* src/app/globals.css */
.mesh-background {
  position: relative;
  isolation: isolate;
  background-color: oklch(17% 0.028 258);
}

.mesh-background::before {
  content: "";
  position: absolute;
  inset: -20%;
  z-index: -1;
  background:
    radial-gradient(
      40% 45% at 18% 22%,
      oklch(45% 0.16 290 / 0.5) 0%,
      transparent 70%
    ),
    radial-gradient(
      35% 40% at 82% 18%,
      oklch(38% 0.12 220 / 0.45) 0%,
      transparent 70%
    ),
    radial-gradient(
      50% 50% at 62% 88%,
      oklch(42% 0.13 45 / 0.35) 0%,
      transparent 70%
    );
  filter: blur(40px);
}

@media (prefers-reduced-motion: no-preference) {
  .mesh-background::before {
    animation: mesh-drift 24s ease-in-out infinite alternate;
  }
}

@keyframes mesh-drift {
  from {
    transform: translate3d(-2%, -1%, 0) scale(1);
  }
  to {
    transform: translate3d(2%, 1%, 0) scale(1.08);
  }
}
```

Keep blob opacity low (`0.3`–`0.5`), keep them large, and never let text contrast drop below WCAG AA against the result.

**Noise / grain overlay.** A single inline SVG `feTurbulence` data URI, tiled at low opacity. This one detail removes the "vector-perfect AI smoothness" signature from any surface.

```css
/* src/app/globals.css */
.grain::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  opacity: 0.04;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 160px 160px;
}

@media (prefers-contrast: more) {
  .grain::after {
    display: none;
  }
}
```

Percent-encode `#` as `%23` inside the data URI or the fragment will break the request. Never let the overlay sit above interactive content without `pointer-events: none`, and never place it above text at a visible opacity.

**Techniques worth using.**

- Hairline borders (`1px solid var(--color-border)`) instead of shadows to define structure
- Layered shadows at two levels — an ambient and a contact shadow — to fake real light
- Custom cursor or cursor-follow element, only in playful and maximalist directions
- Scanline or grid overlay via `repeating-linear-gradient` for retro and industrial work
- Marquee or ticker strips for wayfinding and editorial energy
- Asymmetric grid: `grid-template-columns: repeat(12, 1fr)` with deliberate span mismatches and a `1fr` bleed column
- Numbered lists, indices, and metadata lines (`01 —`, `2026.09.25`) for editorial and utilitarian directions
- Sticky section headers that compress on scroll
- Custom form controls — a checkbox, toggle, or select that matches the direction, not a default one
- Masked image reveals, duotone images, and gradient overlays on media
- Oversized numerals as background texture
- Dashed rules and hairline dividers with intentional asymmetry
- Chromatic-offset text shadows for retro-future, at 1px max
- Focus states designed as part of the aesthetic, then verified for contrast

**Techniques to avoid.** Blurred glassmorphism over busy backgrounds, drop shadows at 40px spread, hover states that move layout, infinite ambient animation behind reading content, and any decorative element that survives a content change and no longer means anything.


## 3. Framework Patterns

Production UI is mostly framework plumbing. Get the boundaries right and components stay small; get them wrong and every feature ships with a waterfall, a `use client` blob, and an untyped `any`.

### 3.1 React 19+ with Server Components

Server Components render on the server, ship zero JS, and can read data directly. A Server Component is async: it awaits data and returns JSX. Nothing in its module may use `useState`, `useEffect`, or browser APIs.

```tsx
// components/dashboard/metric-card.tsx  — Server Component (no directive)
import { getMetric } from "@/features/metrics/service";

export async function MetricCard({ id }: { id: string }) {
  const metric = await getMetric(id); // DAL, validated on the server
  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{metric.label}</p>
      <p className="text-2xl font-semibold tabular-nums">
        {new Intl.NumberFormat("id-ID").format(metric.value)}
      </p>
    </article>
  );
}
```

`"use client"` marks a boundary, not a file. Push it as deep as possible: the interactive leaf, never the page or layout. Everything above it stays server-rendered.

```tsx
// components/dashboard/archive-button.tsx  — the only client leaf
"use client";

import { useOptimistic, useTransition } from "react";
import { archiveItem } from "@/features/metrics/actions";
import { Button } from "@/components/ui/button";

export function ArchiveButton({ id, title }: { id: string; title: string }) {
  const [optimistic, setOptimistic] = useOptimistic({ archived: false }, (state) => ({
    archived: true,
    ...state,
  }));
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      disabled={optimistic.archived || isPending}
      onClick={() =>
        startTransition(async () => {
          setOptimistic({ archived: true });
          await archiveItem(id); // Server Action; envelope { success, error }
        })
      }
    >
      {optimistic.archived ? "Archived" : `Archive ${title}`}
    </Button>
  );
}
```

For form state use `useActionState` (React 19) — it owns the envelope, the pending flag, and the per-field error map, which removes the manual `useState` + `try/catch` boilerplate.

```tsx
"use client";

import { useActionState } from "react";
import { createTodo } from "@/features/todos/actions";
import { FormItem } from "@/components/custom/form-item";

const initial = { success: false as const, error: null, fieldErrors: {} };

export function CreateTodoForm() {
  const [state, action, isPending] = useActionState(createTodo, initial);
  const hasFieldErrors = Object.keys(state.fieldErrors ?? {}).length > 0;

  return (
    <form action={action} className="space-y-5">
      {hasFieldErrors && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <FormItem
        label="Title"
        name="title"
        error={state.fieldErrors?.title?.[0]}
        className="space-y-2"
      />
      <Button type="submit" disabled={isPending} className="h-10">
        {isPending ? "Saving…" : "Create"}
      </Button>
    </form>
  );
}
```

- Mark `"use client"` only on leaves that need state, effects, refs, or event handlers — no `layout.tsx`, no `page.tsx`.
- Never pass functions or class instances from a Server Component to a Client Component; pass serializable data and let the client call a Server Action.
- `useTransition` for non-form mutations, `useActionState` for form submissions, `useOptimistic` when the UI must reflect the write before the response.
- Keep `useTransition` callbacks async-safe: the action must be idempotent, because transitions can be interrupted and replayed.
- Reach for `useEffect` only for genuine subscriptions (event listeners, observers, media queries). Data fetching in an effect is a bug.

### 3.2 Next.js App Router

App Router treats `params` and `searchParams` as Promises — the types are `Promise<{ ... }>`. Await them before use; do not annotate them as plain objects.

```tsx
// app/(dashboard)/reports/[reportId]/page.tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getReport, listCharts } from "@/features/reports/service";
import { ReportHeader } from "@/components/reports/report-header";
import { ChartGrid } from "@/components/reports/chart-grid";
import { Skeleton } from "@/components/ui/skeleton";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ reportId: string }>;
}): Promise<Metadata> {
  const { reportId } = await params;
  const report = await getReport(reportId);
  if (!report) return { title: "Report" };
  return {
    title: report.title,
    description: report.summary,
    openGraph: { title: report.title, description: report.summary },
  };
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  const report = await getReport(reportId);
  if (!report) notFound();

  return (
    <div className="space-y-6">
      <ReportHeader report={report} />
      <Suspense fallback={<ChartGrid.Skeleton rows={3} />}>
        <ReportCharts reportId={reportId} />
      </Suspense>
    </div>
  );
}

async function ReportCharts({ reportId }: { reportId: string }) {
  const { report, charts } = await Promise.all([
    getReport(reportId),
    listCharts(reportId),
  ]);
  return <ChartGrid title={report.title} charts={charts} />;
}
```

Stream at least one non-blocking child with `Suspense` so the shell paints instantly. `loading.tsx` and `error.tsx` are segment-scoped, colocated next to the route they cover — `error.tsx` is always a Client Component.

```tsx
// app/(dashboard)/reports/[reportId]/error.tsx
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ReportError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("report route failed", { digest: error.digest });
  }, [error]);

  return (
    <div role="alert" className="space-y-4">
      <h2 className="text-lg font-semibold">Couldn’t load this report</h2>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
```

- `params`/`searchParams` are Promises in pages, layouts, `generateMetadata`, and route handlers. Await them.
- `Promise.all` independent fetches in one server function; sequential `await` is a waterfall and is a review flag.
- `next/image` for all raster media: explicit `width`/`height` (or `fill` with a sized parent), `sizes` tuned per breakpoint, `alt` always present or `alt=""` for decorative.
- `next/font` for typography — import the font in `layout.tsx` and expose it as a CSS variable. No `<link>` to Google Fonts, no render-blocking font CSS.
- `loading.tsx` for the route's pending state, `error.tsx` for the caught error, `not-found.tsx` for `notFound()`. Each is a segment boundary; use nested segments rather than one global spinner.
- Compose navigation with Base UI's `render` prop, not Radix's `asChild`.

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";

<Button render={<Link href="/reports" prefetch={false} />} variant="primary">
  View reports
</Button>;
```

- Default to Server Components; ship client JS only for measured interactivity.
- Layouts own persistent chrome; pages own data. Do not fetch in a layout what only one page needs.

### 3.3 Vue 3 + Nuxt

`<script setup>` is the standard SFC form. `defineEmits` declares a type — use a tuple for the payload so the event signature is checked, and a named-tuple object when there are several named arguments.

```vue
<!-- components/ReportCard.vue -->
<script setup lang="ts">
import { computed } from "vue";
import { NuxtImg } from "#components";

interface Report {
  id: string;
  title: string;
  updatedAt: string;
}

const props = defineProps<{
  report: Report;
  pending?: boolean;
}>();

// Tuple form: emits a single typed payload.
const emit = defineEmits<{
  archive: [id: string];
}>();

const timestamp = computed(() =>
  new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(
    new Date(props.report.updatedAt),
  ),
);

function onArchive() {
  emit("archive", props.report.id);
}
</script>

<template>
  <article class="rounded-xl border border-border bg-card p-4">
    <h3 class="text-base font-semibold">{{ report.title }}</h3>
    <p class="text-sm text-muted-foreground">{{ timestamp }}</p>
    <button
      type="button"
      class="h-10 rounded-md border px-3 text-sm"
      :disabled="pending"
      @click="onArchive"
    >
      Archive
    </button>
  </article>
</template>
```

- `useFetch`/`useAsyncData` in Nuxt transfers payloads to the client and keys by URL; don't pair them with a manual `fetch` in the same component.
- `<NuxtImg>` over `<img>`: automatic format negotiation, responsive `sizes`, provider backends. Set `width`/`height` (or use `fill` with a positioned parent) to reserve space.
- Type `defineProps`/`defineEmits`; avoid `any` and `PropType` gymnastics.
- Keep shared state in Pinia stores, not module-scope `ref()` singletons — module scope is not SSR-safe.
- Treat every store action and API call as untrusted input: validate on the server.

### 3.4 Svelte 5 + SvelteKit

Svelte 5 replaces the implicit reactivity model with runes. `$props`, `$state`, `$derived`, and `$effect` are explicit and compiler-checked; `$:` blocks still work but new code should use runes.

```svelte
<!-- src/lib/components/ArchivePanel.svelte -->
<script lang="ts">
  import { enhance } from "$app/forms';
  import { Button } from "$lib/components/ui';

  interface Props {
    id: string;
    title: string;
    onArchived?: (id: string) => void;
  }

  let { id, title, onArchived }: Props = $props();
  let archiving = $state(false);

  const label = $derived(archiving ? "Archiving…" : `Archive ${title}`);
</script>

<section class="rounded-xl border border-border bg-card p-4">
  <h3 class="text-base font-semibold">{title}</h3>
  <Button
    variant="outline"
    disabled={archiving}
    onclick={() => {
      archiving = true;
      onArchived?.(id);
      archiving = false;
    }}
  >
    {label}
  </Button>
</section>
```

```ts
// src/routes/reports/[reportId]/+page.server.ts — data on the server, typed
import { error } from "@sveltejs/kit";
import { getReport, listCharts } from "$lib/server/reports";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, depends }) => {
  depends("app:report");
  const [report, charts] = await Promise.all([
    getReport(params.reportId),
    listCharts(params.reportId),
  ]);
  if (!report) error(404, "Report not found");
  return { report, charts };
};
```

- `$props()` replaces `export let`; destructure once and type the object.
- `$derived` for computed values (expressions only — side effects go in `$derived.by`), `$state` for mutable local state, `$effect` only for synchronization with non-Svelte systems.
- `+page.server.ts` is the server boundary: secrets, cookies, and privileged data never cross it into the client payload.
- `+page.ts` for universal loads that only need public data; `+server.ts` for endpoints.
- In Svelte 5, event handlers are plain props (`onclick={...}`), not `on:click`.
- Stream slow data with `await` inside markup or a `<Suspense>` boundary; use `+loading.ts` for the route-level pending UI.


## 4. Performance Checklist

### Core Web Vitals

- [ ] **LCP < 2.5s** — the largest element is a hero image, headline, or server-rendered text (never a client-only render).
- [ ] **CLS < 0.1** — every image, iframe, ad slot, and async block reserves space (`width`/`height`, `aspect-ratio`, or a skeleton with fixed dimensions).
- [ ] **INP < 200ms** — long tasks under 50ms; heavy work moved off the interaction path (web worker, deferred, or server action).
- [ ] Measure with Lighthouse **and** real-user monitoring; lab scores are a floor, not a guarantee.

### Images

- [ ] Serve **AVIF** (with WebP fallback) via `<picture>` or a modern loader; never ship raw PNG for photographic content.
- [ ] Always set explicit `width` and `height` (or `aspect-ratio`) — the browser cannot reserve space otherwise.
- [ ] Use `next/image` in Next.js; set `sizes` correctly (`100vw` / breakpoint widths) so the right candidate is downloaded.
- [ ] `priority` on **one** LCP image only; `loading="lazy"` (the default) for everything below the fold.
- [ ] `quality` tuned per asset; 70–80 is usually indistinguishable for UI imagery.
- [ ] No image larger than ~2× its rendered CSS size; no 4000px hero served to a 400px slot.
- [ ] Decorative images get `alt=""`; meaningful images get real alt text (see §5).

### Fonts

- [ ] Self-host via `next/font` (or `fontsource`) — no render-blocking Google Fonts `<link>`.
- [ ] `display: swap` on every `@font-face`; text is visible immediately in fallback metrics.
- [ ] Preload only the primary above-the-fold weight(s) (`preload: true` in `next/font`).
- [ ] `size-adjust` / `ascent-override` on the fallback face to minimize layout shift on swap.
- [ ] Subset by script (`latin`), limit weights to 2–3, and use `variable` fonts instead of many static files.

### JavaScript

- [ ] Code split at the route level; heavy or rarely-used features load on demand.
- [ ] Lazy-load below-the-fold widgets, modals, charts, and editors via `next/dynamic` with a skeleton fallback.
- [ ] Server Components by default — push `"use client"` down to the smallest interactive leaf.
- [ ] No barrel-file imports of large libraries in hot paths; import specific subpaths.
- [ ] Debounce/throttle expensive handlers; avoid third-party scripts that are not load-bearing.
- [ ] No duplicated dependencies (`npm ls <pkg>` should show one version).

```tsx
// Heavy widget: ships a separate chunk, renders a skeleton while loading.
"use client";

import dynamic from "next/dynamic";

const RevenueChart = dynamic(() => import("./revenue-chart"), {
  ssr: false,
  loading: () => (
    <div
      className="h-64 w-full animate-pulse rounded-lg bg-muted"
      aria-hidden="true"
    />
  ),
});

export function RevenuePanel() {
  return <RevenueChart period="30d" />;
}
```

### CSS

- [ ] No `@import` in CSS — it serializes requests. Use bundler `@import` resolution or link tags in `<head>`.
- [ ] Only the critical CSS for the current route; framework CSS is code-split automatically.
- [ ] Prefer Tailwind utilities over large custom stylesheets; purge unused rules.
- [ ] No layout-shifting web-font swaps, no `scroll`/`resize` listeners writing layout properties without `requestAnimationFrame` throttling.
- [ ] Avoid animating `width`, `height`, `top`, or `left`; animate `transform` and `opacity` only.
- [ ] No `box-shadow`/`filter` animations on large surfaces on low-end devices; respect `prefers-reduced-motion`.

### Rendering & layout thrash

- [ ] No forced synchronous layout in loops: batch DOM reads before writes.
- [ ] Do not read `getBoundingClientRect()`/`offsetTop` while mutating styles in the same frame.
- [ ] Long lists are virtualized past ~100 rows; tables paginate or window.
- [ ] Effects that subscribe to resize/scroll clean up and are passive where possible.
- [ ] Derived state is computed during render or memoized — never stored redundantly in state.
- [ ] `Suspense` boundaries stream slow data instead of blocking the whole route.

### Caching & delivery

- [ ] Static assets served immutable: `Cache-Control: public, max-age=31536000, immutable` (hashed filenames required).
- [ ] HTML with data is revalidated deliberately (`s-maxage` + `stale-while-revalidate`), not `no-store` everywhere.
- [ ] API/data routes: explicit `revalidate`, `dynamic = "force-dynamic"`, or `cache`/`unstable_cache` — chosen intentionally, never by accident.
- [ ] Fonts and `/public` images get long-lived caching; user-specific responses are never publicly cacheable.
- [ ] Third-party scripts deferred (`strategy="lazyOnload"`) and consent-gated.

### Budget checklist

| Metric                | Target                                  | Enforcement                                  |
| --------------------- | --------------------------------------- | -------------------------------------------- |
| LCP (p75)             | < 2.5s                                  | CI Lighthouse budget                        |
| CLS (p75)             | < 0.1                                   | CI Lighthouse budget                        |
| INP (p75)             | < 200ms                                 | RUM / Lighthouse                             |
| Initial JS (gzipped)  | < 200KB                                  | CI bundle size check                         |
| Route JS (gzipped)    | < 150KB                                  | CI bundle size check                         |
| Font payload          | < 100KB total, ≤ 2 preloaded            | Manual review                                |
| Hero image             | < 150KB, AVIF/WebP, correct `sizes`      | Manual review                                |
| Time to first byte    | < 600ms                                 | CDN/RUM                                      |

- [ ] Budgets live in CI (`bundlesize`, `next-bundle-analyzer`, Lighthouse CI) and fail the build on regression, not just warn.

## 5. Accessibility (a11y) Checklist

### Color & contrast

- [ ] Body text meets **4.5:1** (WCAG 2.1 AA); large text (≥18.66px bold / ≥24px) meets **3:1**; target **7:1** (AAA) for primary copy where possible.
- [ ] Icons, borders, and input outlines that convey meaning meet **3:1** against their background.
- [ ] Color is never the only signal — pair it with text, an icon, or a pattern.
- [ ] Dark mode is checked independently; `--foreground`/`--muted-foreground` pairs are contrast-validated in **both** themes, not assumed to invert cleanly.
- [ ] Placeholder text is not the only label, and is contrast-sufficient.

### Touch targets & pointer

- [ ] Interactive targets are at least **44×44px** (`min-h-11 min-w-11`, or padding that reaches it) — icon buttons, table row actions, carousel dots.
- [ ] Adjacent targets have enough spacing that a mis-tap can't hit the wrong one.
- [ ] No `user-select: none` on primary content; hover-only affordances have a tap equivalent.
- [ ] Everything works with one hand / a keyboard on a narrow viewport; nothing depends on hover alone.

### Keyboard

- [ ] Every interactive element is reachable and operable via Tab/Shift+Tab, Enter/Space, and arrow keys where the pattern requires it.
- [ ] Tab order follows visual order; no positive `tabindex` values.
- [ ] Focus is never trapped except inside modal dialogs — and those implement focus return and `Escape`.
- [ ] Custom dropdowns, menus, and comboboxes follow the correct WAI-ARIA keyboard pattern (arrow navigation, type-ahead, `Home`/`End`).
- [ ] Skip-to-content link is the first focusable element on the page.
- [ ] `focus-visible` rings are always present and clearly visible (≥3:1 against the background).

```tsx
// Never `outline-none` without a visible replacement.
import { Button } from "@/components/ui/button";

export function IconButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label} // icon-only controls need an accessible name
      onClick={onClick}
      className="size-11 min-h-11 min-w-11 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <TrashIcon aria-hidden="true" className="size-4" />
    </Button>
  );
}
```

### ARIA

- [ ] The **first rule of ARIA is not to use ARIA** — a native element beats a `role`+`tabIndex` imitation.
- [ ] `aria-label` (or visually hidden text) on every icon-only button, and on any control whose content isn't a plain text name.
- [ ] `aria-hidden="true"` on purely decorative icons and SVGs so screen readers skip them.
- [ ] `aria-live="polite"` (or `role="status"`) on dynamic content: toasts, search results count, save indicators. `aria-live="assertive"` only for errors that interrupt.
- [ ] `aria-expanded` / `aria-controls` / `aria-current` kept in sync with real state.
- [ ] `aria-describedby` points at real help/error text; validation errors are announced, not just colored red.
- [ ] Modals: `role="dialog"`, `aria-modal="true"`, labelled by their title, focus moved in on open and restored on close.
- [ ] No `role` on a `<div>` that has an interactive element inside it (invalid nesting / duplicated semantics).

### Semantic HTML

- [ ] `<button>` for actions, `<a href>` for navigation. **Never** `<div onClick>` or `<span onClick>`.
- [ ] Buttons declare `type="button"` unless they genuinely submit.
- [ ] One `<h1>` per page; heading levels descend without gaps and are never chosen for size alone.
- [ ] Landmarks present: `<header>`, `<nav aria-label="…">`, `<main>`, `<article>`, `<aside>`, `<footer>` — exactly one `<main>` per page.
- [ ] Skip links and `id` anchors exist for in-page navigation; focus moves to the target on route change.
- [ ] Lists are `<ul>`/`<ol>`, tables are `<table>` with `<th scope>` and captions.
- [ ] `lang` is set on `<html>`; `dir` is set when content is RTL.

### Forms

- [ ] Every input has a real `<label htmlFor="…">`; placeholders are hints, not labels.
- [ ] Related controls are grouped in `<fieldset>` with a `<legend>` (radios, checkboxes, address blocks).
- [ ] Required fields marked with `required` / `aria-required`, not only an asterisk.
- [ ] Errors: `aria-invalid`, `aria-describedby` → error text, message adjacent to the field, and a summary that moves focus on submit.
- [ ] Inputs have `type`, `inputMode`, and `autoComplete` set correctly — autofill must work.
- [ ] Buttons say what happens ("Save changes"), not "Submit" alone; destructive actions confirm and name the target.

### Content & media

- [ ] Alt text describes purpose, not appearance ("Search results for `acme`", not "image of search"). Empty `alt=""` for decoration.
- [ ] Link text is meaningful out of context — no "click here" or bare URLs.
- [ ] Timeouts/session expiry give a warning and are extendable; no surprise redirects.
- [ ] Instructions don't rely on sensory cues ("the red button") or unexplained jargon.
- [ ] Status messages (saved, failed, offline) are perceivable without sight and persist long enough to read.

### Motion & preferences

- [ ] `prefers-reduced-motion: reduce` is respected globally — no parallax, autoplay, or large transforms.
- [ ] No autoplaying audio, no flashing above 3× per second; video has captions and a transcript.
- [ ] Nothing important is conveyed by animation alone.
- [ ] `prefers-contrast` / forced-colors mode leaves borders and focus rings visible.

### Verification

- [ ] Keyboard-only pass over every flow: navigate, submit, close, recover from error.
- [ ] Automated audit (Lighthouse a11y, axe, eslint-plugin-jsx-a11y) is clean or documented.
- [ ] Manual screen-reader smoke test (VoiceOver or NVDA) on primary flows.
- [ ] Zoom to 200% and 400% without horizontal scroll or clipped content.
- [ ] Automated checks never substitute for the keyboard and screen-reader pass.


## 6. Testing Strategy

| Level | Tool | Focus |
| --- | --- | --- |
| Unit | Vitest | Pure functions, hooks, reducers, formatters, design-token logic. No DOM assertions beyond what the unit owns. |
| Component | Vitest + Testing Library | Behavior from the user's perspective: role/label queries, keyboard interaction, conditional copy, empty/loading/error states. |
| E2E | Playwright | Critical journeys only: signup, login, checkout, multi-step form, navigation and route guards. |
| Visual | Chromatic / Playwright screenshots | Regression on layout, spacing, and color tokens across breakpoints and themes. |
| A11y | axe-core (`vitest-axe` or Playwright `@axe-core/playwright`) | Automated rule violations, focus order, accessible names, contrast. Run on every shared component. |

Prefer `getByRole` over `getByTestId`; reserve test ids for elements with no accessible handle (canvas, icon-only triggers). Assert what the user perceives — visible text, roles, names — not internal state.

```tsx
// src/features/settings/components/theme-toggle.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "@/features/settings/components/theme-toggle";

function setup() {
  const onChange = vi.fn();
  render(<ThemeToggle value="light" onChange={onChange} />);
  return { user: userEvent.setup(), onChange };
}

describe("ThemeToggle", () => {
  it("exposes both options as radio controls and reports the selection", async () => {
    const { user, onChange } = setup();

    await user.click(screen.getByRole("radio", { name: /dark/i }));

    expect(onChange).toHaveBeenCalledWith("dark");
    expect(screen.getByRole("radio", { name: /dark/i })).toBeChecked();
  });

  it("is reachable and operable from the keyboard", async () => {
    const { user, onChange } = setup();

    await user.tab();
    expect(screen.getByRole("radio", { name: /light/i })).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenCalledWith("dark");
  });
});
```

**Never claim a change works until the suite is green.** Run `npx vitest run` (plus `npm run lint` and `npm run build`) and paste the real result. No "should work", no skipped or commented-out assertions, no `it.skip` to force a green run. If a test is genuinely impossible, say so and explain why instead of faking coverage.

## 7. State Management Decision Tree

```text
Where does this state live?
|
+-- Does it die when the user navigates away, and is it only about
|   how this component *looks* right now?
|     YES -> local UI state ........ useState (React) / $state (Solid)
|     NO  -> keep going
|
+-- Is the value owned by the server (fetched, cached, mutated
|   remotely, invalidated after a write)?
|     YES -> server state ......... TanStack Query (React) / SWR /
|                                    nuxt useFetch / Solid `createResource`
|     NO  -> keep going
|
+-- Do two or more distant components read *and* write it, and is it
|   pure client-side (theme, cart draft, wizard step, UI flags)?
|     YES -> global client state .. Zustand or nanostores (React),
|                                    Pinia (Vue), Svelte stores
|     NO  -> keep going
|
+-- Is it the value set of a form being edited, validated, and submitted?
|     YES -> form state ........... React Hook Form + Zod (or TanStack Form)
|     NO  -> keep going
|
+-- Should it survive refresh, be linkable, or drive server behavior
|   (filters, tabs, pagination, search, locale)?
|     YES -> URL state ............ useSearchParams + router.replace,
|                                    Nuxt `useRoute`/`navigateTo`,
|                                    Solid `useSearchParams`
|     NO  -> lift it to the nearest
|            common parent and
|            stop there.
```

**Principle: do not mirror server or URL state in a global store.** Duplicating it creates two sources of truth, which drift: the query cache invalidates while the store does not, the URL changes on back/forward while the store does not, and stale values get written back over fresh fetches. Let TanStack Query/SWR own remote data, let the URL own linkable state, and reserve the global store for state that is genuinely client-local and shared. One owner per fact.

## 8. Common Mistakes (DO NOT)

- **Do not ship the generic AI aesthetic** — Inter + purple/indigo gradient + uniform rounded cards + drop shadow. It reads as an unfinished template. Commit to a type scale with real contrast, a deliberate type pairing, a distinct palette, and asymmetric or deliberately bordered surfaces.
- **Do not add `"use client"` to the root layout or page.** It converts the whole tree into a client bundle, disables server components below it, and forfeits streaming. Push the boundary down to the smallest interactive leaf.
- **Do not fetch server data in `useEffect`.** It creates a waterfall, races with Strict Mode double-invocation, leaks on unmount, and is untestable. Fetch in a Server Component, a route loader, or a query library.
- **Do not use a `div` with `onClick` as a button.** It is unreachable by keyboard, invisible to screen readers, and misses focus, `disabled`, and activation semantics. Use `<button type="button">`; add `role`/`tabIndex` only when you truly cannot.
- **Do not remove outlines.** `outline: none` without a visible replacement breaks keyboard navigation. Use `outline-none` *with* a `focus-visible` ring of at least 2px and 3:1 contrast.
- **Do not use margins to space sibling components.** `margin-bottom` collapses unpredictably and leaks upward. Use `gap-*` / `space-y-*` on the flex or grid parent that owns the layout.
- **Do not reach for `!important`.** It starts a specificity war you will lose. Fix the cascade: rename the class, reorder the stylesheet, or scope the variant in a component API.
- **Do not write inline `style={{}}` except for dynamic animation values.** Static styling belongs in the class system. Inline styles cannot be themed, overridden, or purged.
- **Do not lay out in fixed `px`.** Fixed pixels break zoom and text scaling. Use `rem`, `%`, `min()`, `max()`, and `clamp()` so layouts respond to user font size.
- **Do not use `system-ui` as the primary brand font.** It is indistinguishable from the OS default and signals a template. Self-host a distinctive display face for headings and pair it with a legible text face for body copy.


## 9. Output Format

Every deliverable MUST follow this exact template:

```text
AESTHETIC DIRECTION: <direction name — one line on why it fits the product>
PALETTE: <primary + support colors, hex or token names>
FONTS: <display face> + <body face>
STACK: <framework + key tools>
---
FILE: <path/to/file.tsx>
<full code>
---
FILES CHANGED: n
PERFORMANCE: <LCP estimate, bundle size impact>
A11Y: <contrast ratios, keyboard behavior>
```

This is a fixed contract, not a suggestion: identical structure on every run so output stays diffable and consistent no matter who (or what) is driving the build.

## 10. Rules for the Agent

1. Start with Design Thinking every time: Purpose, Tone, Differentiation, Constraint — before a single token of code.
2. Never use generic fonts: Inter, Roboto, Arial, system-ui, Space Grotesk, Poppins, Montserrat. Pick a face with a point of view.
3. Never ship a purple gradient on a white background. That is the visual signature of an unconsidered template.
4. Ship complete, copy-pasteable TypeScript. No pseudocode, no `// ...rest of implementation`, no placeholder imports.
5. Include a usage example for every component — the props that matter, one realistic call site.
6. Always state the file path. The agent must know where the file goes before it writes.
7. Every animation gets a `prefers-reduced-motion` fallback. Non-negotiable.
8. Every component is keyboard accessible: focusable, operable, and visibly focused.
9. Write realistic copy. Real headlines, real labels, real empty states — never lorem ipsum.
10. Explicitly name and justify every trade-off. If something was cut for performance or clarity, say so out loud.

## 11. Repo Notes (this project)

This skill is **additive** to the repo's existing rules in `AGENTS.md` and `docs/`. It does not replace them. Where they conflict, the repo rules win.

- Next.js 16 App Router + React 19 + TypeScript strict + Tailwind v4.
- Base UI (`@base-ui/react`), **not** Radix. `render={<Link />}` — never `asChild`.
- Semantic color tokens live in `src/app/globals.css`. Use tokens, not raw hex in components.
- Server Component by default; `"use client"` only on interactive leaves.
- Zod validates at the boundary. `AppError` for error taxonomy — never `throw` a string.
- Merge gate: `npm run lint` && `npm run build` must pass.
- Bold aesthetics must never override accessibility, the design token system, or the merge gate.


