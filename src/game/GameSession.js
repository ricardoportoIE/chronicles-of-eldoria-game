import { GAME_CONFIG } from "./config.js";
import { clamp, getDifficulty, getHealAmount, getHitScore } from "./rules.js";

export class GameSession {
  constructor(config = GAME_CONFIG) {
    this.config = config;
    this.reset();
  }

  reset() {
    this.status = "ready";
    this.elapsed = 0;
    this.life = this.config.hero.maxLife;
    this.score = 0;
    this.combo = 0;
    this.lastHitAt = Number.NEGATIVE_INFINITY;
    this.lastShotAt = Number.NEGATIVE_INFINITY;
    this.invulnerableUntil = 0;
  }

  start() {
    this.reset();
    this.status = "playing";
  }

  update(deltaSeconds) {
    if (this.status !== "playing") return;

    const safeDelta = clamp(deltaSeconds, 0, 0.1);
    this.elapsed += safeDelta;
    this.score += safeDelta * this.config.scoring.survivalPerSecond;
    if (
      this.combo > 0 &&
      this.elapsed - this.lastHitAt > this.config.scoring.comboWindowSeconds
    ) {
      this.combo = 0;
    }
  }

  togglePause() {
    if (this.status === "playing") this.status = "paused";
    else if (this.status === "paused") this.status = "playing";
    return this.status;
  }

  canShoot() {
    return (
      this.status === "playing" &&
      this.elapsed - this.lastShotAt >= this.config.projectile.cooldownSeconds
    );
  }

  registerShot() {
    if (!this.canShoot()) return false;
    this.lastShotAt = this.elapsed;
    return true;
  }

  registerHit() {
    if (this.status !== "playing") return { heal: 0, points: 0 };

    this.combo =
      this.elapsed - this.lastHitAt <= this.config.scoring.comboWindowSeconds
        ? clamp(this.combo + 1, 1, this.config.scoring.maxCombo)
        : 1;
    this.lastHitAt = this.elapsed;

    const heal = getHealAmount(this.elapsed, this.config);
    const points = getHitScore(this.elapsed, this.combo, this.config);
    this.life = clamp(this.life + heal, 0, this.config.hero.maxLife);
    this.score += points;
    return { heal, points };
  }

  takeDamage() {
    if (
      this.status !== "playing" ||
      this.elapsed < this.invulnerableUntil
    ) {
      return 0;
    }

    const { damage } = getDifficulty(this.elapsed, this.config);
    this.life = clamp(this.life - damage, 0, this.config.hero.maxLife);
    this.combo = 0;
    this.invulnerableUntil =
      this.elapsed + this.config.hero.invulnerabilitySeconds;

    if (this.life === 0) this.status = "gameover";
    return damage;
  }

  getSnapshot() {
    return {
      status: this.status,
      elapsed: this.elapsed,
      life: this.life,
      score: Math.floor(this.score),
      combo: this.combo,
      canShoot: this.canShoot(),
      difficulty: getDifficulty(this.elapsed, this.config),
    };
  }
}
