# Mobile study and wireframe — 9:16 format

## Assessment

The original game was responsive only at presentation level: its canvas remained a `960 × 600` landscape arena. On a portrait phone, this resulted in an arena that was too shallow, distorted or cropped. Touch controls also competed with the session for screen space.

The adaptation therefore changes the real world geometry, not merely the CSS presentation.

## Solution

- Desktop and landscape mobile devices retain the `960 × 600` arena.
- Portrait phones use a native `540 × 960` (`9:16`) arena.
- Mobile entities render at `75%` scale, preserving more room for evasive movement.
- Initial enemy speed and count are slightly reduced to compensate for the narrower world.
- The HUD becomes a compact strip over the arena.
- Directional and fire controls sit at the lower edges with generous touch targets.
- The complete game fits within `100dvh`, respecting dynamic mobile browser bars.

## Wireframe

```text
┌─────────────────────────────┐
│  CHRONICLES    sound  screen│  44 px
├─────────────────────────────┤
│ LIFE ██████ 100   CHAP. I   │
│ SCORE 000120     00:15      │  overlaid HUD
├─────────────────────────────┤
│                             │
│       flame    ●            │
│                             │
│             ◇ hero          │  540 × 960 arena
│                             │
│   ▲                         │
│ ◀ ▼ ▶               ( LIGHT )│  touch controls
└─────────────────────────────┘
             9:16 ratio
```

## Proposed scale

| Element | Desktop | Portrait mobile |
| --- | ---: | ---: |
| World | 960 × 600 | 540 × 960 |
| Hero | 72 × 72 | 54 × 54 |
| Flame | 92 × 34 | 69 × 25.5 |
| Projectile | radius 8 | radius 6 |
| Initial enemies | 5 | 4 |

## Acceptance criteria

- No element requires scrolling in a common mobile viewport.
- The internal and displayed canvas retain a `9:16` ratio without stretching sprites.
- Controls remain reachable with both thumbs.
- The HUD, introduction, pause and game-over views remain legible in portrait orientation.
- Rules, merges and hitboxes remain proportional and contained within their sprites.
- The desktop experience has no regression.
