import BootScene from "./scenes/BootScene.js";
import AuthScene from "./scenes/AuthScene.js";
import MenuScene from "./scenes/MenuScene.js";
import GameScene from "./scenes/GameScene.js";
import UIScene from "./scenes/UIScene.js";
import GameOverScene from "./scenes/GameOverScene.js";
import UIShowcaseScene from "./scenes/UIShowcaseScene.js";

const config = {
  type: Phaser.AUTO,
  parent: "game-container",
  backgroundColor: "#0b0b0b",
  width: 960,
  height: 640,
  pixelArt: true, // crisp pixel art scaling
  dom: { createContainer: true },
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: "arcade", arcade: { gravity: { y: 0 }, debug: false } },
  // Arranque directo: Boot -> (Auth opcional) -> Menu
  scene: [BootScene, AuthScene, MenuScene, GameScene, UIScene, GameOverScene, UIShowcaseScene]
};

const game = new Phaser.Game(config);

// Diagnóstico rápido Supabase
setTimeout(()=>{
  const hasLoader = typeof window.createSupabaseClient === 'function';
  console.log('[Diag] createSupabaseClient type =', typeof window.createSupabaseClient);
  import('./config/supabase.js').then(m=>{
    console.log('[Diag] SUPABASE_URL =', m.SUPABASE_URL);
    console.log('[Diag] configured? ', m.supabaseConfigured());
    if(hasLoader){
      import('./services/supabaseClient.js').then(sc=> sc.getSupabase());
    }
  });
  const tag = document.createElement('div');
  tag.style.cssText='position:fixed;top:4px;right:6px;padding:4px 8px;font:11px monospace;background:#08131dcc;color:#9ad4ff;border:1px solid #1f4258;z-index:9999;border-radius:6px;pointer-events:none;';
  tag.id='supabase-status';
  tag.textContent = hasLoader? 'SB loader OK' : 'SB loader MISSING';
  document.body.appendChild(tag);
  setTimeout(()=> tag.remove(), 5000);
}, 0);

// Reinicio robusto: detiene TODAS las escenas activas y arranca limpio.
export function hardRestart(to = "Game") {
  const sm = game.scene;
  // Stop all active scenes
  sm.getScenes(true).forEach(s => sm.stop(s.scene.key));
  // Remove known scenes (ignore errors if already gone)
  ["UI","Game","Menu","GameOver","Boot","UIShowcase","Auth"].forEach(k => { try { sm.remove(k); } catch(_) {} });
  // Re-add scenes fresh
  sm.add("Boot", BootScene, false);
  sm.add("Auth", AuthScene, false);
  sm.add("Menu", MenuScene, false);
  sm.add("Game", GameScene, false);
  sm.add("UI", UIScene, false);
  sm.add("GameOver", GameOverScene, false);
  sm.add("UIShowcase", UIShowcaseScene, false);
  sm.start(to);
}

export default game;
