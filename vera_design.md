# Vera · Design System

## Concept
Vera is an AI companion app for self-awareness, emotional processing, and personal growth.
A friend you tell what's on your mind — who remembers, notices patterns, and helps you grow.

## Visual identity
Inspired by Monument Valley — quiet, architectural, atmospheric.
No card borders. Elements float on the dark background.
Thin geometric lines and diamonds as structural dividers, not boxes.
Generous negative space. Emptiness is intentional.
Everything feels like a place, not a form.

---

## Colour palette

| Variable         | Hex       | Usage                                      |
|------------------|-----------|--------------------------------------------|
| --base           | #101820   | App background — deep teal-black           |
| --surface        | #182430   | Vera bubble background                     |
| --surface-2      | #1E2E3C   | User bubble background                     |
| --amber          | #E8A030   | Primary accent — active states, CTAs, Vera |
| --teal           | #4A8888   | Secondary accent — calm signals            |
| --text           | #D8C8A8   | Primary text — warm sand                   |
| --text-muted     | #6A8898   | Secondary labels, Vera label               |
| --text-dim       | #7A9AAA   | Dates, separators, placeholders            |
| --border         | #1E3040   | Subtle borders and lines                   |
| --nav-bg         | #0C1420   | Bottom navigation bar background           |
| --div-line       | #4A6880   | Section divider lines                      |
| --div-label      | #B8D4E0   | Section divider label text                 |
| --inactive       | #6A8898   | Inactive nav icons and labels              |

CSS variables must be declared in :root in index.html and used consistently throughout.
Never hardcode colours outside of SVG stroke/fill attributes.

---

## Typography

Three fonts, three distinct roles. Import from Google Fonts:
https://fonts.googleapis.com/css2?family=Cinzel:wght@300;400&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Jost:wght@300;400;500

| Font                | Role                                                      |
|---------------------|-----------------------------------------------------------|
| Cinzel 300-400      | App name, nav labels, section dividers, period labels     |
| Cormorant Garamond  | All of Vera's spoken text — always 300 italic             |
| Jost 300-500        | User input, body text, UI labels, timestamps              |

### Sizing scale
- App name header: Cinzel 15px, tracking 0.38em, uppercase
- Section divider label: Cinzel 12px, tracking 0.22em, uppercase
- Nav label: Cinzel 11px, tracking 0.16em, uppercase
- Period/tag labels: Cinzel 10px, tracking 0.22em, uppercase
- Vera voice large: Cormorant Garamond italic 19-22px
- Vera voice small: Cormorant Garamond italic 15-17px
- Body text: Jost 300, 15-16px, tracking 0.02em
- Timestamps / meta: Cinzel or Jost, 9-11px

---

## Layout

- Max content width: 390px, centered on desktop
- Background fills 100vw on desktop but content stays 390px
- Use 100dvh not 100vh
- Header: fixed, 56px height, z-index 10
- Bottom nav: fixed, z-index 10, padding-bottom: env(safe-area-inset-bottom, 0px)
- Scrollable content: padding-top 72px, padding-bottom 110px
- Side padding: 24px

---

## Header

Single horizontal row, 56px height, same on all tabs.
Left: app name "vera" in Cinzel 15px, tracking 0.38em, uppercase, color --text
Right: date string + small MV ornament (two lines flanking a diamond)

MV ornament:
- Two lines: width 12px, height 0.5px, background --amber, opacity 0.35
- Diamond: 4x4px, border 0.5px solid --amber, rotated 45deg, opacity 0.35

Header uses mask-image gradient to fade bottom edge:
-webkit-mask-image: linear-gradient(to bottom, black 80%, transparent 100%)

---

## Bottom navigation

Four tabs in order: Share · Remember · Intend · Grow

Bar specs:
- Background: --nav-bg
- Border top: 0.5px solid --border
- Padding: 12px top, 28px bottom plus safe area
- Items: flex row, space-around

Each nav item:
- Icon: 24x24px SVG inline
- Label: Cinzel 11px, tracking 0.16em, uppercase
- Gap between icon and label: 6px
- Active: --amber (#E8A030)
- Inactive: --inactive (#6A8898)

### SVG Icons (copy exactly — stroke-linecap square throughout)

Share (double archway with keystone diamond):
<svg width="24" height="24" viewBox="0 0 64 64" fill="none">
  <path d="M16 52 L16 30 Q16 16 32 16 Q48 16 48 30 L48 52" stroke="COLOR" stroke-width="2.5" fill="none" stroke-linecap="square"/>
  <path d="M22 52 L22 32 Q22 22 32 22 Q42 22 42 32 L42 52" stroke="COLOR" stroke-width="1.8" fill="none" stroke-linecap="square" opacity="0.5"/>
  <line x1="10" y1="52" x2="54" y2="52" stroke="COLOR" stroke-width="2.5" stroke-linecap="square"/>
  <rect x="29" y="11" width="6" height="6" transform="rotate(45 32 14)" stroke="COLOR" stroke-width="2" fill="none"/>
</svg>

Intend (concentric rotated squares with centre dot):
<svg width="24" height="24" viewBox="0 0 64 64" fill="none">
  <rect x="8" y="8" width="48" height="48" transform="rotate(45 32 32)" stroke="COLOR" stroke-width="2.5" fill="none" stroke-linecap="square"/>
  <rect x="16" y="16" width="32" height="32" transform="rotate(45 32 32)" stroke="COLOR" stroke-width="2" fill="none" stroke-linecap="square" opacity="0.65"/>
  <rect x="22" y="22" width="20" height="20" transform="rotate(45 32 32)" stroke="COLOR" stroke-width="1.8" fill="none" stroke-linecap="square" opacity="0.4"/>
  <circle cx="32" cy="32" r="3" fill="COLOR"/>
</svg>

Remember (geometric hourglass):
<svg width="24" height="24" viewBox="0 0 64 64" fill="none">
  <line x1="14" y1="9" x2="50" y2="9" stroke="COLOR" stroke-width="2.5" stroke-linecap="square"/>
  <line x1="14" y1="55" x2="50" y2="55" stroke="COLOR" stroke-width="2.5" stroke-linecap="square"/>
  <line x1="14" y1="9" x2="32" y2="32" stroke="COLOR" stroke-width="2.5" stroke-linecap="square"/>
  <line x1="50" y1="9" x2="32" y2="32" stroke="COLOR" stroke-width="2.5" stroke-linecap="square"/>
  <line x1="32" y1="32" x2="14" y2="55" stroke="COLOR" stroke-width="2.5" stroke-linecap="square"/>
  <line x1="32" y1="32" x2="50" y2="55" stroke="COLOR" stroke-width="2.5" stroke-linecap="square"/>
  <circle cx="32" cy="32" r="2.5" fill="COLOR"/>
  <line x1="22" y1="46" x2="42" y2="46" stroke="COLOR" stroke-width="1.5" stroke-linecap="square" opacity="0.4"/>
</svg>

Grow (ascending staircase with depth lines):
<svg width="24" height="24" viewBox="0 0 64 64" fill="none">
  <polyline points="8,52 8,44 18,44 18,36 28,36 28,28 38,28 38,20 48,20 48,12 56,12" stroke="COLOR" stroke-width="2.5" fill="none" stroke-linecap="square" stroke-linejoin="miter"/>
  <line x1="8" y1="52" x2="56" y2="52" stroke="COLOR" stroke-width="1.8" opacity="0.3" stroke-linecap="square"/>
  <line x1="18" y1="44" x2="18" y2="52" stroke="COLOR" stroke-width="1.8" opacity="0.3" stroke-linecap="square"/>
  <line x1="28" y1="36" x2="28" y2="52" stroke="COLOR" stroke-width="1.8" opacity="0.3" stroke-linecap="square"/>
  <line x1="38" y1="28" x2="38" y2="52" stroke="COLOR" stroke-width="1.8" opacity="0.3" stroke-linecap="square"/>
  <line x1="48" y1="20" x2="48" y2="52" stroke="COLOR" stroke-width="1.8" opacity="0.3" stroke-linecap="square"/>
  <line x1="56" y1="12" x2="56" y2="52" stroke="COLOR" stroke-width="1.8" opacity="0.3" stroke-linecap="square"/>
</svg>

Replace COLOR with #E8A030 for active, #6A8898 for inactive.

---

## Section dividers (MV style)

Standard divider:
- Flex row, gap 12px, margin 44px top 26px bottom
- Line: flex 1, height 1px, background #4A6880
- Diamond: 7x7px, border 1px solid #B8D4E0, rotated 45deg
- Label: Cinzel 12px, tracking 0.22em, uppercase, color #B8D4E0

Amber divider (entry viewer):
- Same but line rgba(232,160,48,0.5), diamond and label #E8A030

Sub-divider (no label):
- Flex row, gap 10px, margin 36px top 22px bottom
- Line: flex 1, height 0.5px, background --border
- Diamond: 4x4px, border 0.5px solid --text-dim, rotated 45deg

---

## Atmospheric glow

Two radial gradient overlays, fixed, pointer-events none, z-index 0.
One warm amber toned, one cool teal toned. Opacity 0.05-0.08. Never distracting.

---

## Design rules

1. No card borders. No box shadows. Elements float on the dark background.
2. All buttons: icon-only or text-only, never mixed.
3. Send button: upward arrow SVG, amber background, 36x36px, border-radius 8px.
4. Touch targets minimum 44x44px.
5. Font size minimum 16px inside inputs.
6. All scrollbars hidden on all browsers.
7. Safe area via env(safe-area-inset-bottom) on nav.
8. No emojis in UI chrome — only in mood selection dots.
9. No Lorem Ipsum — realistic placeholder content in Vera's voice.
10. stroke-linecap: square on all SVG icons — never round or butt.
