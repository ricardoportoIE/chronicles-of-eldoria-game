import { describe, expect, it } from "vitest";
import { GameSession } from "./GameSession.js";
import { GAME_CONFIG } from "./config.js";
import { Enemy } from "./entities.js";
import {
  circleOverlapsAny,
  circlesOverlap,
  getDifficulty,
  getHealAmount,
  getHitScore,
  shapesOverlap,
} from "./rules.js";
import { readBestScore, saveBestScore } from "./storage.js";

describe("progressão de Eldoria", () => {
  it("aumenta o nível, a velocidade, os inimigos e o dano com o tempo", () => {
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

  it("limita cura, combo e velocidade aos valores de configuração", () => {
    expect(getHealAmount(0)).toBe(6);
    expect(getHealAmount(9_000)).toBe(12);
    expect(getHitScore(0, 99)).toBe(800);
    expect(getDifficulty(9_000).enemySpeed).toBe(250);
  });
});

describe("sessão de jogo", () => {
  it("respeita recarga, pausa e delta máximo", () => {
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

  it("encadeia acertos, cura o herói e encerra ao zerar a vida", () => {
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

  it("encerra o combo fora da janela e ignora dano durante a invulnerabilidade", () => {
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

describe("colisões e persistência", () => {
  it("detecta sobreposição circular inclusive no limite", () => {
    expect(
      circlesOverlap(
        { x: 0, y: 0, radius: 10 },
        { x: 20, y: 0, radius: 10 },
      ),
    ).toBe(true);
  });

  it("detecta colisão ao longo de uma hitbox composta", () => {
    const hitbox = [-32, -16, 0, 16, 32].map((x) => ({
      x,
      y: 0,
      radius: 12,
    }));

    expect(circleOverlapsAny({ x: -40, y: 0, radius: 2 }, hitbox)).toBe(true);
    expect(circleOverlapsAny({ x: 0, y: 15, radius: 2 }, hitbox)).toBe(false);
  });

  it("mantém a hitbox inimiga menor que o sprite", () => {
    const halfHitboxWidth =
      Math.max(...GAME_CONFIG.enemy.hitboxOffsets.map(Math.abs)) +
      GAME_CONFIG.enemy.hitboxRadius;

    expect(halfHitboxWidth).toBeLessThanOrEqual(GAME_CONFIG.enemy.width / 2);
    expect(GAME_CONFIG.enemy.hitboxRadius).toBeLessThanOrEqual(
      GAME_CONFIG.enemy.height / 2,
    );
  });

  it("detecta encontro entre hitboxes compostas", () => {
    const firstShape = [{ x: 0, y: 0, radius: 12 }];
    const secondShape = [{ x: 20, y: 0, radius: 12 }];
    const distantShape = [{ x: 30, y: 0, radius: 12 }];

    expect(shapesOverlap(firstShape, secondShape)).toBe(true);
    expect(shapesOverlap(firstShape, distantShape)).toBe(false);
  });

  it("funde duas chamas na direção da força resultante", () => {
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

  it("dobra sprite e hitbox juntos sem ultrapassar a arte", () => {
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

  it("mantém somente o maior recorde", () => {
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
