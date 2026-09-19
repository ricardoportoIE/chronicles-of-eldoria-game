import { GAME_CONFIG } from "./config.js";
import { clamp } from "./rules.js";

const DIRECTION_ROWS = Object.freeze({ down: 0, right: 1, up: 2, left: 3 });

export class Hero {
  constructor(config = GAME_CONFIG) {
    this.config = config;
    this.reset();
  }

  reset() {
    this.x = this.config.world.width / 2;
    this.y = this.config.world.height / 2;
    this.facing = "down";
    this.animationTime = 0;
    this.bullets = [];
    this.nextBulletId = 0;
  }

  update(delta, movement) {
    this.x = clamp(
      this.x + movement.x * this.config.hero.speed * delta,
      this.config.hero.width / 2,
      this.config.world.width - this.config.hero.width / 2,
    );
    this.y = clamp(
      this.y + movement.y * this.config.hero.speed * delta,
      this.config.hero.height / 2,
      this.config.world.height - this.config.hero.height / 2,
    );

    if (movement.x || movement.y) {
      if (Math.abs(movement.x) > Math.abs(movement.y)) {
        this.facing = movement.x > 0 ? "right" : "left";
      } else {
        this.facing = movement.y > 0 ? "down" : "up";
      }
      this.animationTime += delta;
    } else {
      this.animationTime = 0;
    }

    this.bullets.forEach((bullet) => {
      bullet.x += bullet.vx * delta;
      bullet.y += bullet.vy * delta;
    });
    this.bullets = this.bullets.filter(
      (bullet) =>
        bullet.x > -bullet.radius &&
        bullet.x < this.config.world.width + bullet.radius &&
        bullet.y > -bullet.radius &&
        bullet.y < this.config.world.height + bullet.radius,
    );
  }

  shoot() {
    const directions = {
      down: [0, 1],
      up: [0, -1],
      left: [-1, 0],
      right: [1, 0],
    };
    const [directionX, directionY] = directions[this.facing];
    this.bullets.push({
      id: ++this.nextBulletId,
      x: this.x + directionX * 24,
      y: this.y + directionY * 24,
      vx: directionX * this.config.projectile.speed,
      vy: directionY * this.config.projectile.speed,
      radius: this.config.projectile.radius,
    });
  }

  draw(context, image, invulnerable = false) {
    if (invulnerable && Math.floor(performance.now() / 80) % 2 === 0) return;
    const columns = 3;
    const rows = 4;
    const cellWidth = image.naturalWidth / columns;
    const cellHeight = image.naturalHeight / rows;
    const frame = this.animationTime ? Math.floor(this.animationTime * 9) % columns : 0;
    const row = DIRECTION_ROWS[this.facing];

    context.drawImage(
      image,
      frame * cellWidth,
      row * cellHeight,
      cellWidth,
      cellHeight,
      this.x - this.config.hero.width / 2,
      this.y - this.config.hero.height / 2,
      this.config.hero.width,
      this.config.hero.height,
    );

    for (const bullet of this.bullets) {
      const glow = context.createRadialGradient(
        bullet.x,
        bullet.y,
        1,
        bullet.x,
        bullet.y,
        bullet.radius * 2.4,
      );
      glow.addColorStop(0, "#fff9b0");
      glow.addColorStop(0.35, "#75e6ff");
      glow.addColorStop(1, "rgba(42, 111, 255, 0)");
      context.fillStyle = glow;
      context.beginPath();
      context.arc(bullet.x, bullet.y, bullet.radius * 2.4, 0, Math.PI * 2);
      context.fill();
    }
  }

  get hitCircle() {
    return { x: this.x, y: this.y + 5, radius: this.config.hero.radius };
  }
}

export class Enemy {
  constructor(id, speed, config = GAME_CONFIG) {
    this.id = id;
    this.config = config;
    this.animationTime = Math.random();
    this.respawn(speed);
  }

  respawn(speed) {
    const edge = Math.floor(Math.random() * 4);
    const margin = 60;
    const horizontalPosition = margin + Math.random() * (this.config.world.width - margin * 2);
    const verticalPosition = margin + Math.random() * (this.config.world.height - margin * 2);
    this.speed = speed;

    if (edge === 0) {
      [this.x, this.y, this.vx, this.vy] = [horizontalPosition, -margin, 0, speed];
    } else if (edge === 1) {
      [this.x, this.y, this.vx, this.vy] = [
        this.config.world.width + margin,
        verticalPosition,
        -speed,
        0,
      ];
    } else if (edge === 2) {
      [this.x, this.y, this.vx, this.vy] = [
        horizontalPosition,
        this.config.world.height + margin,
        0,
        -speed,
      ];
    } else {
      [this.x, this.y, this.vx, this.vy] = [-margin, verticalPosition, speed, 0];
    }
  }

  update(delta, speed) {
    const magnitude = Math.hypot(this.vx, this.vy) || 1;
    this.vx = (this.vx / magnitude) * speed;
    this.vy = (this.vy / magnitude) * speed;
    this.x += this.vx * delta;
    this.y += this.vy * delta;
    this.animationTime += delta;

    if (this.isOutside()) this.respawn(speed);
  }

  isOutside() {
    const margin = 90;
    return (
      this.x < -margin ||
      this.x > this.config.world.width + margin ||
      this.y < -margin ||
      this.y > this.config.world.height + margin
    );
  }

  draw(context, image) {
    const frames = 6;
    const cellWidth = image.naturalWidth;
    const cellHeight = image.naturalHeight / frames;
    const frame = Math.floor(this.animationTime * 12) % frames;
    const angle = Math.atan2(this.vy, this.vx);

    context.save();
    context.translate(this.x, this.y);
    context.rotate(angle);
    context.drawImage(
      image,
      0,
      frame * cellHeight,
      cellWidth,
      cellHeight,
      -this.config.enemy.width / 2,
      -this.config.enemy.height / 2,
      this.config.enemy.width,
      this.config.enemy.height,
    );
    context.restore();
  }

  get hitCircle() {
    return { x: this.x, y: this.y, radius: this.config.enemy.radius };
  }
}

export class Spark {
  constructor(x, y, color) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 45 + Math.random() * 150;
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = 0.35 + Math.random() * 0.35;
    this.maxLife = this.life;
    this.color = color;
  }

  update(delta) {
    this.life -= delta;
    this.x += this.vx * delta;
    this.y += this.vy * delta;
    this.vx *= 0.96;
    this.vy *= 0.96;
  }

  draw(context) {
    context.globalAlpha = Math.max(0, this.life / this.maxLife);
    context.fillStyle = this.color;
    context.fillRect(this.x, this.y, 3, 3);
    context.globalAlpha = 1;
  }
}
