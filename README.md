# Hoho3D Phaser Prototype

Base funcional en Phaser 3 para un juego tipo *The Binding of Isaac*:
- 4 salas (2x2) conectadas por pasillos.
- Enemigos con IA de persecución.
- Ataques del jugador:
  - **Space** = Dash/Slash (mata al contacto durante el dash).
  - **Click izquierdo** = Escudo con cooldown de 10s (bloquea daño).
  - **Click derecho** = Ataque especial radial.
- Puntuación: +100 por enemigo, -20 al recibir golpe (si no hay escudo).
- Vida con corazones y medios corazones.
- Menú con ranking desde Google Sheets (CSV publicado).
- Pantalla de muerte con puntaje y reinicio.
- Branding: "Hoho3D" y logo (cargado desde Google Drive si CORS lo permite; si no, fallback de texto).

## Ejecutar
- Con **Phaser Launcher**: abre esta carpeta y ejecuta.
- O con servidor simple:
  ```bash
  npx http-server -p 8080 .
  # o con Python
  python -m http.server 8080


Luego abre http://localhost:8080.

Vincular sprites

Agrega tus sprites en assets/ y cámbialos en las entidades/escenas según corresponda.

Google Sheets

Se usa el CSV público:

https://docs.google.com/spreadsheets/d/e/2PACX-1vTZ-GFIahnmzB09C1GWCvAs1PaNXmpN2_Ed5taWtseTRlqx0P8-ZKJ28TOsvziFOw/pub?gid=1321470601&single=true&output=csv


Edita ScoreboardService.js si cambias el formato de columnas.
