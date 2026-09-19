import { afterEach, describe, expect, it, vi } from "vitest";
import { loadGameAssets } from "./AssetLoader.js";
import { AudioManager } from "./AudioManager.js";
import { GameSession } from "./GameSession.js";
import { readBestScore, saveBestScore } from "./storage.js";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("carregamento de recursos", () => {
  it("carrega todas as imagens e reporta progresso", async () => {
    class FakeImage extends EventTarget {
      set src(value) {
        this.source = value;
        queueMicrotask(() => this.dispatchEvent(new Event("load")));
      }
    }
    vi.stubGlobal("Image", FakeImage);
    const progress = vi.fn();
    const assets = await loadGameAssets(progress);
    expect(Object.keys(assets)).toEqual(["arena", "menu", "hero", "enemy"]);
    expect(progress).toHaveBeenCalledTimes(4);
    expect(progress).toHaveBeenLastCalledWith(1);
  });

  it("usa callback de progresso padrão", async () => {
    class FakeImage extends EventTarget {
      set src(value) {
        queueMicrotask(() => this.dispatchEvent(new Event("load")));
      }
    }
    vi.stubGlobal("Image", FakeImage);
    await expect(loadGameAssets()).resolves.toHaveProperty("hero");
  });

  it("propaga falha de imagem", async () => {
    class BrokenImage extends EventTarget {
      set src(value) {
        queueMicrotask(() => this.dispatchEvent(new Event("error")));
      }
    }
    vi.stubGlobal("Image", BrokenImage);
    await expect(loadGameAssets()).rejects.toThrow("Não foi possível carregar");
  });
});

describe("áudio", () => {
  it("prepara, toca, reinicia, pausa e silencia todos os sons", async () => {
    const instances = [];
    class FakeAudio {
      constructor(source) {
        this.source = source;
        this.currentTime = 4;
        this.play = vi.fn(() => Promise.resolve());
        this.pause = vi.fn();
        instances.push(this);
      }
    }
    vi.stubGlobal("Audio", FakeAudio);
    const audio = new AudioManager();
    expect(instances).toHaveLength(5);
    expect(audio.sounds.theme.loop).toBe(true);
    expect(audio.sounds.theme.volume).toBe(0.16);

    audio.play("shoot");
    expect(audio.sounds.shoot.currentTime).toBe(0);
    audio.startTheme();
    expect(audio.sounds.theme.currentTime).toBe(4);
    audio.play("inexistente");
    expect(audio.toggleMuted()).toBe(true);
    audio.play("hit");
    expect(audio.sounds.hit.play).not.toHaveBeenCalled();
    expect(audio.toggleMuted(false)).toBe(false);
    expect(instances.every((sound) => sound.muted === false)).toBe(true);
    audio.stopTheme();
    expect(audio.sounds.theme.pause).toHaveBeenCalled();
    expect(audio.sounds.theme.currentTime).toBe(0);
  });

  it("não interrompe o jogo quando o navegador recusa reprodução", async () => {
    class RejectedAudio {
      constructor() {
        this.play = vi.fn(() => Promise.reject(new Error("bloqueado")));
        this.pause = vi.fn();
      }
    }
    vi.stubGlobal("Audio", RejectedAudio);
    const audio = new AudioManager();
    expect(() => audio.play("damage", { restart: false })).not.toThrow();
    await Promise.resolve();
  });
});

describe("sessão e armazenamento defensivos", () => {
  it("cobre estados inativos, retomada, snapshot e limites", () => {
    const session = new GameSession();
    expect(session.registerHit()).toEqual({ heal: 0, points: 0 });
    expect(session.takeDamage()).toBe(0);
    expect(session.togglePause()).toBe("ready");
    session.start();
    session.update(-1);
    expect(session.elapsed).toBe(0);
    expect(session.togglePause()).toBe("paused");
    expect(session.togglePause()).toBe("playing");
    session.life = 99;
    session.registerHit();
    expect(session.life).toBe(100);
    expect(session.getSnapshot()).toMatchObject({ status: "playing", life: 100 });
  });

  it("retorna zero e continua quando storage falha ou contém lixo", () => {
    const broken = {
      getItem: () => { throw new Error("bloqueado"); },
      setItem: () => { throw new Error("bloqueado"); },
    };
    expect(readBestScore(broken)).toBe(0);
    expect(saveBestScore(-20, broken)).toBe(0);
    expect(saveBestScore("inválido", broken)).toBe(0);
    expect(readBestScore({ getItem: () => "-2" })).toBe(0);
    expect(readBestScore({ getItem: () => "12" })).toBe(12);
  });
});
