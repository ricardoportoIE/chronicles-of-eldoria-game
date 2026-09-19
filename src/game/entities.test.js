import { afterEach, describe, expect, it, vi } from "vitest";
import { GAME_CONFIG } from "./config.js";
import { Enemy, Hero, Spark } from "./entities.js";

function createContext() {
  const gradient = { addColorStop: vi.fn() };
  return {
    drawImage: vi.fn(), createRadialGradient: vi.fn(() => gradient),
    beginPath: vi.fn(), arc: vi.fn(), fill: vi.fn(), save: vi.fn(),
    translate: vi.fn(), rotate: vi.fn(), restore: vi.fn(), fillRect: vi.fn(),
    gradient,
  };
}

afterEach(() => vi.restoreAllMocks());

describe("Hero", () => {
  it("move, limita a arena e escolhe todas as direções", () => {
    const hero = new Hero();
    hero.update(10, { x: 1, y: 0 });
    expect(hero.facing).toBe("right");
    expect(hero.x).toBe(GAME_CONFIG.world.width - GAME_CONFIG.hero.width / 2);
    hero.update(10, { x: -1, y: 0 });
    expect(hero.facing).toBe("left");
    hero.update(10, { x: 0, y: 1 });
    expect(hero.facing).toBe("down");
    hero.update(10, { x: 0, y: -1 });
    expect(hero.facing).toBe("up");
    hero.update(1, { x: 0, y: 0 });
    expect(hero.animationTime).toBe(0);
    expect(hero.hitCircle).toEqual({ x: hero.x, y: hero.y + 5, radius: 18 });
  });

  it("dispara em quatro direções e descarta projéteis fora da arena", () => {
    const hero = new Hero();
    for (const facing of ["down", "up", "left", "right"]) {
      hero.facing = facing;
      hero.shoot();
    }
    expect(hero.bullets.map(({ vx, vy }) => [vx, vy])).toEqual([
      [0, 570], [0, -570], [-570, 0], [570, 0],
    ]);
    hero.update(10, { x: 0, y: 0 });
    expect(hero.bullets).toHaveLength(0);
  });

  it("desenha sprite, animação e brilho dos projéteis", () => {
    const hero = new Hero();
    const context = createContext();
    const image = { naturalWidth: 300, naturalHeight: 400 };
    hero.facing = "left";
    hero.animationTime = 0.2;
    hero.bullets = [{ x: 1, y: 2, radius: 8 }];
    hero.draw(context, image);
    expect(context.drawImage).toHaveBeenCalled();
    expect(context.gradient.addColorStop).toHaveBeenCalledTimes(3);
  });

  it("pisca enquanto invulnerável", () => {
    vi.spyOn(performance, "now").mockReturnValue(0);
    const context = createContext();
    new Hero().draw(context, { naturalWidth: 300, naturalHeight: 400 }, true);
    expect(context.drawImage).not.toHaveBeenCalled();
  });

  it("desenha o quadro parado quando não há movimento", () => {
    const context = createContext();
    new Hero().draw(context, { naturalWidth: 300, naturalHeight: 400 });
    expect(context.drawImage.mock.calls[0][2]).toBe(0);
  });
});

describe("Enemy", () => {
  it.each([
    [0, [480, -60, 0, 100]],
    [1, [1020, 300, -100, 0]],
    [2, [480, 660, 0, -100]],
    [3, [-60, 300, 100, 0]],
  ])("nasce corretamente na borda %i", (edge, expected) => {
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(edge / 4 + 0.01)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.5);
    const enemy = new Enemy(1, 100);
    expect([enemy.x, enemy.y, enemy.vx, enemy.vy]).toEqual(expected);
  });

  it("mantém velocidade, reaparece fora da margem e trata vetor zero", () => {
    const enemy = new Enemy(1, 100);
    enemy.x = 400;
    enemy.y = 300;
    enemy.vx = 0;
    enemy.vy = 0;
    enemy.update(1, 120);
    expect(enemy.x).toBe(400);
    enemy.x = -100;
    const respawn = vi.spyOn(enemy, "respawn");
    enemy.update(0, 120);
    expect(respawn).toHaveBeenCalledWith(120);
    enemy.x = 0;
    enemy.y = 0;
    enemy.scale = 4;
    expect(enemy.isOutside()).toBe(false);
    enemy.y = GAME_CONFIG.world.height + 200;
    expect(enemy.isOutside()).toBe(true);
  });

  it("desenha a chama rotacionada e calcula hitbox com vetor zero", () => {
    const enemy = new Enemy(1, 100);
    const context = createContext();
    enemy.vx = 0;
    enemy.vy = 0;
    enemy.animationTime = 0.25;
    enemy.draw(context, { naturalWidth: 92, naturalHeight: 204 });
    expect(context.save).toHaveBeenCalled();
    expect(context.drawImage).toHaveBeenCalled();
    expect(enemy.hitCircles).toHaveLength(5);
  });

  it("mantém vetor finito ao fundir duas chamas imóveis", () => {
    const first = new Enemy(1, 100);
    const second = new Enemy(2, 100);
    first.vx = first.vy = second.vx = second.vy = 0;
    first.mergeWith(second, 100);
    expect(first.vx).toBe(0);
    expect(first.vy).toBe(0);
  });
});

describe("Spark", () => {
  it("anima, desacelera e desenha respeitando alpha", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const spark = new Spark(10, 20, "red");
    const context = createContext();
    spark.update(0.1);
    spark.draw(context);
    expect(spark.x).toBeGreaterThan(10);
    expect(context.fillStyle).toBe("red");
    expect(context.globalAlpha).toBe(1);
    spark.life = -1;
    spark.draw(context);
    expect(context.fillRect).toHaveBeenCalledTimes(2);
  });
});
