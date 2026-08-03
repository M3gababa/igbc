# IGBC — Theme & Design System

## Logo

File: `app/src/main/res/drawable/igbc_logo.png` (gold geometric compass mark, transparent background)

**Usage notes:**
- Transparent background — place directly on any dark surface, no clipping needed
- For the Android launcher adaptive icon, use Android Studio's Image Asset Studio with this file as the source foreground layer

---

## Color Palette

All colors derived from the logo gold + a deep space dark base.

```kotlin
// Core
val SpaceBlack    = Color(0xFF0A0A12)   // App background
val SpaceDeep     = Color(0xFF14141F)   // Surface (cards, sheets)
val SpaceSurface  = Color(0xFF1E1E2E)   // Elevated surface (dialogs, nav bar)

// Primary — logo gold
val GoldPrimary   = Color(0xFFD4A800)   // Button fills (dark text sits on top — contrast is inherent)
val GoldText      = Color(0xFFF0C419)   // Gold used AS text/icons on dark surfaces — brighter than GoldPrimary on purpose
val GoldLight     = Color(0xFFFFD740)   // Hover/pressed state, shimmer
val GoldDark      = Color(0xFF9A7800)   // Disabled gold, subtle borders (never for text)

// Semantic
val CreditGreen   = Color(0xFF4CAF82)   // Positive balance, success states
val AlertRed      = Color(0xFFCF6679)   // Error, Deny button, negative amounts
val WarningAmber  = Color(0xFFFFB347)   // Warnings, MFA countdown timer

// Text
val TextPrimary   = Color(0xFFEDE8DC)   // Main body text (warm white)
val TextSecondary = Color(0xFFD8D0C0)   // Captions, metadata, labels — lightened from #B0A898 (2026-07-27, see Contrast Rules)
val TextDisabled  = Color(0xFF5A5468)   // Disabled / placeholder text ONLY — never use for readable copy
```

### Contrast Rules (added 2026-07-27)

The web app shipped with `text-gray-400/500/600` (unthemed Tailwind defaults) and opacity-reduced text like `text-igbc-gold/60` for labels, captions, and loading states. Neither is part of this palette — they were never checked against `SpaceBlack`/`SpaceDeep` and land at ~2.6–4:1 contrast, well under WCAG AA. That's the actual cause of "yellow and grey don't stand out," not the palette itself (`GoldPrimary` on `SpaceBlack` is already ~8.8:1).

Going forward, on every platform:

- **Never use a framework's default gray/yellow scale** (Tailwind `gray-*`, `yellow-*`, Compose `Color.Gray`, etc.) for text. Always reference a named token from this palette (`TextPrimary`, `TextSecondary`, `GoldText`, ...).
- **Never apply opacity to text** to indicate a disabled/muted/loading state (`text-*/60`, `.opacity(0.6)` on a `Text`). Opacity blends toward the background and silently kills contrast. Use `TextDisabled` or `TextSecondary` — a distinct token, not a faded one — instead. Opacity modifiers are fine on borders, dividers, and background tints, just not text.
- **Use `GoldText`, not `GoldPrimary`, for gold text/icons on `SpaceBlack`/`SpaceDeep`/`SpaceSurface`.** `GoldPrimary` is tuned for button fills, where dark text sits on top of it — a different job than gold text sitting on a dark background.
- **Minimum contrast:** ≥4.5:1 for normal text, ≥3:1 for large text (≥24px, or ≥19px bold), against whichever surface it renders on. Check new tokens against both `SpaceBlack` and `SpaceDeep`, not just one.

### Material 3 Role Mapping

| M3 Role | Color | Hex |
|---|---|---|
| `primary` | GoldPrimary | `#D4A800` |
| `onPrimary` | SpaceBlack | `#0A0A12` |
| `primaryContainer` | `#3D2E00` | dark gold container |
| `onPrimaryContainer` | GoldLight | `#FFD740` |
| `background` | SpaceBlack | `#0A0A12` |
| `onBackground` | TextPrimary | `#EDE8DC` |
| `surface` | SpaceDeep | `#14141F` |
| `onSurface` | TextPrimary | `#EDE8DC` |
| `surfaceVariant` | SpaceSurface | `#1E1E2E` |
| `onSurfaceVariant` | TextSecondary | `#D8D0C0` |
| `error` | AlertRed | `#CF6679` |
| `onError` | `#370012` | — |

**Dark theme only** — no light theme for this app.

---

## Typography

- **Display / Headlines:** `Orbitron` (sci-fi feel, available on Google Fonts) — use sparingly for screen titles and balance amounts
- **Body / Labels:** `Inter` or system default `sans-serif` — clean and readable for data-dense screens
- **Monospace accents:** `JetBrains Mono` or `monospace` — for account numbers, transaction IDs, token claim values

---

## Currency

| Context | Usage |
|---|---|
| Full name | "Galactic Credits" |
| Abbreviated | "cred" (lowercase) |
| Symbol prefix | `₢` if a symbol is needed — otherwise spell out |
| Example | "14,200 cred" or "14,200 Galactic Credits" |
| Negative amounts | Show in `AlertRed` |
| Positive amounts | Show in `CreditGreen` |

---

## UI Tone

- Screens should feel like a **secure terminal on a starship** — dark, precise, gold accents
- Avoid rounded-everything softness; prefer slightly sharper corners (`8.dp` max radius on cards)
- Demo-friendly: labels and section headers should be clear enough for a live audience to follow without explanation
- Error messages can carry IGBC flavor ("Transaction rejected by the Galactic Banking Authority") but keep Auth0 errors technical and readable for demo context
