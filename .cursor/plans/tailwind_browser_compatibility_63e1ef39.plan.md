---
name: Tailwind Browser Compatibility
overview: "Analysis of two approaches to support Chrome 70-89: downgrading to Tailwind v3 (recommended) versus post-processing Tailwind v4 output. Includes a full inventory of required changes for each path."
todos:
  - id: swap-packages
    content: Replace Tailwind v4 packages with v3.4 equivalents (tailwindcss, autoprefixer, postcss-import, tailwindcss-animate)
    status: completed
  - id: create-tailwind-config
    content: Create tailwind.config.ts with theme, darkMode, content paths, and animation plugin
    status: completed
  - id: convert-colors
    content: Convert all 62 oklch() values in globals.css to hsl/hex equivalents
    status: completed
  - id: rewrite-globals-css
    content: "Rewrite globals.css: @tailwind directives, remove @theme/@custom-variant, use converted colors"
    status: completed
  - id: update-postcss
    content: Update postcss.config.mjs to use tailwindcss + autoprefixer + postcss-import
    status: completed
  - id: regenerate-shadcn
    content: Update components.json and re-generate all 34 shadcn/ui components for v3
    status: completed
  - id: audit-utility-classes
    content: Search 262 .tsx files for renamed/removed v4 utility classes and fix them
    status: completed
  - id: test-build
    content: Build and test the app, verify styles render correctly on Chrome 70+
    status: pending
isProject: false
---

# Tailwind CSS Browser Compatibility: Supporting Chrome 70-89

## The Problem

Your project uses **Tailwind CSS v4.1.17** which requires **Chrome 111+** (March 2023). Users on Chrome 70-89 (2019-2021 era) will see broken styles because v4 relies on CSS features unavailable in that range:


| CSS Feature               | Required Chrome | Used By                                         |
| ------------------------- | --------------- | ----------------------------------------------- |
| `@layer` (cascade layers) | 99+             | Tailwind v4 core specificity model              |
| `color-mix()`             | 111+            | Tailwind v4 opacity modifiers (`bg-primary/50`) |
| `@property`               | 85+             | Tailwind v4 color interpolation                 |
| `oklch()`                 | 111+            | Your 62 custom color values in globals.css      |
| `:is()` / `:where()`      | 88+             | Tailwind v4 dark mode, group/peer variants      |


---

## Option A: Downgrade to Tailwind v3.4 (Recommended)

**Effort:** ~2-4 days | **Reliability:** High | **Minimum Chrome:** ~50+

This is the officially recommended path from the Tailwind team for older browser support. It is the most reliable option but requires touching multiple files.

### What Changes

**1. Package swaps** in [package.json](package.json)

- `tailwindcss`: `^4.1.17` --> `^3.4.17`
- `@tailwindcss/postcss`: remove entirely
- `tw-animate-css`: remove, replace with `tailwindcss-animate` (v3 compatible)
- Add `autoprefixer` and `postcss-import` as devDependencies

**2. Create `tailwind.config.ts`** (does not exist today)

Translate the `@theme inline` block from [globals.css](app/globals.css) into a v3 JavaScript config:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        // ... all other tokens
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)"],
        mono: ["var(--font-geist-mono)"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
```

**3. Rewrite [app/globals.css](app/globals.css)**

- Line 1: `@import "tailwindcss"` --> `@tailwind base; @tailwind components; @tailwind utilities;`
- Line 2: `@import "tw-animate-css"` --> remove (handled by plugin in config)
- Line 32: `@custom-variant dark (...)` --> remove (handled by `darkMode: ["class"]` in config)
- Lines 34-72: `@theme inline { ... }` --> remove entirely (moved to `tailwind.config.ts`)
- Lines 74-157: Convert all 62 `oklch()` color values to `hsl()` or hex equivalents
- Line 162: `@apply border-border outline-ring/50` --> verify `outline-ring/50` opacity modifier syntax works in v3 (may need adjustment)

**4. Update [postcss.config.mjs](postcss.config.mjs)**

```javascript
const config = {
  plugins: {
    "postcss-import": {},
    tailwindcss: {},
    autoprefixer: {},
  },
};
export default config;
```

**5. Re-generate shadcn/ui components**

Your 34 components in `components/ui/` were generated for Tailwind v4 shadcn. You need to:

- Update [components.json](components.json) to point to v3-compatible shadcn registry
- Re-run `npx shadcn@latest add <component>` for each component, OR manually audit each file for v4-only patterns

**6. Audit 262 .tsx files for renamed utilities**

Some Tailwind classes were renamed between v3 and v4. Key renames to search for:

- `shadow-xs` --> `shadow-sm` (v3 name)
- `shadow-sm` --> `shadow` (v3 name)
- `ring` --> `ring-3` (v3 used `ring` for 3px)
- `rounded-sm` --> check if border-radius tokens match
- Any v4-only utilities that didn't exist in v3

### Risks

- Largest effort; touches globals.css, config, postcss, 34 UI components, potentially 262 .tsx files
- Color conversion from oklch to hsl/hex may produce slightly different visual appearance
- Any v4-only utility classes scattered across 262 files need to be found and replaced

---

## Option B: Stay on v4, Post-Process with LightningCSS

**Effort:** ~1-2 days | **Reliability:** Low-Medium for Chrome 70-89

Keep Tailwind v4 but add `postcss-lightningcss` as a second PostCSS plugin to transpile the output CSS for older browsers.

### What It Can Fix

- `oklch()` --> converted to `rgb()` in output
- `color-mix()` --> computed to static values
- CSS nesting --> flattened
- Vendor prefixes --> added automatically

### What It Cannot Fix (Fundamental Blockers)

- `**@layer`**: LightningCSS can strip cascade layers, but specificity ordering may break in edge cases. Tailwind v4's entire specificity model relies on layers.
- `**:is()` / `:where()`**: Used for dark mode (`@custom-variant dark (&:is(.dark *))`), group variants, and peer variants. Chrome < 88 doesn't support these. No transpilation possible.
- `**@property`**: Chrome < 85 has no support. LightningCSS can remove these declarations but fallbacks may not work correctly for opacity modifiers.

### Setup

```javascript
// postcss.config.mjs
import postcssLightningcss from "postcss-lightningcss";

const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    "postcss-lightningcss": {
      browsers: "chrome >= 70",
    },
  },
};
export default config;
```

Plus convert the 62 `oklch()` values in [globals.css](app/globals.css) to `hsl()`/hex (CSS custom properties are not transpiled by LightningCSS since their values are resolved at runtime, not build time).

### Risks

- Dark mode will likely break on Chrome < 88 (no `:is()` support)
- Opacity modifiers (`bg-primary/50`) may not work on Chrome < 85 (no `@property`)
- Cascade layer stripping could cause specificity conflicts
- This is not a tested/supported configuration by the Tailwind team
- Requires extensive manual testing across target browsers

---

## Option C: Hybrid -- v3 Downgrade with Automation

Same as Option A, but using Tailwind's official upgrade tool in reverse plus automation:

1. Use an oklch-to-hex converter tool to batch-convert all 62 color values
2. Use shadcn CLI to re-add all 34 components cleanly for v3
3. Use a codemod/grep to find and replace renamed utility classes across 262 files

This is still Option A but with a more systematic execution plan.

---

## Recommendation

**For Chrome 70-89 support, Option A (downgrade to v3) is the only reliable path.** Option B has fundamental CSS feature gaps (`:is()`, `@layer`) that cannot be transpiled away, meaning dark mode, group variants, and utility specificity would break.

The Tailwind team explicitly recommends: *"If you need to support older browsers, we recommend sticking with v3.4 for now."*

The work is non-trivial but mostly mechanical:

1. The v4-specific surface area is concentrated in `globals.css` (theme, colors, directives)
2. shadcn components can be re-generated via CLI
3. Utility class renames can be found with grep and batch-replaced

