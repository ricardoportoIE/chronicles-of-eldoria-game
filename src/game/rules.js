import { GAME_CONFIG } from "./config.js";

export function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function getDifficulty(elapsedSeconds, config = GAME_CONFIG) {
  const elapsed = Math.max(0, elapsedSeconds);
  const level = 1 + Math.floor(elapsed / config.progression.levelEverySeconds);
  const enemyCount = clamp(
    config.enemy.baseCount +
      Math.floor((level - 1) / config.progression.enemyEveryLevels),
    config.enemy.baseCount,
    config.enemy.maxCount,
  );
  const enemySpeed = clamp(
    config.enemy.baseSpeed + (level - 1) * config.progression.speedPerLevel,
    config.enemy.baseSpeed,
    config.enemy.maxSpeed,
  );
  const damage =
    config.progression.baseDamage +
    Math.floor(elapsed / config.progression.damageEverySeconds) *
      config.progression.damageStep;

  return { level, enemyCount, enemySpeed, damage };
}

export function getHealAmount(elapsedSeconds, config = GAME_CONFIG) {
  const bonus = Math.floor(
    Math.max(0, elapsedSeconds) / config.progression.healEverySeconds,
  );
  return clamp(
    config.progression.baseHeal + bonus,
    config.progression.baseHeal,
    config.progression.maxHeal,
  );
}

export function getHitScore(elapsedSeconds, combo, config = GAME_CONFIG) {
  const timeBonus = Math.floor(Math.max(0, elapsedSeconds) / 10) * 10;
  const multiplier = clamp(combo, 1, config.scoring.maxCombo);
  return (config.scoring.baseHit + timeBonus) * multiplier;
}

export function circlesOverlap(first, second) {
  const distanceX = first.x - second.x;
  const distanceY = first.y - second.y;
  const radius = first.radius + second.radius;
  return distanceX * distanceX + distanceY * distanceY <= radius * radius;
}
