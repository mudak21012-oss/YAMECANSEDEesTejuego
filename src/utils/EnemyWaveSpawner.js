export class EnemyWaveSpawner {
  /**
   * scene: Phaser.Scene
   * getBounds: ()=>({x,y,w,h})
   * spawnAt: (x,y)=>void
   * aliveCount: ()=>number (enemigos vivos)
   */
  constructor(scene, getBounds, spawnAt, aliveCount) {
    this.scene = scene;
    this.getBounds = getBounds;
    this.spawnAt = spawnAt;
    this.aliveCount = aliveCount;

    this.timer = null;
    this.endsAt = 0;
    this._cfg = null;

    this._onStart = (e) => this.onWaveStart(e);
    this._onEnd   = ()  => this.onWaveEnd();

    scene.events.on("wave:start", this._onStart);
    scene.events.on("wave:end",   this._onEnd);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  // Config por ola (1..4). La 5 = jefe (sin timer de normales aquí)
  configForWave(waveIndex1based) {
    switch (waveIndex1based) {
      case 1: return { initial: 10, perTick: 5,  everyMs: 10000, maxAlive: 16, minDist: 140 };
      case 2: return { initial: 20, perTick: 10, everyMs: 10000, maxAlive: 28, minDist: 150 };
      case 3: return { initial: 30, perTick: 10, everyMs: 10000, maxAlive: 40, minDist: 160 };
      case 4: return { initial: 50, perTick: 20, everyMs: 10000, maxAlive: 60, minDist: 170 };
      default: return null; // ola 5 -> jefe
    }
  }

  onWaveStart({ index, durationMs, endsAt }) {
    this.stop();
    this._cfg = this.configForWave(index);
    if (!this._cfg) return; // ola 5 no se gestiona aquí

    const now = this.scene.time.now;
    this.endsAt = endsAt ?? (now + (durationMs ?? 60000));

    // Spawn inicial
    this.spawnBatch(this._cfg.initial);

    // Timer periódico
    this.timer = this.scene.time.addEvent({
      delay: this._cfg.everyMs,
      loop: true,
      callback: () => {
        if (this.scene.time.now >= this.endsAt) return;
        const alive = this.aliveCount();
        const room = Math.max(0, (this._cfg.maxAlive ?? Infinity) - alive);
        if (room <= 0) return;
        const n = Math.min(this._cfg.perTick ?? 0, room);
        if (n > 0) this.spawnBatch(n);
      }
    });
  }

  spawnBatch(n) {
    const { x, y, w, h } = this.getBounds();
    const p = this.scene.player?.display;
    for (let i = 0; i < n; i++) {
      let sx = 0, sy = 0, tries = 0;
      do {
        sx = Phaser.Math.Between(x + 24, x + w - 24);
        sy = Phaser.Math.Between(y + 24, y + h - 24);
        tries++;
      } while (p && Phaser.Math.Distance.Between(p.x, p.y, sx, sy) < (this._cfg?.minDist ?? 140) && tries < 30);
      this.spawnAt(sx, sy);
    }
  }

  onWaveEnd() { this.stop(); }

  stop() {
    try { this.timer?.remove(false); } catch(_) {}
    this.timer = null;
  }

  destroy() {
    this.stop();
    try {
      this.scene?.events?.off("wave:start", this._onStart);
      this.scene?.events?.off("wave:end",   this._onEnd);
    } catch (_) {}
  }
}
