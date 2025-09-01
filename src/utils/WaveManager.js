export class WaveManager {
  /**
   * Controla oleadas cronometradas y emite eventos a la escena:
   * - "wave:start", { index, total, durationMs, endsAt }
   * - "wave:tick",  { index, remainingMs }
   * - "wave:end",   { index }
   * - "boss:start"  (si index es la última ola)
   */
  constructor(scene, durationsSec) {
    this.scene = scene;
    this.durations = durationsSec.map(s => s * 1000);
    this.total = this.durations.length;
    this.index = 0; // 0-based
    this._tickEvt = null;
    this._endEvt = null;
    this.endsAt = 0;
  }

  start() { this.startWave(0); }

  startWave(i) {
    this.stopTimers();
    this.index = i;
    const dur = this.durations[i];
    const now = this.scene.time.now;
    this.endsAt = now + dur;

    this.scene.events.emit("wave:start", {
      index: i + 1, total: this.total, durationMs: dur, endsAt: this.endsAt
    });

    if (i + 1 === this.total) this.scene.events.emit("boss:start");

    this._tickEvt = this.scene.time.addEvent({
      delay: 250, loop: true,
      callback: () => {
        const rem = Math.max(0, this.endsAt - this.scene.time.now);
        this.scene.events.emit("wave:tick", { index: i + 1, remainingMs: rem });
      }
    });

    this._endEvt = this.scene.time.addEvent({
      delay: dur, loop: false,
      callback: () => {
        this.scene.events.emit("wave:end", { index: i + 1 });
        if (i + 1 < this.total) this.startWave(i + 1);
      }
    });
  }

  stopTimers() {
    try { this._tickEvt?.remove(false); } catch(_) {}
    try { this._endEvt?.remove(false); } catch(_) {}
    this._tickEvt = this._endEvt = null;
  }

  endNow(){
    const i = this.index; // 0-based
    this.stopTimers();
    this.scene.events.emit('wave:end', { index: i + 1 });
    if (i + 1 < this.total) this.startWave(i + 1);
  }

  destroy() { this.stopTimers(); }
}
