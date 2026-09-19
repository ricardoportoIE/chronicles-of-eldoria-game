function createGameConfig({ portrait = false } = {}) {
  const entityScale = portrait ? 0.75 : 1;

  return Object.freeze({
    mode: portrait ? "portrait" : "landscape",
    world: Object.freeze(
      portrait ? { width: 540, height: 960 } : { width: 960, height: 600 },
    ),
    hero: Object.freeze({
      maxLife: 100,
      speed: portrait ? 240 : 270,
      radius: 18 * entityScale,
      width: 72 * entityScale,
      height: 72 * entityScale,
      invulnerabilitySeconds: 0.7,
    }),
    projectile: Object.freeze({
      speed: portrait ? 500 : 570,
      radius: 8 * entityScale,
      cooldownSeconds: 0.55,
    }),
    enemy: Object.freeze({
      baseCount: portrait ? 4 : 5,
      maxCount: portrait ? 12 : 14,
      baseSpeed: portrait ? 95 : 105,
      maxSpeed: portrait ? 225 : 250,
      hitboxRadius: 12 * entityScale,
      hitboxOffsets: Object.freeze(
        [-32, -16, 0, 16, 32].map((offset) => offset * entityScale),
      ),
      width: 92 * entityScale,
      height: 34 * entityScale,
      maxScale: 4,
    }),
    progression: Object.freeze({
      levelEverySeconds: 20,
      enemyEveryLevels: 1,
      speedPerLevel: portrait ? 9 : 11,
      baseDamage: 8,
      damageEverySeconds: 30,
      damageStep: 2,
      baseHeal: 6,
      healEverySeconds: 45,
      maxHeal: 12,
    }),
    scoring: Object.freeze({
      baseHit: 100,
      survivalPerSecond: 8,
      comboWindowSeconds: 2.25,
      maxCombo: 8,
    }),
  });
}

export const GAME_CONFIG = createGameConfig();
export const PORTRAIT_GAME_CONFIG = createGameConfig({ portrait: true });

export function getGameConfigForViewport(width, height) {
  return width <= 760 && height > width
    ? PORTRAIT_GAME_CONFIG
    : GAME_CONFIG;
}
