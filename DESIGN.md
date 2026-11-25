---
name: Ordenfi
description: A composed workspace for wallet-confirmed stablecoin operations.
colors:
  background: "#111315"
  foreground: "#eeeef0"
  card: "#191c1f"
  muted: "#24282c"
  muted-foreground: "#a5adb4"
  border: "#353b40"
  primary: "#b9fa0a"
  primary-foreground: "#111609"
  secondary: "#252a2e"
  secondary-foreground: "#d7dce0"
  success: "#86c9ac"
  danger: "#ee9b98"
  info: "#97b8d6"
  inset: "#141719"
  field-border: "#69737c"
  surface-raised: "#202428"
  surface-hover: "#2a2f34"
  rule-soft: "#2c3136"
  ink-secondary: "#c2c8cd"
  accent-soft: "#28311b"
typography:
  display:
    fontFamily: "Host Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(28px, 3vw, 38px)"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Host Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 500
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Host Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Host Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
  data:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    letterSpacing: "0"
rounded:
  sm: "4px"
  control: "8px"
  xl: "12px"
  2xl: "16px"
  3xl: "20px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "44px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "44px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "44px"
  button-danger:
    backgroundColor: "color-mix(in oklab, #ee9b98 15%, transparent)"
    textColor: "{colors.danger}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "44px"
  input:
    backgroundColor: "{colors.inset}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "44px"
  nav-link:
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "44px"
  network-label:
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.sm}"
    padding: "4px 8px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.2xl}"
---
# Design System: Ordenfi

## Overview

**Creative North Star: "The Operator’s Ledger"**

The owner-supplied logo and dark graphite surfaces give Ordenfi the character of an operator’s ledger: precise, composed, and assured. Dark opaque surfaces frame amounts, routes, and approvals; lime green marks the action to take, while cool information colors explain system state.

Host Grotesk carries the interface and JetBrains Mono carries measured data. The reusable signature is a readable progression from request through review to wallet confirmation. Visual emphasis belongs to the operation and its amount.

**Key Characteristics:**

- Opaque graphite surfaces with restrained tonal separation.
- Lime green actions and visible keyboard focus.
- Readable amounts, named controls, and wallet-confirmed execution.

## Colors

The palette combines graphite neutrals, lime-green operator actions, and restrained cool system information. The frontmatter records the normative values extracted from `src/app/ordenfi-theme.css`; the accent alias shares the primary lime green. Warning amber is reserved for actual warning states.

### Primary

- **Logo Green** (`primary`): primary actions, focus outlines, selections, and assistant accents; pair with `primary-foreground` for text on lime green.

### Secondary

- **System Blue** (`info`): informational status and chart context, rather than competing calls to action.
- **Settlement Mint** (`success`): successful or reassuring system state.
- **Risk Rose** (`danger`): destructive actions and error states. Warnings use amber, distinct from the lime-green brand action.

### Neutral

- **Graphite Canvas** (`background`): the application ground.
- **Panel Graphite** (`card`) and **Inset Graphite** (`inset`): opaque container and field layers.
- **Raised Graphite** (`surface-raised`), **Hover Graphite** (`surface-hover`), and **Muted Graphite** (`muted`): state and surface separation.
- **Chalk Ink** (`foreground`), **Secondary Ink** (`ink-secondary`), and **Muted Ink** (`muted-foreground`): text hierarchy.
- **Structural Rule** (`border`), **Soft Rule** (`rule-soft`), and **Field Rule** (`field-border`): containers, quiet dividers, and visible input boundaries.
- **Secondary Surface / Ink** (`secondary`, `secondary-foreground`): neutral secondary controls; **Green Inset** (`accent-soft`) supports restrained accent context.

**The Action Rule.** Use lime green for primary actions and focus; use cool information and semantic status colors to explain state.

## Typography

**Display and Body Font:** Host Grotesk, followed by UI sans-serif and system fallbacks. The root loads weights 400, 500, and 600.

**Measured-data Font:** JetBrains Mono, followed by UI monospace and monospace fallbacks. The root loads weights 400 and 500. Code, preformatted text, keyboard labels, and mono utilities use tabular numerals with zero tracking.

The hierarchy is measured rather than theatrical. Page headings use medium weight and compact tracking; amounts are prominent without requiring an oversized marketing headline.

- **Display:** workspace heading; its fluid scale is in frontmatter, with an explicit mobile override of 30px below 768px.
- **Title:** trade toolbar heading. Shared card titles separately use 16px semibold text; assistant headings use 16px medium.
- **Body:** the 16px base uses a 1.55 line-height. Workspace supporting copy uses 14px.
- **Label:** desktop navigation uses 13px medium; small network and assurance text uses 12px. Mobile bottom navigation reaches 11px.
- **Amounts:** trade modules render input amounts at 36px with a 1.2 line-height, reduced to 32px on mobile. The amount input inherits the interface font unless its component explicitly opts into mono.

**The Measured Data Rule.** Use JetBrains Mono with tabular numerals for code, addresses, and measured data; keep navigation and prose in Host Grotesk.

## Layout

The home page at `/` introduces Ordenfi. The operating workspace is at `/app`, with `/dashboard` and `/welcome` available for existing links. The navbar inner container caps at 1360px. The workspace caps at 1280px with 24px gutters, reducing to 20px below 768px. The workspace begins 40px below navigation, reducing to 24px below 768px.

The account overview precedes a two-column grid of `minmax(0, 1.55fr)` and `minmax(0, 1fr)` with a 24px gap. The left area contains a clickable 144px action sidebar, a 16px gap, and the selected form; one assistant occupies the right. Swap opens by default. The outer layout stacks below 1024px with actions first, then assistant; below 768px the action sidebar becomes a compact horizontal selector. Vertical tabs use Up/Down keys; compact tabs use Left/Right. Activity spans the full width below both. Hiding the assistant preserves its draft and gives focus to the restore button. Panels retain `min-width: 0`.

The named spacing rhythm is 4, 8, 16, 24, and 32px. Shared card sections use 20px padding; trade sections use 24px desktop padding and 16–20px at narrower widths. The desktop assistant is sticky at 104px, between 520px and 680px tall according to viewport space; it becomes a static 560px surface below 1024px.

Desktop navigation yields to a fixed bottom navigation below 1024px. Its footer clearance includes 100px plus the safe-area inset. The top bar is 80px tall, becoming 72px below 768px. Mobile form controls retain a minimum 16px text size and 44px height; mobile bottom links have a 60px minimum height below 768px.

## Elevation & Depth

Depth comes from opaque tonal layers and single-pixel borders. Shared cards and compatibility classes formerly named glass are deliberately flat, with no box shadow. The theme defines one popover shadow token (`--shadow-popover: 0 16px 48px #080a0b66`); the current navbar panels use opaque card fills and borders without applying that shadow. Treat the token as available overlay vocabulary, not a mandatory resting surface effect.

**The Tonal Depth Rule.** Resting workspace surfaces use opaque fills and fine borders, without decorative glow or glass effects.

## Shapes

Controls generally use restrained 8px corners; small network labels use 4px corners. Nested modules use 12px corners, while cards, trading panels, assistant panels, and popovers use 16px corners. The theme also exposes 20px corners. Use one-pixel structural rules to clarify grouping rather than adding floating decoration. Header wallet controls explicitly use 12px corners.

## Components

### Buttons

Shared buttons are compact and assured: 14px medium text, an 8px gap, 8px corners, and a 44px minimum height. Default padding is 8px vertically and 16px horizontally. Small buttons keep a 44px target and use 12px text; large buttons use a 48px minimum height and 24px horizontal padding. Icon buttons are 44px square.

Primary buttons use lime green with dark ink and a lime-green border. Secondary buttons use neutral secondary fill and border. Ghost controls use muted ink, while outline controls retain a transparent fill and structural border. Danger controls use rose text, 15% rose fill, and a 30% rose border. Hover changes fill and/or ink; the shared primary hover uses 90% accent opacity. Disabled buttons block pointer events and use 45% opacity.

Shared buttons expose a 2px lime green focus outline offset by 4px, a 150ms color transition, and a one-pixel active translation. Reduced-motion preferences disable transitions and the active translation.

### Cards / Containers

Cards use opaque card fill, foreground ink, a one-pixel border, 16px corners, and no resting shadow. Shared card headers and content use 20px padding; content omits top padding and headers reduce bottom padding to 12px. Trade cards have their own toolbar and assurance divider. Keep those transaction-specific structures attached to their workflow.

### Inputs / Fields

Shared inputs use inset fill, a field-rule border, 8px corners, 16px text, 16px horizontal padding, and a 44px height. Placeholder text uses muted ink; disabled inputs use 50% opacity and a not-allowed cursor. The focus outline is 2px lime green with a 2px offset. Mobile controls enforce 44px minimum height and at least 16px text.

Swap amount modules use inset fill, 12px corners, 20px inset padding on larger screens and 16px below 768px, and an accent border on focus within. Amount inputs retain a visible field-rule bottom border. Assistant textareas use card fill, field-rule borders, 8px corners, and an 80px minimum height.

### Navigation

Desktop links pair small line icons with medium labels, muted ink at rest, muted fill on hover, and raised fill plus foreground ink for the current page. Current pages are indicated with `aria-current="page"`. The mobile navigation uses stacked icons and labels; the current route has a restrained lime green tint, lime green text, and a fine lime green ring.

The wallet disclosure uses an opaque bordered panel, exposes expanded state, closes on Escape or outside interaction, and restores focus to the trigger. Wallet identity uses a monospace address. Desktop and mobile app navigation link to Workspace and Analytics.

### Network Label

A quiet, noninteractive status label uses secondary ink, a structural border, 4px corners, 12px text, and 4px by 8px padding. Keep the network name visible rather than communicating network state through a dot alone.

### Assistant Disclosure

The assistant is an opaque bordered companion to the operation. Hide and restore controls retain explicit accessible names and expanded state; focus moves to the corresponding control after toggling. Preserve the operation’s visual priority when the assistant is open.

## Do's and Don'ts

### Do:

- **Do** use the semantic theme tokens and existing shared controls.
- **Do** preserve visible lime green focus, accessible names, and readable amount hierarchy.
- **Do** keep review and wallet confirmation legible in transaction flows.
- **Do** respect reduced motion and safe-area space around fixed mobile navigation.

### Don't:

- **Don’t** introduce neon glows, decorative gradients, or translucent glass surfaces.
- **Don’t** use color alone to communicate network or transaction state.
- **Don’t** replace measured-data typography with a decorative display face.
- **Don’t** invent financial metrics, testimonials, or commercial claims.

Source record: extracted from the current theme, root font configuration, shared controls, navigation, and trading workspace. This document records source behavior; it does not certify rendered accessibility, wallet-connected states, or production screenshot validation.

The supplied logo is retained intact at `public/brand/ordenfi-logo-original.jpg`. Header and app-icon PNGs are resized from that source; the SVG compatibility assets embed the same source pixels. Run `node scripts/sync-ordenfi-brand.cjs` to regenerate them.
