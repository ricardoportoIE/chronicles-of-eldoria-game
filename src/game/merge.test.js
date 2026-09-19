import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "./config.js";
import { Enemy } from "./entities.js";

function createEnemy({ id, x = 480, y = 300, angle = 0, scale = 1 }) {
  const speed = 100;
  const enemy = new Enemy(id, speed);
  enemy.x = x;
  enemy.y = y;
  enemy.vx = Math.cos(angle) * speed;
  enemy.vy = Math.sin(angle) * speed;
  enemy.scale = scale;
  return enemy;
}

function createSeededRandom(seed = 0xe1d0) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

describe("fusão vetorial de inimigos", () => {
  it("resolve forças opostas sem parar ou gerar valores inválidos", () => {
    const rightward = createEnemy({ id: 1, angle: 0 });
    const leftward = createEnemy({ id: 2, angle: Math.PI });

    rightward.mergeWith(leftward, 100);

    expect(rightward.vx).toBeCloseTo(100);
    expect(rightward.vy).toBeCloseTo(0);
    expect(Math.hypot(rightward.vx, rightward.vy)).toBeCloseTo(100);
  });

  it("limita fusões sucessivas e restaura o tamanho ao reaparecer", () => {
    const enemy = createEnemy({ id: 1 });

    enemy.mergeWith(createEnemy({ id: 2 }), 100);
    expect(enemy.scale).toBe(2);
    enemy.mergeWith(createEnemy({ id: 3 }), 100);
    expect(enemy.scale).toBe(4);
    enemy.mergeWith(createEnemy({ id: 4, scale: 4 }), 100);
    expect(enemy.scale).toBe(GAME_CONFIG.enemy.maxScale);

    enemy.respawn(100);
    expect(enemy.scale).toBe(1);
  });

  it("considera apenas inimigos que já entraram na arena", () => {
    const enemy = createEnemy({ id: 1, x: -1 });
    expect(enemy.isInArena()).toBe(false);
    enemy.x = 0;
    expect(enemy.isInArena()).toBe(true);
    enemy.x = GAME_CONFIG.world.width + 1;
    expect(enemy.isInArena()).toBe(false);
  });

  it("preserva velocidade, escala e hitbox em 500 combinações", () => {
    const random = createSeededRandom();
    const scales = [1, 2, 4];

    for (let index = 0; index < 500; index += 1) {
      const first = createEnemy({
        id: index * 2,
        angle: random() * Math.PI * 2,
        scale: scales[Math.floor(random() * scales.length)],
      });
      const second = createEnemy({
        id: index * 2 + 1,
        angle: random() * Math.PI * 2,
        scale: scales[Math.floor(random() * scales.length)],
      });

      first.mergeWith(second, 100);

      expect(Number.isFinite(first.x)).toBe(true);
      expect(Number.isFinite(first.y)).toBe(true);
      expect(Number.isFinite(first.vx)).toBe(true);
      expect(Number.isFinite(first.vy)).toBe(true);
      expect(Math.hypot(first.vx, first.vy)).toBeCloseTo(100);
      expect(first.scale).toBeLessThanOrEqual(GAME_CONFIG.enemy.maxScale);

      const halfSpriteWidth = (GAME_CONFIG.enemy.width * first.scale) / 2;
      const halfSpriteHeight = (GAME_CONFIG.enemy.height * first.scale) / 2;
      for (const circle of first.hitCircles) {
        const centerDistance = Math.hypot(
          circle.x - first.x,
          circle.y - first.y,
        );
        expect(centerDistance + circle.radius).toBeLessThanOrEqual(
          halfSpriteWidth,
        );
        expect(circle.radius).toBeLessThanOrEqual(halfSpriteHeight);
      }
    }
  });
});
