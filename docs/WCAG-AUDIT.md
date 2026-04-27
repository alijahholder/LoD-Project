# Accessibility Audit — WCAG 2.1 AA

> Goal: Conform to WCAG 2.1 Level AA. Many users have orthopedic, hearing, sight, vital-organ, or CNS impairments — accessibility is a feature, not a checkbox.

## Built-in measures (already shipped)

- **Skip-to-content** link in `app/layout.tsx`.
- **Visible focus rings** via Tailwind `focus-visible` utilities; never `outline: none`.
- **Color contrast**: `brand-700`/white meets 4.5:1 for body and ≥ 3:1 for UI components.
- **Form labels** present on every input (`<Label htmlFor>` + `<Input id>`).
- **Touch targets** ≥ 44×44 CSS px on interactive controls (`btn` utility / `py-2` minimum).
- **Semantic landmarks**: `<header>`, `<nav aria-label="Primary">`, `<section>`, `<main>`.
- **Live regions** for the idle-timeout warning (`role="alertdialog"`, `aria-live`).
- **Plain language**: copy aimed at ~8th-grade reading level (re-tested in Hemingway each release).
- **Keyboard-only navigation**: all flows reachable without a pointer (validated in dev test).
- **Animation**: no auto-playing or essential animation; respects `prefers-reduced-motion` (TODO: add explicit media query in `globals.css`).
- **Error identification**: forms surface inline error text, not just color, e.g. red banner with error message and aria-describedby on the field.

## Checklist (run at every release)

| WCAG SC | Test | How to test | Passes? |
|---|---|---|---|
| 1.1.1 Non-text content | All images have alt text | grep `<img` for missing `alt` | |
| 1.3.1 Info & relationships | Headings in order; lists marked up; tables headers | manual axe scan | |
| 1.4.3 Contrast (Minimum) | 4.5:1 body, 3:1 large text | axe + Stark | |
| 1.4.10 Reflow | No 2D scroll at 320 CSS px | DevTools 320×600 | |
| 1.4.11 Non-text contrast | UI 3:1 against background | manual | |
| 1.4.13 Content on hover | dismissible / hoverable / persistent | manual | |
| 2.1.1 Keyboard | All flows reachable via keyboard | manual | |
| 2.1.2 No keyboard trap | Tab through all interactives | manual | |
| 2.4.1 Bypass blocks | Skip-link present | code | |
| 2.4.3 Focus order | Logical | manual | |
| 2.4.6 Headings & labels | Descriptive | manual | |
| 2.4.7 Focus visible | Always | manual | |
| 2.5.5 Target size | 44×44 CSS px | manual | |
| 3.1.1 Language of page | `<html lang="en">` | code | |
| 3.2.1 On focus | No context change on focus | manual | |
| 3.3.1 Error identification | Inline + aria | manual | |
| 3.3.2 Labels or instructions | Every input | code | |
| 4.1.2 Name, role, value | Custom controls expose ARIA | axe | |
| 4.1.3 Status messages | Success/error use `aria-live` | manual | |

## Automated tooling

- `npm run lint` — eslint-plugin-jsx-a11y (TODO: enable rule set).
- `axe-core` via Storybook or a lighthouse-ci job in CI.
- Pa11y for full-site sweeps.

## Manual tooling

- VoiceOver (macOS), NVDA (Windows), TalkBack (Android), JAWS (Windows).
- Keyboard-only walkthrough at every release.
- High-contrast mode and zoom 200%.

## Open items

- [ ] Add `prefers-reduced-motion` query in `globals.css`.
- [ ] Add `aria-describedby` from form fields to inline error text.
- [ ] Provide transcripts for any future audio/video education.
- [ ] Schedule annual VPAT update once stable.

## Sign-off

- Accessibility lead: ____ Date: ____
- External audit firm: ____ Report ID: ____
