# Chronicles of Eldoria

> A modern, responsive 2D survival game built with vanilla JavaScript, Canvas 2D and Three.js — backed by measurable standards for testing, accessibility, performance and front-end security.

Chronicles of Eldoria places the player in the role of the realm's final guardian. Fire sentinels have surrounded the kingdom, and survival depends on evasion, precision and the use of arcane light to turn hostile energy into life.

This project began as an academic JavaScript exercise for the Technology in Internet Systems course at IFSul Pelotas. It has since been comprehensively modernised as a portfolio project, whilst preserving the original story, visual identity and gameplay premise.

## Modernisation and skills demonstrated

Chronicles of Eldoria demonstrates much more than a browser game. It is a compact example of production-minded front-end engineering:

- Modular, framework-free JavaScript using ES Modules and clearly separated responsibilities.
- A frame-rate-independent game loop with bounded delta time.
- Vector-based movement, collision geometry and enemy-merging behaviour.
- Responsive desktop and native `9:16` mobile layouts.
- Keyboard, pointer, touch joystick and on-screen control support.
- Automated accessibility checks against WCAG A/AA rules.
- A strict 100% coverage threshold across the game core.
- Automated performance budgets for desktop and mobile viewports.
- Content Security Policy, safe external links and dependency auditing.
- Resilient asset, audio and local-storage handling.

For recruiters and engineering teams, the project showcases practical skills in software design, browser APIs, real-time rendering, interaction design, test automation, responsive development, accessibility, performance profiling and client-side security.

## Gameplay and technical features

- Normalised movement through `WASD`, arrow keys, touch controls or direct dragging on the arena.
- Arcane-light projectiles triggered by the space bar or the mobile action button.
- Progressive chapters that increase enemy count, movement speed and damage.
- Vector-based enemy fusion: colliding sentinels grow, scale their hitboxes with their artwork and move in the direction of the resulting force.
- Carefully constrained sprite-aligned hitboxes for reliable and fair collisions.
- Health recovery, survival scoring, combo multipliers and a persistent local high score.
- Pause, restart, full-screen and sound controls without blocking browser dialogues.
- A compact mobile HUD that preserves gameplay visibility on small screens.
- Particle effects, screen shake, sprite animation and responsive Canvas rendering.
- A lazily loaded Three.js realm mark, including reduced-motion support.

## Controls and navigation

| Action | Desktop | Touch device |
| --- | --- | --- |
| Move | `WASD` or arrow keys | Drag anywhere on the arena or use the directional pad |
| Fire | Space bar | **Light** action button |
| Pause or resume | `P`, `Esc` or the pause button | Pause button |
| Restart | Pause or game-over panel | Pause or game-over panel |
| Full screen | Header control | Header control, when supported by the browser |
| Sound | Header control | Header control |

The interface supports keyboard-only navigation, visible focus states, semantic landmarks, accessible names, live status announcements and deliberate focus management when pausing, resuming or restarting a session. Long-press context menus are suppressed only on game controls, preventing accidental interruption without compromising the rest of the page.

## Device compatibility

The game selects its layout and internal world configuration according to the viewport:

| Environment | Layout | Input options | Validation |
| --- | --- | --- | --- |
| Desktop and laptop | Landscape `960 × 600` arena | Keyboard, mouse and pointer | Chromium E2E at `1440 × 1000` |
| Mobile portrait | Native `9:16`, `540 × 960` arena | Direct touch joystick, directional pad and action button | Chromium E2E at `390 × 844` |
| Mobile landscape and tablets | Responsive landscape layout | Touch, pointer and keyboard where available | Viewport selection covered by unit tests |

The responsive implementation avoids horizontal and vertical page scrolling during play, keeps sprites proportional and maintains collision geometry within the visible artwork.

## Quality engineering

Quality is enforced through one local command:

```bash
npm run test:quality
```

The quality gate currently includes:

| Area | Automated verification |
| --- | --- |
| Unit and component behaviour | 59 Vitest tests |
| Game-core coverage | 100% statements, branches, functions and lines |
| End-to-end journeys | Playwright Core in a real Chromium browser |
| Accessibility | axe-core checks for WCAG 2 A/AA, 2.1 A/AA and 2.2 AA |
| Controls | Keyboard, focus, pause, shooting, touch pad, direct joystick and pointer cancellation |
| Performance | 120-frame production measurements on desktop and mobile |
| Security | CSP assertions, unsafe-API checks, external-request monitoring and `npm audit` |
| Release readiness | Vite production build |

The latest local production baseline completed at approximately **144 fps** in both automated viewport profiles, with an average frame time of **6.94 ms**. Loading completed in **1.22 s on desktop** and **0.74 s on mobile**. These figures are environment-dependent; the committed performance budgets are the repeatable acceptance criteria.

The full testing strategy and performance thresholds are documented in [QUALIDADE.md](./QUALIDADE.md).

## Modernisation highlights

The original implementation was progressively refactored rather than replaced, retaining its narrative whilst improving its engineering foundations:

1. Extracted gameplay rules, state, entities, input, audio, assets and persistence into focused modules.
2. Reworked collision detection around composite, sprite-aligned hitboxes.
3. Added vector-resultant enemy fusion with proportional sprite and hitbox scaling.
4. Introduced a purpose-built portrait world and responsive `9:16` interface.
5. Added direct touch movement alongside the existing keyboard and on-screen controls.
6. Established comprehensive unit, browser, accessibility, performance and security testing.
7. Added a restrictive browser security policy and a single repeatable quality gate.

The staged development plan is available in [PLANO_DE_TRABALHO.md](./PLANO_DE_TRABALHO.md), and the mobile design study is recorded in [CROQUI_MOBILE.md](./CROQUI_MOBILE.md).

## Architecture

```text
src/
├── main.js                 UI orchestration and browser integration
├── realmMark.js            lazily loaded Three.js enhancement
└── game/
    ├── CanvasGame.js       game loop, collisions and Canvas rendering
    ├── GameSession.js      session state and lifecycle
    ├── entities.js         hero, enemies, projectiles and particles
    ├── InputController.js  keyboard, virtual controls and touch input
    ├── AudioManager.js     music and sound effects
    ├── AssetLoader.js      image loading and progress reporting
    ├── rules.js            pure, independently testable game rules
    ├── config.js           centralised balancing and viewport profiles
    └── storage.js          defensive local high-score persistence
```

The `requestAnimationFrame` loop uses a capped time delta to keep the simulation stable across different refresh rates and after tab interruptions. Gameplay does not advance while paused. Pure rules remain independent of the Canvas and DOM, whilst browser-facing behaviour is verified end to end.

## Technology stack

- JavaScript and ES Modules
- HTML5 Canvas 2D
- Three.js
- CSS responsive design
- Vite
- Vitest and V8 coverage
- Playwright Core
- axe-core
- npm audit

## Run locally

### Requirements

- Node.js `20.19` or newer
- npm
- Microsoft Edge, Google Chrome or another Chromium executable for browser tests

```bash
git clone https://github.com/ricard00liveira/lpaw_2024_game.git
cd lpaw_2024_game
npm install
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`.

## Available commands

```bash
npm run dev              # Start the development server
npm test                 # Run the Vitest suite
npm run test:coverage    # Run tests and enforce 100% game-core coverage
npm run test:e2e         # Test desktop, mobile, controls and accessibility
npm run test:performance # Build and validate performance budgets
npm run test:security    # Run static security checks and npm audit
npm run test:quality     # Run the complete local quality gate
npm run build            # Create the production build
npm run preview          # Preview the production build locally
```

The browser tests automatically look for Edge or Chrome in their standard Windows locations. On another system, set `ELDORIA_BROWSER` to the absolute path of a Chromium-compatible executable.

## Author

**Ricardo Porto de Oliveira** — Technology in Internet Systems, IFSul Câmpus Pelotas

Original game and assets created as an academic project in 2024. The modernised edition remains faithful to the original narrative whilst demonstrating current front-end engineering practices.
