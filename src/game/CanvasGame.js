import { GAME_CONFIG } from "./config.js";
import { GameSession } from "./GameSession.js";
import { circlesOverlap } from "./rules.js";
import { Enemy, Hero, Spark } from "./entities.js";

export class CanvasGame {
  constructor({ canvas, assets, audio, input, onUpdate, onGameOver, onLevel }) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.assets = assets;
    this.audio = audio;
    this.input = input;
    this.onUpdate = onUpdate;
    this.onGameOver = onGameOver;
    this.onLevel = onLevel;
    this.session = new GameSession();
    this.hero = new Hero();
    this.enemies = [];
    this.sparks = [];
    this.nextEnemyId = 0;
    this.lastLevel = 1;
    this.lastFrame = 0;
    this.frameRequest = 0;
    this.shake = 0;
    this.loop = this.loop.bind(this);
  }

  start() {
    cancelAnimationFrame(this.frameRequest);
    this.session.start();
    this.hero.reset();
    this.enemies = [];
    this.sparks = [];
    this.nextEnemyId = 0;
    this.lastLevel = 1;
    this.lastFrame = performance.now();
    this.audio.startTheme();
    this.syncEnemies();
    this.frameRequest = requestAnimationFrame(this.loop);
  }

  togglePause(forcePause) {
    if (!['playing', 'paused'].includes(this.session.status)) return this.session.status;
    if (
      (forcePause === true && this.session.status === "paused") ||
      (forcePause === false && this.session.status === "playing")
    ) {
      return this.session.status;
    }
    const status = this.session.togglePause();
    this.lastFrame = performance.now();
    this.onUpdate(this.session.getSnapshot());
    return status;
  }

  loop(timestamp) {
    const delta = Math.min((timestamp - this.lastFrame) / 1000, 0.1);
    this.lastFrame = timestamp;

    if (this.session.status === "playing") this.update(delta);
    this.draw();
    this.onUpdate(this.session.getSnapshot());

    if (this.session.status !== "gameover") {
      this.frameRequest = requestAnimationFrame(this.loop);
    }
  }

  update(delta) {
    this.session.update(delta);
    const snapshot = this.session.getSnapshot();
    const movement = this.input.getMovement();
    this.hero.update(delta, movement);

    if (this.input.shooting && this.session.registerShot()) {
      this.hero.shoot();
      this.audio.play("shoot");
    }

    this.syncEnemies();
    this.enemies.forEach((enemy) =>
      enemy.update(delta, snapshot.difficulty.enemySpeed),
    );
    this.resolveCollisions();
    this.sparks.forEach((spark) => spark.update(delta));
    this.sparks = this.sparks.filter((spark) => spark.life > 0);

    if (snapshot.difficulty.level !== this.lastLevel) {
      this.lastLevel = snapshot.difficulty.level;
      this.onLevel(this.lastLevel);
    }
  }

  syncEnemies() {
    const { enemyCount, enemySpeed } = this.session.getSnapshot().difficulty;
    while (this.enemies.length < enemyCount) {
      this.enemies.push(new Enemy(++this.nextEnemyId, enemySpeed));
    }
  }

  resolveCollisions() {
    const removedBullets = new Set();
    const hitEnemies = new Set();

    for (const bullet of this.hero.bullets) {
      const enemy = this.enemies.find(
        (candidate) =>
          !hitEnemies.has(candidate.id) &&
          circlesOverlap(bullet, candidate.hitCircle),
      );
      if (!enemy) continue;

      removedBullets.add(bullet.id);
      hitEnemies.add(enemy.id);
      this.session.registerHit();
      this.audio.play("hit");
      this.createSparks(enemy.x, enemy.y, "#7de8ff", 12);
    }

    this.hero.bullets = this.hero.bullets.filter(
      (bullet) => !removedBullets.has(bullet.id),
    );
    this.enemies = this.enemies.filter((enemy) => !hitEnemies.has(enemy.id));

    for (const enemy of this.enemies) {
      if (!circlesOverlap(this.hero.hitCircle, enemy.hitCircle)) continue;
      const damage = this.session.takeDamage();
      enemy.respawn(this.session.getSnapshot().difficulty.enemySpeed);
      if (damage > 0) {
        this.audio.play("damage");
        this.shake = 10;
        this.createSparks(this.hero.x, this.hero.y, "#ff7a42", 16);
      }
      if (this.session.status === "gameover") {
        this.audio.stopTheme();
        this.audio.play("gameover");
        this.onGameOver(this.session.getSnapshot());
        break;
      }
    }
  }

  createSparks(x, y, color, amount) {
    for (let index = 0; index < amount; index += 1) {
      this.sparks.push(new Spark(x, y, color));
    }
  }

  draw() {
    const { context, canvas } = this;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.save();

    if (this.shake > 0) {
      context.translate(
        (Math.random() - 0.5) * this.shake,
        (Math.random() - 0.5) * this.shake,
      );
      this.shake *= 0.82;
      if (this.shake < 0.2) this.shake = 0;
    }

    context.drawImage(this.assets.arena, 0, 0, canvas.width, canvas.height);
    context.fillStyle = "rgba(4, 8, 17, 0.16)";
    context.fillRect(0, 0, canvas.width, canvas.height);

    this.enemies.forEach((enemy) => enemy.draw(context, this.assets.enemy));
    const invulnerable =
      this.session.elapsed < this.session.invulnerableUntil;
    this.hero.draw(context, this.assets.hero, invulnerable);
    this.sparks.forEach((spark) => spark.draw(context));
    context.restore();
  }

  destroy() {
    cancelAnimationFrame(this.frameRequest);
    this.audio.stopTheme();
  }
}
