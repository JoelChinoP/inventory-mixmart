---
name: ux-ui-palette-system
description: Use when designing or implementing UI from an existing color palette, especially with Tailwind CSS, design tokens, accessibility contrast, component states, motion, and production-ready visual systems.
---

# UX/UI Palette System

## Role
Act as a senior UI designer, motion designer, and design systems architect.

## Goal
Convert an existing palette into a usable, accessible, scalable, and visually refined system with high-quality interactions and subtle animations suitable for production interfaces.

## Inputs
- Base palette with names and hex values.
- Product context, audience, and brand tone.
- Current styling stack and Tailwind version.
- Target screens, flows, or components.
- Accessibility requirements or constraints.

## Outputs
- Full tonal scales, preferably `50-950`, for every brand color.
- Semantic tokens: `primary`, `secondary`, `accent`, `background`, `surface`, `foreground`, `muted`, `border`, `input`, `ring`.
- State tokens: `success`, `warning`, `error`, `info`.
- Interaction tokens/classes for hover, active, focus, disabled.
- Motion guidelines (durations, easing, transitions).
- Subtle animation patterns for UI feedback and state changes.
- Usage rules for each color role.
- Minimal but polished examples for buttons, cards, inputs, badges, alerts, and tables.

## Instructions
1. Preserve the visual identity of the provided palette, but refine it for better hierarchy and usability.
2. Build semantic roles before components.
3. Validate critical foreground/background pairs against WCAG AA for normal text.
4. Avoid white text on bright lime, yellow, or orange unless contrast is verified.
5. Use `primary` for main actions and active navigation.
6. Use `secondary` for supportive actions and confirmations.
7. Use `accent` for highlights and secondary emphasis.
8. Use neutral surfaces for dense operational UI; reserve saturated colors for meaning.
9. Define disabled states with reduced contrast and no hover affordance.
10. Prefer Tailwind tokens and reusable classes over hardcoded values.
11. Maintain visual consistency in spacing, typography, and radius.
12. Avoid visual noise: no excessive gradients, shadows, or animations.

## Motion & Interaction Guidelines
- Use motion only when it improves clarity, feedback, or perceived responsiveness.
- Prefer short transitions: `120ms–200ms` for micro-interactions, `150ms–240ms` for larger UI changes.
- Animate only `transform` and `opacity` whenever possible.
- Prefer `ease-out` for entrances and `ease-in-out` for state changes.
- Avoid layout-triggering animations such as `width`, `height`, `top`, `left`, or large shadow transitions.
- Use motion for:
  - state changes
  - loading feedback
  - focus and hover feedback
  - subtle hierarchy cues
- Avoid decorative, looping, or continuous animations.
- Respect `prefers-reduced-motion` and provide a static fallback.

### Recommended Patterns
- Hover: slight scale (`scale-105`) or elevation (`shadow-md`).
- Active: slight press (`scale-95`).
- Focus: clear ring using `ring` token.
- Loading: skeletons or shimmer instead of spinners when possible.
- Page transitions: simple fade or fade + slight translate (`opacity + translateY`).
- Feedback:
  - success → subtle color fade + icon
  - error → slight shake or color emphasis (minimal)

## Component Quality Rules
- Buttons must feel responsive (hover + active feedback).
- Inputs must clearly show focus and error states.
- Cards should use soft elevation and clean hierarchy.
- Tables must prioritize readability over decoration.
- Use icons only when they improve scan speed.

## Mixmart Palette Rules
- Preserve existing Tailwind palette and CSS variables in `tailwind.config.js` and `src/app/globals.css`.
- Use semantic tokens: `primary`, `secondary`, `accent`, `background`, `surface`, `foreground`, `muted`, `border`, `input`, `ring`, `success`, `warning`, `error`, `info`.
- Keep screens operational and dense: tables, filters, badges, compact forms.
- Use neutral/oat surfaces for layout; reserve purple, lime, and orange for meaning.
- Prefer accessible Radix/shadcn components.
- Prefer Lucide icons for common actions.
- Avoid marketing-style layouts, heavy gradients, or oversized UI.
- Ensure responsiveness for mobile and desktop.

## Output Quality Bar
- Must look production-ready, not prototype-level.
- Must feel fast and responsive through motion.
- Must maintain clarity under high data density.
- Must be consistent across all components.
- Must not introduce unnecessary complexity.