import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CanvasGame } from "./CanvasGame.js";
import { Enemy } from "./entities.js";
import { GAME_CONFIG } from "./config.js";

function createContext() {
  return {
    clearRect: vi.fn(), save: vi.fn(), translate: vi.fn(), fillRect: vi.fn(),
    restore: vi.fn(), drawImage: vi.fn(), rotate: vi.fn(), beginPath: vi.fn(),
    arc: vi.fn(), fill: vi.fn(), createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  };
}

function createGame() {
  const context = createContext();
  const canvas = { width: 960, height: 600, getContext: vi.fn(() => context) };
  const assets = {
    arena: { naturalWidth: 1600, naturalHeight: 900 },
    hero: { naturalWidth: 300, naturalHeight: 400 },
    enemy: { naturalWidth: 92, naturalHeight: 204 },
  };
  const audio = { startTheme: vi.fn(), stopTheme: vi.fn(), play: vi.fn() };
  const input = { getMovement: vi.fn(() => ({ x: 0, y: 0 })), shooting: false };
  const callbacks = { onUpdate: vi.fn(), onGameOver: vi.fn(), onLevel: vi.fn() };
  const game = new CanvasGame({ canvas, assets, audio, input, ...callbacks });
  return { game, context, canvas, assets, audio, input, ...callbacks };
}

function positionEnemy(enemy, { x = 300, y = 300, vx = 100, vy = 0, scale = 1 } = {}) {
  Object.assign(enemy, { x, y, vx, vy, scale });
  return enemy;
}

beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", vi.fn(() => 81));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.spyOn(performance, "now").mockReturnValue(1000);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("CanvasGame", () => {
  it("inicia uma sessão limpa e agenda o primeiro quadro", () => {
    const { game, audio } = createGame();
    game.enemies = [{}];
    game.sparks = [{}];
    game.start();
    expect(cancelAnimationFrame).toHaveBeenCalled();
    expect(game.session.status).toBe("playing");
    expect(game.enemies).toHaveLength(GAME_CONFIG.enemy.baseCount);
    expect(audio.startTheme).toHaveBeenCalled();
    expect(requestAnimationFrame).toHaveBeenCalledWith(game.loop);
  });

  it("pausa, retoma, respeita força e ignora estados finais", () => {
    const { game, onUpdate } = createGame();
    expect(game.togglePause()).toBe("ready");
    game.session.start();
    expect(game.togglePause(true)).toBe("paused");
    expect(game.togglePause(true)).toBe("paused");
    expect(game.togglePause(false)).toBe("playing");
    expect(game.togglePause(false)).toBe("playing");
    expect(onUpdate).toHaveBeenCalledTimes(2);
  });

  it("executa loop jogando, pausado e encerra agenda no game over", () => {
    const { game, onUpdate } = createGame();
    game.session.start();
    const update = vi.spyOn(game, "update");
    const draw = vi.spyOn(game, "draw").mockImplementation(() => {});
    game.lastFrame = 0;
    game.loop(1000);
    expect(update).toHaveBeenCalledWith(0.1);
    expect(draw).toHaveBeenCalled();
    game.session.status = "paused";
    game.loop(1100);
    expect(update).toHaveBeenCalledTimes(1);
    game.session.status = "gameover";
    game.loop(1200);
    expect(onUpdate).toHaveBeenCalledTimes(3);
    expect(requestAnimationFrame).toHaveBeenCalledTimes(2);
  });

  it("move, dispara, progride nível, remove partículas expiradas", () => {
    const { game, input, audio, onLevel } = createGame();
    game.session.start();
    game.enemies = [];
    input.getMovement.mockReturnValue({ x: 1, y: 0 });
    input.shooting = true;
    game.session.elapsed = 19.99;
    game.sparks = [{ life: 0.01, update(delta) { this.life -= delta; } }];
    game.update(0.1);
    expect(game.hero.bullets).toHaveLength(1);
    expect(audio.play).toHaveBeenCalledWith("shoot");
    expect(onLevel).toHaveBeenCalledWith(2);
    expect(game.sparks).toHaveLength(0);
  });

  it("remove projétil e inimigo atingidos e cria faíscas", () => {
    const { game, audio } = createGame();
    game.session.start();
    const enemy = positionEnemy(new Enemy(1, 100), { x: 300, y: 300 });
    game.enemies = [enemy];
    game.hero.bullets = [
      { id: 1, x: 300, y: 300, radius: 8 },
      { id: 2, x: 700, y: 500, radius: 8 },
    ];
    game.resolveCollisions();
    expect(game.enemies).toHaveLength(0);
    expect(game.hero.bullets.map((bullet) => bullet.id)).toEqual([2]);
    expect(audio.play).toHaveBeenCalledWith("hit");
    expect(game.sparks).toHaveLength(12);
  });

  it("causa dano, respeita invulnerabilidade e encerra a partida", () => {
    const { game, audio, onGameOver } = createGame();
    game.session.start();
    game.hero.x = 300;
    game.hero.y = 300;
    const enemy = positionEnemy(new Enemy(1, 100), { x: 300, y: 305 });
    vi.spyOn(enemy, "respawn").mockImplementation(() => {});
    game.enemies = [enemy];
    game.resolveCollisions();
    expect(audio.play).toHaveBeenCalledWith("damage");
    expect(game.shake).toBe(10);
    expect(game.sparks).toHaveLength(16);
    game.resolveCollisions();
    expect(game.sparks).toHaveLength(16);

    game.session.invulnerableUntil = 0;
    game.session.life = 1;
    game.resolveCollisions();
    expect(game.session.status).toBe("gameover");
    expect(audio.stopTheme).toHaveBeenCalled();
    expect(audio.play).toHaveBeenCalledWith("gameover");
    expect(onGameOver).toHaveBeenCalled();
  });

  it("funde apenas pares válidos na arena e remove absorvidos", () => {
    const { game } = createGame();
    const outside = positionEnemy(new Enemy(1, 100), { x: -1, y: 300 });
    const first = positionEnemy(new Enemy(2, 100), { x: 300, y: 300 });
    const second = positionEnemy(new Enemy(3, 100), { x: 310, y: 300, vx: 0, vy: -100 });
    const far = positionEnemy(new Enemy(4, 100), { x: 700, y: 500 });
    game.enemies = [outside, first, second, far];
    game.resolveEnemyMerges(120);
    expect(game.enemies.map((enemy) => enemy.id)).toEqual([1, 2, 4]);
    expect(first.scale).toBe(2);
    expect(game.sparks).toHaveLength(20);
  });

  it("não altera lista quando não há fusões", () => {
    const { game } = createGame();
    game.enemies = [
      positionEnemy(new Enemy(1, 100), { x: 100, y: 100 }),
      positionEnemy(new Enemy(2, 100), { x: 800, y: 500 }),
    ];
    game.resolveEnemyMerges(100);
    expect(game.enemies).toHaveLength(2);
  });

  it("desenha com tremor, invulnerabilidade e ambos os recortes da arena", () => {
    const { game, context, canvas, assets } = createGame();
    game.session.start();
    game.shake = 0.21;
    game.enemies = [positionEnemy(new Enemy(1, 100))];
    game.sparks = [{ draw: vi.fn() }];
    game.session.invulnerableUntil = 10;
    game.draw();
    expect(context.translate).toHaveBeenCalled();
    expect(game.shake).toBe(0);
    expect(context.restore).toHaveBeenCalled();

    game.shake = 10;
    game.draw();
    expect(game.shake).toBeCloseTo(8.2);
    game.shake = 0;
    game.draw();

    context.drawImage.mockClear();
    assets.arena.naturalWidth = 600;
    assets.arena.naturalHeight = 1000;
    canvas.width = 960;
    canvas.height = 600;
    game.drawArenaBackground();
    expect(context.drawImage).toHaveBeenCalled();
  });

  it("encerra animação e áudio ao destruir", () => {
    const { game, audio } = createGame();
    game.frameRequest = 44;
    game.destroy();
    expect(cancelAnimationFrame).toHaveBeenCalledWith(44);
    expect(audio.stopTheme).toHaveBeenCalled();
  });
});
