import { ENEMY_SPEED } from "../config/gameConfig.js";

export class Enemy {
  constructor(scene, x, y) {
    this.scene = scene;
    this.alive = true;
    this.display = scene.add.rectangle(x, y, 18, 18, 0xff6464);
    scene.physics.add.existing(this.display);
    this.body = this.display.body;
    this.body.setCollideWorldBounds(true);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  update() {
    if (!this.alive) return;
    const p = this.scene.player.display;
    const dx = p.x - this.display.x;
    const dy = p.y - this.display.y;
    const len = Math.hypot(dx, dy) || 1;
    const vx = (dx / len) * ENEMY_SPEED;
    const vy = (dy / len) * ENEMY_SPEED;
    this.body.setVelocity(vx, vy);
  }

  kill() {
    if (!this.alive) return;
    this.alive = false;
    this.display.setFillStyle(0x555555);
    this.body.enable = false;
    this.scene.tweens.add({ targets: this.display, alpha: 0, duration: 180, onComplete: () => this.display.destroy() });
  }

  destroy() {
    try { this.display?.destroy(); } catch(_) {}
  }
}
