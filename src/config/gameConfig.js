export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 640;
export const ROOM_W = 420;
export const ROOM_H = 260;
export const ROOM_GAP_X = 80;
export const ROOM_GAP_Y = 80;

export const PLAYER_BASE_SPEED = 180;
export const PLAYER_DASH_SPEED = 420;
export const PLAYER_DASH_TIME = 180; // ms
export const PLAYER_IFRAME_TIME = 600; // ms tras recibir golpe
export const PLAYER_MAX_HEALTH_HALVES = 6; // 3 corazones => 6 medios

export const ENEMY_SPEED = 80;
export const ENEMIES_PER_ROOM = 4;

export const SCORE_PER_KILL = 100;
export const SCORE_HIT_PENALTY = 20;

export const SHIELD_DURATION = 2000; // ms
export const SHIELD_COOLDOWN = 10000; // ms
export const SPECIAL_RADIUS = 120;
export const SPECIAL_COOLDOWN = 6000; // ms

export const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTZ-GFIahnmzB09C1GWCvAs1PaNXmpN2_Ed5taWtseTRlqx0P8-ZKJ28TOsvziFOw/pub?gid=1321470601&single=true&output=csv";

// Intento de logo (si CORS lo permite). Fallback: texto.
export const LOGO_URL =
  "https://drive.google.com/uc?export=view&id=1eRx46en2jLnjMCEbUcXc64t8Vo07WStq";

// Oleadas y Jefe Final
export const WAVE_DURATIONS = [30, 60, 60, 60, 120]; // segundos
export const BOSS_MAX_HP = 5000;
export const BOSS_SPEED = 60;
export const BOSS_DAMAGE_FROM_DASH = 200;
export const BOSS_DAMAGE_FROM_SPECIAL = 400;
export const BOSS_SCORE_STEP = 1000; // +1000 por cada 1000 HP reducidos

// Rutas opcionales de UI (pixel art). Si faltan archivos, las escenas usarán fallback procedural.
export const UI_ASSETS = {
  menuBg: "assets/ui/menu_bg.png",
  gameOverBg: "assets/ui/gameover_bg.png",
  startSprite: "assets/ui/start_sprite.png",
  endSprite: "assets/ui/end_sprite.png",
  pixelLogo: "assets/ui/logo.png"
};
