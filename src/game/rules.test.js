import { describe, expect, it } from "vitest";
import { GameSession } from "./GameSession.js";
import {
  circlesOverlap,
  getDifficulty,
  getHealAmount,
  getHitScore,
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
