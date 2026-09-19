const SOUND_SOURCES = Object.freeze({
  theme: "/sounds/theme.mp3",
  shoot: "/sounds/shoot.mp3",
  hit: "/sounds/collect_life.mp3",
  damage: "/sounds/colide_cut.mp3",
  gameover: "/sounds/gameover.mp3",
});

export class AudioManager {
  constructor() {
    this.muted = false;
    this.sounds = Object.fromEntries(
      Object.entries(SOUND_SOURCES).map(([name, source]) => {
        const audio = new Audio(source);
        audio.preload = "auto";
        return [name, audio];
      }),
    );
    this.sounds.theme.loop = true;
    this.sounds.theme.volume = 0.16;
  }

  play(name, { restart = true } = {}) {
    if (this.muted) return;
    const sound = this.sounds[name];
    if (!sound) return;
    if (restart) sound.currentTime = 0;
    sound.play().catch(() => {});
  }

  startTheme() {
    this.play("theme", { restart: false });
  }

  stopTheme() {
    this.sounds.theme.pause();
    this.sounds.theme.currentTime = 0;
  }

  toggleMuted(forceValue) {
    this.muted =
      typeof forceValue === "boolean" ? forceValue : !this.muted;
    Object.values(this.sounds).forEach((sound) => {
      sound.muted = this.muted;
    });
    return this.muted;
  }
}
