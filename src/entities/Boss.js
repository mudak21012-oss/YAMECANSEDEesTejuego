import { BOSS_MAX_HP, BOSS_SPEED } from '../config/gameConfig.js';

// Spec-compliant simple rectangle Boss wrapper (no Phaser.Sprite inheritance)
export class Boss {
  constructor(scene, x, y){
    this.scene = scene;
    this.maxHp = BOSS_MAX_HP;
    this.hp = this.maxHp;
    this.alive = true;
    this.display = scene.add.rectangle(x, y, 48, 48, 0xffc04d);
    scene.physics.add.existing(this.display);
    this.body = this.display.body;
    this.body.setCollideWorldBounds(true);
    this.lastHitAt = 0;
    this.emitHp();
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, ()=> this.destroy());
  }

  emitHp(){ this.scene.events.emit('boss:hp', { hp: this.hp, max: this.maxHp }); }

  takeDamage(amount){
    if (!this.alive) return;
    const now = this.scene.time.now;
    if (now - this.lastHitAt < 120) return; // impact cooldown
    this.lastHitAt = now;
    const prev = this.hp;
    this.hp = Math.max(0, this.hp - amount);
    this.emitHp();
    this.scene.onBossDamaged(prev, this.hp);
    if (this.hp <= 0) this.kill();
  }

  update(){
    if (!this.alive) return;
    const p = this.scene.player.display;
    const dx = p.x - this.display.x;
    const dy = p.y - this.display.y;
    const len = Math.hypot(dx, dy) || 1;
    this.body.setVelocity((dx/len)*BOSS_SPEED, (dy/len)*BOSS_SPEED);
  }

  kill(){
    if (!this.alive) return;
    this.alive = false;
    this.body.enable = false;
    this.scene.tweens.add({ targets: this.display, alpha: 0, duration: 220, onComplete: ()=> this.display.destroy() });
    this.scene.onBossDefeated();
  }

  destroy(){ try { this.display?.destroy(); } catch(_){} }
}
