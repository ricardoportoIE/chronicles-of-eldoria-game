# Modernisation work plan — Chronicles of Eldoria

## Objective

Transform the original prototype into a compact, polished demonstration of modern JavaScript, Canvas 2D and Three.js whilst preserving its narrative: the guardian of Eldoria endures an escalating firestorm and converts struck projectiles into life energy.

## Initial assessment

- The project compiled, but relied on an outdated Vite release with known vulnerabilities.
- Several files contained corrupted text encoding.
- Timekeeping, difficulty, animation and cooldowns used independent timers, causing inconsistent behaviour when the tab lost focus.
- State was global and game over relied on `confirm()`, making restart, pause and testing difficult.
- The canvas and controls targeted only an `800 × 600` desktop layout.
- No automated tests covered game rules.
- Presentation relied on a CDN-hosted animation library where native browser animation was sufficient.

## Stages and acceptance criteria

### 1. Audit and roadmap — completed

- Record existing behaviour, risks and scope.
- Create an isolated working branch without changing the remote repository.
- Confirm that the original project installs and builds.

### 2. Technical foundation — completed

- Update vulnerable dependencies.
- Separate pure rules, configuration and persistence from rendering.
- Use one time-delta-based game loop.
- Add automated tests for progression, damage, healing and scoring.

### 3. Gameplay — completed

- Correct diagonal movement and map boundaries.
- Add scoring, combos and a local high score.
- Balance enemy speed, count, damage and shot cooldown progression.
- Support pausing, restarting and ending a session without blocking dialogues.
- Add vector-based enemy fusion and sprite-aligned composite hitboxes.

### 4. Experience and presentation — completed

- Preserve the medieval identity and original visual assets.
- Integrate introduction, pause and game-over states into the interface.
- Add a responsive layout, a native `9:16` world and touch controls.
- Provide sound controls, visible focus, readable text and reduced-motion support.
- Present the entire game in British English.

### 5. Quality and documentation — completed

- Run tests, dependency auditing and production builds.
- Test the primary journey in desktop and mobile browser viewports.
- Enforce 100% coverage across the game core.
- Add automated accessibility, performance and front-end security checks.
- Document architecture, commands, controls and technical decisions.

### 6. Continuous integration and publication — completed

- Reproduce the complete local quality gate in GitHub Actions.
- Retain coverage reports and production builds as workflow artefacts.
- Publish the approved modernised history to its dedicated portfolio repository.

## Out of scope

- Back-end services, user accounts and online leaderboards.
- Replacement of the original narrative or author-created assets.
- Monetisation or distribution through an application store.
