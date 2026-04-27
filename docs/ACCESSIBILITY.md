# Accessibility audit — WCAG 2.1 AA

The primary user is a **retired NFL player**, often dealing with
chronic pain, cognitive impact, vision impairment, or hearing loss.
WCAG 2.1 AA is a floor, not a ceiling. We aim for plain language at
roughly an 8th-grade reading level, large touch targets, and strong
keyboard support.

## How to run the audit

1. **Automated, every CI run**:
   - `axe-core` via `@axe-core/playwright` against the player and admin
     happy paths in CI.
   - Lighthouse CI accessibility score must be ≥ 95.
2. **Manual, before each release**:
   - Walk the keyboard-only flow: tab, arrow, enter, escape, no mouse.
   - Walk the screen-reader flow with NVDA (Windows) and VoiceOver (macOS).
   - Walk the page at 200% browser zoom and 320px viewport.
3. **Quarterly external review** by a vendor that includes users with
   disabilities in the panel.

## v1 status by WCAG criterion (selected)

| # | Criterion | Status | Notes |
|---|---|---|---|
| 1.1.1 | Non-text content | OK | All icons accompanied by text labels; decorative icons `aria-hidden`. |
| 1.3.1 | Info & relationships | OK | Forms use `<label>` + `htmlFor`; tables use `<th>`. |
| 1.3.5 | Identify input purpose | OK | `autocomplete` attributes on personal-data inputs (TODO: confirm on onboarding wizard). |
| 1.4.3 | Contrast (minimum) | OK | `brand-` palette tested ≥ 4.5:1 against white in design tokens. |
| 1.4.4 | Resize text | OK | Tailwind text uses `rem`; layouts reflow at 200% zoom. |
| 1.4.10 | Reflow | OK | No horizontal scroll at 320px viewport on player flows. |
| 1.4.11 | Non-text contrast | OK | Buttons + form borders ≥ 3:1. |
| 2.1.1 | Keyboard | OK | All interactive components are native `<button>` / `<a>`. |
| 2.1.2 | No keyboard trap | OK | No custom dialogs in v1. |
| 2.4.1 | Bypass blocks | OK | Skip-to-main link in root layout. |
| 2.4.3 | Focus order | OK | DOM-driven; verified on onboarding + claim builder. |
| 2.4.4 | Link purpose | OK | Link text describes destination (no "click here"). |
| 2.4.7 | Focus visible | OK | `focus-visible` ring on all interactive components. |
| 2.5.5 | Target size (AAA) | OK | Buttons min 44×44 via the `.btn` class. |
| 3.1.5 | Reading level | OK | Copy reviewed for 8th-grade Flesch-Kincaid; banner copy short. |
| 3.3.1 | Error identification | OK | Inline form errors w/ `aria-live="polite"`. |
| 3.3.2 | Labels or instructions | OK | All inputs have visible labels + helper text where needed. |
| 4.1.2 | Name, role, value | OK | Native semantics; no custom widgets that need ARIA roles. |
| 4.1.3 | Status messages | TODO | Add `role="status"` to toast/notification surfaces. |

## Open items before launch

- [ ] Run the full axe + Lighthouse CI suite against the staging build and
      attach the report.
- [ ] Schedule the external audit (recommended: a vendor with NFL retiree
      adjacent experience, e.g. a vocational rehab nonprofit).
- [ ] Conduct user testing with at least three retirees, including one
      with low vision and one with hearing loss.
- [ ] Add per-page `<title>` + `<meta name="description">` audit (some
      pages currently inherit defaults).
- [ ] Confirm color isn't the only signal in the dashboard urgency
      pills (status text + icon + color all present today — keep it that
      way).
