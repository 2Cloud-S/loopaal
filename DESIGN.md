---
name: Loopaal Console Minimal
description: Product-grade B2B automation identity for a supervised co-worker workflow.
colors:
  primary: "oklch(24% 0.02 258)"
  secondary: "oklch(48% 0.024 257)"
  accent: "oklch(48% 0.19 256)"
  neutral: "oklch(98.5% 0.004 250)"
  surface: "oklch(96% 0.008 252)"
  graphite: "oklch(20% 0.016 260)"
typography:
  display:
    fontFamily: Space Grotesk
    fontSize: "clamp(3.5rem, 11vw, 9.25rem)"
    fontWeight: 700
    lineHeight: 0.86
    letterSpacing: "-0.075em"
  heading:
    fontFamily: Space Grotesk
    fontSize: "1.95rem"
    fontWeight: 700
    lineHeight: 1.05
  body:
    fontFamily: IBM Plex Sans
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  mono:
    fontFamily: JetBrains Mono
    fontSize: "0.82rem"
    fontWeight: 500
rounded:
  sm: 6px
  md: 10px
spacing:
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 40px
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "oklch(98% 0.006 250)"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
  console-panel:
    backgroundColor: "{colors.graphite}"
    textColor: "oklch(95% 0.006 250)"
    rounded: "{rounded.md}"
---

## Overview

Loopaal should feel like a serious operations console, not a hackathon splash screen. The visual language is sparse, text-led, and workflow-native: large confident type, small mono labels, sharp rules, and console panels that show the product flow directly.

## Colors

The palette uses warm near-white paper, graphite console surfaces, restrained cobalt interaction color, and muted blue-grey text. Avoid bright gradients, candy colors, and invented proof badges.

## Typography

Use Space Grotesk for display and headings, IBM Plex Sans for readable product copy, and JetBrains Mono for worker names, statuses, and command-like details. Headings stay roman, never italic.

## Layout & Spacing

Prefer long editorial sections, dense workflow boards, and primitive grids over generic hero-feature-CTA templates. Keep generous vertical spacing, thin dividers, and clear one-column mobile collapse.

## Components

Buttons are flat and bordered. Console panels are real product previews, not fake browser chrome. Cards should describe actual Loopaal co-workers and actions; do not add fabricated metrics, logos, or testimonials.

## Do's and Don'ts

- Do show the operator → co-workers → memory → approval loop.
- Do keep provider/hackathon details out of primary product UI.
- Do keep sends approval-gated and privacy language visible.
- Do not claim real customer numbers, conversion lifts, or integrations that are not connected.
- Do not copy another site’s pixels or content; adapt only structural inspiration.
