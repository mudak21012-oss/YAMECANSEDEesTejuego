import {
  PLAYER_BASE_SPEED, PLAYER_DASH_SPEED, PLAYER_DASH_TIME,
  PLAYER_IFRAME_TIME, PLAYER_MAX_HEALTH_HALVES,
  SHIELD_DURATION, SHIELD_COOLDOWN, SPECIAL_RADIUS, SPECIAL_COOLDOWN
} from "../config/gameConfig.js";

export class Player {
  /**
   * Jugador como círculo con cuerpo de Arcade Physics.
   * Gestiona movimiento, dash, escudo, ataque especial y vida/puntaje.
   */
  constructor(scene, x, y) {
    this.scene = scene;
    this.display = scene.add.circle(x, y, 14, 0x78dce8);
    scene.physics.add.existing(this.display);
    this.body = this.display.body;
    this.body.setCircle(14);
    this.body.setCollideWorldBounds(true);

    this.speed = PLAYER_BASE_SPEED;
    this.isDashing = false;
    this.dashUntil = 0;
    this.invUntil = 0;

    this.shieldActive = false;
    this.shieldUntil = 0;
    this.shieldReadyAt = 0;
    this.shieldAura = scene.add.circle(x, y, 26, 0x99ff99, 0.25).setVisible(false);

    this.specialReadyAt = 0;

    this.cursors = scene.input.keyboard.createCursorKeys();
    this.keys = scene.input.keyboard.addKeys("W,A,S,D,SPACE");

    this._onPointerDown = (pointer) => {
      if (pointer.button === 0) this.tryShield();
      if (pointer.button === 2) this.trySpecial();
    };
    scene.input.on("pointerdown", this._onPointerDown);

    this.healthHalves = PLAYER_MAX_HEALTH_HALVES;
    this.score = 0;
    this.emitHUD();

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  destroy() {
    try { this.scene.input.off("pointerdown", this._onPointerDown); } catch(_) {}
    try { this.shieldAura?.destroy(); } catch(_) {}
    try { this.display?.destroy(); } catch(_) {}
  }

  emitHUD() {
    this.scene.events.emit("hud:update", {
      healthHalves: this.healthHalves,
      maxHalves: PLAYER_MAX_HEALTH_HALVES,
      score: this.score,
      shieldCD: Math.max(0, this.shieldReadyAt - this.scene.time.now),
      specialCD: Math.max(0, this.specialReadyAt - this.scene.time.now),
    });
  }

  addScore(n) {
    this.score += n;
    this.emitHUD();
  }

  hit(damageHalves = 1) {
    if (this.scene.time.now < this.invUntil) return; // iframes
    if (this.shieldActive) return; // escudo evita daño
    this.healthHalves = Math.max(0, this.healthHalves - damageHalves);
    this.invUntil = this.scene.time.now + PLAYER_IFRAME_TIME;
    this.addScore(-20);
    if (this.healthHalves <= 0) {
      this.scene.onPlayerDeath();
    } else {
      this.emitHUD();
    }
  }

  tryShield() {
    const now = this.scene.time.now;
    if (now < this.shieldReadyAt) return;
    this.shieldActive = true;
    this.shieldUntil = now + SHIELD_DURATION;
    this.shieldReadyAt = now + SHIELD_COOLDOWN;
    this.shieldAura.setVisible(true);
    this.emitHUD();
  }

  trySpecial() {
    const now = this.scene.time.now;
    if (now < this.specialReadyAt) return;
    this.specialReadyAt = now + SPECIAL_COOLDOWN;

    const ring = this.scene.add.circle(this.display.x, this.display.y, 8, 0xffffff, 0.15);
    this.scene.tweens.add({
      targets: ring, radius: SPECIAL_RADIUS, alpha: 0, duration: 200,
      onComplete: () => ring.destroy()
    });

    this.scene.killEnemiesInRadius(this.display.x, this.display.y, SPECIAL_RADIUS);
    if (typeof this.scene.damageBossInRadius === 'function') {
      this.scene.damageBossInRadius(this.display.x, this.display.y, SPECIAL_RADIUS);
    }
    this.emitHUD();
  }

  tryDash() {
    const now = this.scene.time.now;
    if (this.isDashing) return;
    this.isDashing = true;
    this.dashUntil = now + PLAYER_DASH_TIME;
    this.speed = PLAYER_DASH_SPEED;

    // Efecto visual leve
    const trail = this.scene.add.circle(this.display.x, this.display.y, 18, 0x78dce8, 0.15);
    this.scene.tweens.add({
      targets: trail, alpha: 0, duration: 200,
      onComplete: () => trail.destroy()
    });
  }

  update(delta) {
    // Posición aura/FX
    this.shieldAura.setPosition(this.display.x, this.display.y);

    // Input movimiento
    const k = this.keys;
    const cur = this.cursors;
    const left = k.A.isDown || cur.left.isDown;
    const right = k.D.isDown || cur.right.isDown;
    const up = k.W.isDown || cur.up.isDown;
    const down = k.S.isDown || cur.down.isDown;

    let vx = 0, vy = 0;
    if (left) vx -= 1;
    if (right) vx += 1;
    if (up) vy -= 1;
    if (down) vy += 1;
    const len = Math.hypot(vx, vy) || 1;
    vx = (vx / len) * this.speed;
    vy = (vy / len) * this.speed;

    // Dash (Space)
    if (Phaser.Input.Keyboard.JustDown(k.SPACE)) {
      this.tryDash();
    }

    // Estado dash termina
    if (this.isDashing && this.scene.time.now >= this.dashUntil) {
      this.isDashing = false;
      this.speed = PLAYER_BASE_SPEED;
    }

    // Estado escudo
    if (this.shieldActive && this.scene.time.now >= this.shieldUntil) {
      this.shieldActive = false;
      this.shieldAura.setVisible(false);
    }

    this.body.setVelocity(vx, vy);
  }
}
