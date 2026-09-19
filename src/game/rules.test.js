import { describe, expect, it } from "vitest";
import { GameSession } from "./GameSession.js";
import {
  GAME_CONFIG,
  PORTRAIT_GAME_CONFIG,
  getGameConfigForViewport,
} from "./config.js";
import { Enemy } from "./entities.js";
import { getTouchVector } from "./InputController.js";
import {
  circleOverlapsAny,
  circlesOverlap,
  getDifficulty,
  getHealAmount,
  getHitScore,
  shapesOverlap,
} from "./rules.js";
import { readBestScore, saveBestScore } from "./storage.js";

describe("Eldoria progression", () => {
  it("selects a 9:16 arena and scales entities down on portrait mobile", () => {
    const mobileConfig = getGameConfigForViewport(390, 844);

    expect(mobileConfig).toBe(PORTRAIT_GAME_CONFIG);
    expect(mobileConfig.world).toEqual({ width: 540, height: 960 });
    expect(mobileConfig.hero.width).toBe(54);
    expect(mobileConfig.enemy.width).toBe(69);
    expect(mobileConfig.enemy.baseCount).toBe(4);
    expect(
      Math.max(...mobileConfig.enemy.hitboxOffsets.map(Math.abs)) +
        mobileConfig.enemy.hitboxRadius,
    ).toBeLessThanOrEqual(mobileConfig.enemy.width / 2);
    expect(mobileConfig.enemy.hitboxRadius).toBeLessThanOrEqual(
      mobileConfig.enemy.height / 2,
    );
  });

  it("preserves the landscape arena on desktop and landscape mobile", () => {
    expect(getGameConfigForViewport(1440, 1000)).toBe(GAME_CONFIG);
    expect(getGameConfigForViewport(844, 390)).toBe(GAME_CONFIG);
  });

  it("increases level, speed, enemy count and damage over time", () => {
    expect(getDifficulty(0)).toMatchObject({
      level: 1,
      enemyCount: 5,
      enemySpeed: 105,
      damage: 8,
    });
    expect(getDifficulty(60)).toMatchObject({
      level: 4,
      enemyCount: 8,
      enemySpeed: 138,
      damage: 12,
    });
  });

  it("caps healing, combo and speed at their configured values", () => {
    expect(getHealAmount(0)).toBe(6);
    expect(getHealAmount(9_000)).toBe(12);
    expect(getHitScore(0, 99)).toBe(800);
    expect(getDifficulty(9_000).enemySpeed).toBe(250);
  });
});

describe("touch controls", () => {
  it("ignores small movements inside the dead zone", () => {
    expect(getTouchVector(5, 5)).toEqual({
      x: 0,
      y: 0,
      knobX: 0,
      knobY: 0,
    });
  });

  it("produces an analogue direction and caps visual displacement", () => {
    const halfStrength = getTouchVector(20, 0);
    expect(halfStrength.x).toBeCloseTo(0.5);
    expect(halfStrength.y).toBe(0);

    const diagonal = getTouchVector(100, 100);
    expect(Math.hypot(diagonal.x, diagonal.y)).toBeCloseTo(1);
    expect(Math.hypot(diagonal.knobX, diagonal.knobY)).toBeCloseTo(32);
  });
});

describe("game session", () => {
  it("respects cooldown, pause and maximum delta", () => {
    const session = new GameSession();
    session.start();

    expect(session.registerShot()).toBe(true);
    expect(session.registerShot()).toBe(false);
    session.update(10);
    expect(session.elapsed).toBe(0.1);
    session.togglePause();
    session.update(0.1);
    expect(session.elapsed).toBe(0.1);
  });

  it("chains hits, heals the hero and ends when life reaches zero", () => {
    const session = new GameSession();
    session.start();
    session.life = 50;

    expect(session.registerHit()).toEqual({ heal: 6, points: 100 });
    expect(session.registerHit()).toEqual({ heal: 6, points: 200 });
    expect(session.life).toBe(62);
    expect(session.score).toBe(300);

    session.life = 8;
    expect(session.takeDamage()).toBe(8);
    expect(session.status).toBe("gameover");
  });

  it("ends a combo outside its window and ignores damage whilst invulnerable", () => {
    const session = new GameSession();
    session.start();
    session.registerHit();
    session.elapsed += session.config.scoring.comboWindowSeconds + 0.1;
    session.update(0);
    expect(session.combo).toBe(0);

    expect(session.takeDamage()).toBe(8);
    expect(session.takeDamage()).toBe(0);
    expect(session.life).toBe(92);
  });
});

describe("collisions and persistence", () => {
  it("detects circular overlap including at the boundary", () => {
    expect(
      circlesOverlap(
        { x: 0, y: 0, radius: 10 },
        { x: 20, y: 0, radius: 10 },
      ),
    ).toBe(true);
  });

  it("detects collision along a composite hitbox", () => {
    const hitbox = [-32, -16, 0, 16, 32].map((x) => ({
      x,
      y: 0,
      radius: 12,
    }));

    expect(circleOverlapsAny({ x: -40, y: 0, radius: 2 }, hitbox)).toBe(true);
    expect(circleOverlapsAny({ x: 0, y: 15, radius: 2 }, hitbox)).toBe(false);
  });

  it("keeps the enemy hitbox smaller than its sprite", () => {
    const halfHitboxWidth =
      Math.max(...GAME_CONFIG.enemy.hitboxOffsets.map(Math.abs)) +
      GAME_CONFIG.enemy.hitboxRadius;

    expect(halfHitboxWidth).toBeLessThanOrEqual(GAME_CONFIG.enemy.width / 2);
    expect(GAME_CONFIG.enemy.hitboxRadius).toBeLessThanOrEqual(
      GAME_CONFIG.enemy.height / 2,
    );
  });

  it("detects contact between composite hitboxes", () => {
    const firstShape = [{ x: 0, y: 0, radius: 12 }];
    const secondShape = [{ x: 20, y: 0, radius: 12 }];
    const distantShape = [{ x: 30, y: 0, radius: 12 }];

    expect(shapesOverlap(firstShape, secondShape)).toBe(true);
    expect(shapesOverlap(firstShape, distantShape)).toBe(false);
  });

  it("merges two flames in the direction of the resultant force", () => {
    const upward = new Enemy(1, 100);
    const rightward = new Enemy(2, 100);
    upward.x = 100;
    upward.y = 100;
    upward.vx = 0;
    upward.vy = -100;
    rightward.x = 100;
    rightward.y = 100;
    rightward.vx = 100;
    rightward.vy = 0;

    upward.mergeWith(rightward, 100);

    expect(upward.scale).toBe(2);
    expect(upward.vx).toBeCloseTo(Math.SQRT1_2 * 100);
    expect(upward.vy).toBeCloseTo(-Math.SQRT1_2 * 100);
  });

  it("doubles sprite and hitbox together without exceeding the artwork", () => {
    const enemy = new Enemy(1, 100);
    enemy.x = 0;
    enemy.y = 0;
    enemy.vx = 100;
    enemy.vy = 0;
    enemy.scale = 2;
    const halfHitboxWidth = Math.max(
      ...enemy.hitCircles.map((circle) => Math.abs(circle.x) + circle.radius),
    );

    expect(halfHitboxWidth).toBeLessThanOrEqual(
      (GAME_CONFIG.enemy.width * enemy.scale) / 2,
    );
    expect(enemy.hitCircles[0].radius).toBeLessThanOrEqual(
      (GAME_CONFIG.enemy.height * enemy.scale) / 2,
    );
  });

  it("retains only the highest score", () => {
    const values = new Map();
    const storage = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    };

    expect(saveBestScore(450, storage)).toBe(450);
    expect(saveBestScore(120, storage)).toBe(450);
    expect(readBestScore(storage)).toBe(450);
  });
});
