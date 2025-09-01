import { SCORE_PER_KILL, WAVE_DURATIONS, BOSS_DAMAGE_FROM_DASH, BOSS_DAMAGE_FROM_SPECIAL, BOSS_SCORE_STEP, BOSS_MAX_HP } from '../config/gameConfig.js';
import UIScene from './UIScene.js';
import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.js';
import { Boss } from '../entities/Boss.js';
import { WaveManager } from '../utils/WaveManager.js';
import { EnemyWaveSpawner } from '../utils/EnemyWaveSpawner.js';
import { getSoundManager } from '../audio/SoundManager.js';

const WALL_T = 8;
const ROOM_MARGIN = 40;

export default class GameScene extends Phaser.Scene {
  constructor(){ super('Game'); }

  create(){
    const W = this.scale.width, H = this.scale.height;
    this.cameras.main.setBackgroundColor(0x0b0b0b);
    this.physics.world.setBounds(0,0,W,H);

    // Sala única y paredes
    this.room = this.buildSingleRoom(W,H,ROOM_MARGIN);
    this.roomGfx = this.add.graphics().lineStyle(2,0x303030,1).fillStyle(0x151515,1);
    this.roomGfx.fillRect(this.room.x,this.room.y,this.room.w,this.room.h).strokeRect(this.room.x,this.room.y,this.room.w,this.room.h);
    this.walls = this.physics.add.staticGroup();
    this.addFullWalls(this.room);

    // Entidades base
    this.player = new Player(this, this.room.cx, this.room.cy);
    this.enemies = [];
    this.boss = null;
    this.bossOverlap = null;
    this.bossScoredMilestones = 0;

    // UI
    if (!this.scene.get('UI')) this.scene.add('UI', UIScene, true); else this.scene.launch('UI');

    // Wave manager primero (sin iniciar todavía) y registro de señales
    this.waves = new WaveManager(this, WAVE_DURATIONS);
    this.handleWaveSignals(); // registra listener wave:start ANTES del spawner para que clearEnemies ocurra antes del spawn inicial

    // Spawner cronometrado (olas 1..4) - debe existir antes de waves.start() para escuchar wave 1
    this.spawner = new EnemyWaveSpawner(
      this,
      () => ({ x: this.room.x, y: this.room.y, w: this.room.w, h: this.room.h }),
      (sx, sy) => this.spawnEnemyAt(sx, sy),
      () => this.aliveEnemies()
    );

    // Tecla tester '1'
    this.keyEndWave = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);

    // Iniciar olas ahora que ambos listeners están listos
    this.waves.start();

  // Música de juego normal
    // Música de juego (gameplay)
    try {
      this.soundManager = getSoundManager(this);
      const key = this.cache.audio.exists('bgm_gameplay') ? 'bgm_gameplay' : (this.cache.audio.exists('bgm_boss') ? 'bgm_boss' : 'bgm_gameplay');
      if(this.soundManager.currentBgm?.key !== key){
        // Arranca a 0.6 y baja a 0.3 en 20s para hacer perceptible el descenso
        this.soundManager.playBgm(key, { volume:0.6, fade:1200 });
        this.time.delayedCall(3000, ()=> this.soundManager.setBgmVolume(0.3, { fade: 20000 }));
      } else {
        // Reafirma volumen alto y luego largo fade down
        this.soundManager.setBgmVolume(0.6, { fade:600 });
        this.time.delayedCall(2000, ()=> this.soundManager.setBgmVolume(0.3, { fade: 20000 }));
      }
    } catch(e){ console.warn('No gameplay BGM', e.message); }
    // Botón de volumen ahora en UIScene


    // Limpieza en shutdown
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, ()=>{
      try { this.spawner?.destroy(); } catch(_){ }
      try { this.waves?.destroy?.(); } catch(_){ }
      try { this.stopBossAddsSchedule(); } catch(_){}
      this.clearEnemies();
      this.destroyBoss();
      try { this.walls?.clear(true,true);} catch(_){ }
      this.player?.destroy();
      this.roomGfx?.destroy();
      try { this.input.keyboard.removeKey(this.keyEndWave); } catch(_){ }
    });
    this.input.mouse?.disableContextMenu();
  }

  handleWaveSignals(){
    this.events.on('wave:start', ({ index, total })=>{
      this.clearEnemies();
      this.destroyBoss();
      this.stopBossAddsSchedule(); // asegurar cancelación de adds previos
      if (index < total){
        // Olas 1..4: handled by EnemyWaveSpawner (initial + perTick)
      } else {
        // Ola 5: jefe + 5 iniciales + programación 20 + 20
        // (Si tuvieras un track especial de boss, aquí harías swap; por ahora mantenemos gameplay o boss si existe)
        try {
          const bossKey = this.cache.audio.exists('bgm_boss_final') ? 'bgm_boss_final'
            : (this.cache.audio.exists('bgm_boss') ? 'bgm_boss'
            : (this.cache.audio.exists('bgm_gameplay') ? 'bgm_gameplay' : null));
            if (bossKey) this.soundManager?.swapBgm(bossKey, { volume:0.3, fade:1000 });
        } catch(_){}
        this.spawnBoss();
        this.spawnMany(5);
        this.startBossAddsSchedule();
      }
    });
    this.events.on('wave:end', ({ index })=>{
      if (index === WAVE_DURATIONS.length){
        this.stopBossAddsSchedule();
        this.scene.stop('UI');
        this.scene.start('GameOver', { score: this.player.score });
      }
    });
  }


  spawnBoss(){
    if (this.boss) return;
    this.boss = new Boss(this, this.room.cx, this.room.cy - 60);
    this.physics.add.collider(this.boss.display, this.walls);
    this.bossOverlap = this.physics.add.overlap(this.player.display, this.boss.display, ()=> this.onPlayerBossOverlap());
  }

  onPlayerEnemyOverlap(enemy){
    if (!enemy.alive) return;
  if (this.player.isDashing){ this.killEnemy(enemy); }
    else this.player.hit(1);
  }

  onPlayerBossOverlap(){
    if (!this.boss || !this.boss.alive) return;
    if (this.player.isDashing){ this.boss.takeDamage(BOSS_DAMAGE_FROM_DASH); }
    else this.player.hit(1);
  }

  damageBossInRadius(x,y,r){
    if (!this.boss || !this.boss.alive) return;
    const d = Phaser.Math.Distance.Between(x,y,this.boss.display.x,this.boss.display.y);
    if (d <= r) this.boss.takeDamage(BOSS_DAMAGE_FROM_SPECIAL);
  }

  onBossDamaged(hp,max){
    const prevMilestone = this.bossScoredMilestones;
    const newMilestone = Math.floor((BOSS_MAX_HP - hp)/1000);
    if (newMilestone > prevMilestone){
      const gained = newMilestone - prevMilestone;
      this.bossScoredMilestones = newMilestone;
      this.player.addScore(gained * BOSS_SCORE_STEP);
    }
    if (hp<=0) this.onBossDefeated();
  }

  onBossDefeated(){
  this.stopBossAddsSchedule();
  this.scene.stop('UI');
  this.scene.start('GameOver', { score: this.player.score });
  }

  destroyBoss(){
    if (this.bossOverlap){
      try { this.physics.world.removeCollider(this.bossOverlap); } catch(_){}
      this.bossOverlap = null;
    }
    if (this.boss){
      try { this.boss.destroy(); } catch(_){}
      this.boss = null;
    }
    this.bossScoredMilestones = 0;
  }

  // winGame not needed; onBossDefeated handles victory

  buildSingleRoom(W,H,margin){
    const x = Math.floor(margin), y = Math.floor(margin);
    const w = Math.floor(W - margin*2), h = Math.floor(H - margin*2);
    return { x,y,w,h,cx:x+w/2, cy:y+h/2 };
  }
  addFullWalls(r){
    this.makeWall(r.x,r.y,r.w,WALL_T);
    this.makeWall(r.x,r.y+r.h-WALL_T,r.w,WALL_T);
    this.makeWall(r.x,r.y,WALL_T,r.h);
    this.makeWall(r.x+r.w-WALL_T,r.y,WALL_T,r.h);
  }
  makeWall(x,y,w,h){ if (w<=0||h<=0) return; const wall = this.add.rectangle(x+w/2,y+h/2,w,h,0,0); this.physics.add.existing(wall,true); this.walls.add(wall); }

  killEnemiesInRadius(x,y,r){
    for (const e of this.enemies){
      if (!e.alive) continue; const d = Phaser.Math.Distance.Between(x,y,e.display.x,e.display.y);
  if (d<=r){ this.killEnemy(e); } }
  }

  clearEnemies(){
    try { this.enemies.forEach(e => e.destroy()); } catch(_){}
    this.enemies = [];
  }

  aliveEnemies(){ return this.enemies.filter(e=> e.alive).length; }

  spawnEnemyAt(x,y){
    const enemy = new Enemy(this, x, y);
    this.enemies.push(enemy);
    this.physics.add.collider(enemy.display, this.walls);
    this.physics.add.overlap(this.player.display, enemy.display, ()=> this.onPlayerEnemyOverlap(enemy));
  }

  randPosAwayFromPlayer(minDist=140){
    const p = this.player.display;
    const { x,y,w,h } = this.room;
    let sx=0, sy=0, tries=0;
    do {
      sx = Phaser.Math.Between(x+24, x+w-24);
      sy = Phaser.Math.Between(y+24, y+h-24);
      tries++;
    } while (Phaser.Math.Distance.Between(p.x,p.y,sx,sy) < minDist && tries < 20);
    return { x:sx, y:sy };
  }

  spawnMany(count, minDist=140){
    for (let i=0;i<count;i++){
      const { x,y } = this.randPosAwayFromPlayer(minDist);
      this.spawnEnemyAt(x,y);
    }
  }

  killEnemy(enemy){
    if (!enemy.alive) return;
    enemy.kill();
    this.player.addScore(SCORE_PER_KILL);
  }

  onPlayerDeath(){
    this.scene.stop('UI');
    this.scene.start('GameOver', { score: this.player.score });
  }

  cleanAll(){ /* mantenido por compatibilidad si se llama manualmente */ }

  update(time,delta){
    this.player.update(delta);
    for (const e of this.enemies) e.update();
    this.boss?.update();
    if (Phaser.Input.Keyboard.JustDown(this.keyEndWave)) this.waves?.endNow();
    this.events.emit('hud:update', {
      healthHalves: this.player.healthHalves,
      maxHalves: 6,
      score: this.player.score,
      shieldCD: Math.max(0, this.player.shieldReadyAt - time),
      specialCD: Math.max(0, this.player.specialReadyAt - time),
    });
  }

  // ---- Boss wave scheduled adds ----
  bossWaveMaxAlive(){ return 40; }
  startBossAddsSchedule(){
    this.stopBossAddsSchedule();
    this._bossAdds = [];
    const spawnOne = () => {
      if (!this.sys.isActive()) return;
      if (!this.boss || !this.boss.alive) return;
      if (this.aliveEnemies() >= this.bossWaveMaxAlive()) return;
      const { x, y, w, h } = this.room;
      const p = this.player.display;
      let sx=0, sy=0, tries=0;
      do {
        sx = Phaser.Math.Between(x+24, x+w-24);
        sy = Phaser.Math.Between(y+24, y+h-24);
        tries++;
      } while (Phaser.Math.Distance.Between(p.x,p.y,sx,sy) < 150 && tries < 30);
      this.spawnEnemyAt(sx, sy);
    };
    const scheduleMinute = (offsetMs, count) => {
      this.time.delayedCall(offsetMs, () => {
        const ev = this.time.addEvent({ delay:3000, repeat: count-1, callback: spawnOne });
        this._bossAdds.push(ev);
      });
    };
    scheduleMinute(0, 20);
    scheduleMinute(60000, 20);
  }
  stopBossAddsSchedule(){
    if (!this._bossAdds) return;
    for (const ev of this._bossAdds){ try { ev.remove(false); } catch(_){ } }
    this._bossAdds = null;
  }
}
