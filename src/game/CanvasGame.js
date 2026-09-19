import { GAME_CONFIG } from "./config.js";
import { GameSession } from "./GameSession.js";
import { circleOverlapsAny, shapesOverlap } from "./rules.js";
import { Enemy, Hero, Spark } from "./entities.js";

export class CanvasGame {
  constructor({
    canvas,
    assets,
    audio,
    input,
    config = GAME_CONFIG,
    onUpdate,
    onGameOver,
    onLevel,
  }) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.assets = assets;
    this.audio = audio;
    this.input = input;
    this.onUpdate = onUpdate;
    this.onGameOver = onGameOver;
    this.onLevel = onLevel;
    this.config = config;
    this.session = new GameSession(config);
    this.hero = new Hero(config);
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
    this.resolveEnemyMerges(snapshot.difficulty.enemySpeed);
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
      this.enemies.push(new Enemy(++this.nextEnemyId, enemySpeed, this.config));
    }
  }

  resolveCollisions() {
    const removedBullets = new Set();
    const hitEnemies = new Set();

    for (const bullet of this.hero.bullets) {
      const enemy = this.enemies.find(
        (candidate) =>
          !hitEnemies.has(candidate.id) &&
          circleOverlapsAny(bullet, candidate.hitCircles),
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
      if (!circleOverlapsAny(this.hero.hitCircle, enemy.hitCircles)) continue;
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

  resolveEnemyMerges(speed) {
    const absorbedEnemies = new Set();

    for (let firstIndex = 0; firstIndex < this.enemies.length; firstIndex += 1) {
      const firstEnemy = this.enemies[firstIndex];
      if (absorbedEnemies.has(firstEnemy.id) || !firstEnemy.isInArena()) continue;

      for (
        let secondIndex = firstIndex + 1;
        secondIndex < this.enemies.length;
        secondIndex += 1
      ) {
        const secondEnemy = this.enemies[secondIndex];
        if (
          absorbedEnemies.has(secondEnemy.id) ||
          !secondEnemy.isInArena() ||
          !shapesOverlap(firstEnemy.hitCircles, secondEnemy.hitCircles)
        ) {
          continue;
        }

        const mergeX = (firstEnemy.x + secondEnemy.x) / 2;
        const mergeY = (firstEnemy.y + secondEnemy.y) / 2;
        firstEnemy.mergeWith(secondEnemy, speed);
        absorbedEnemies.add(secondEnemy.id);
        this.createSparks(mergeX, mergeY, "#ffbd59", 20);
        break;
      }
    }

    if (absorbedEnemies.size > 0) {
      this.enemies = this.enemies.filter(
        (enemy) => !absorbedEnemies.has(enemy.id),
      );
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

    this.drawArenaBackground();
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

  drawArenaBackground() {
    const { context, canvas } = this;
    const image = this.assets.arena;
    const imageRatio = image.naturalWidth / image.naturalHeight;
    const canvasRatio = canvas.width / canvas.height;
    let sourceWidth = image.naturalWidth;
    let sourceHeight = image.naturalHeight;

    if (imageRatio > canvasRatio) {
      sourceWidth = image.naturalHeight * canvasRatio;
    } else {
      sourceHeight = image.naturalWidth / canvasRatio;
    }

    const sourceX = (image.naturalWidth - sourceWidth) / 2;
    const sourceY = (image.naturalHeight - sourceHeight) / 2;
    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      canvas.width,
      canvas.height,
    );
  }
}
