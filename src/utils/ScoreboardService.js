import { SHEET_CSV_URL } from "../config/gameConfig.js";
import { parseCSV } from "./helpers.js";

export class ScoreboardService {
  constructor(url = SHEET_CSV_URL) {
    this.url = url;
  }

  async fetchRecords() {
    const res = await fetch(this.url, { cache: "no-store" });
    const text = await res.text();
    const rows = parseCSV(text);
    return rows;
  }

  async getTopByScore(limit = 10) {
    const rows = await this.fetchRecords();
    // Detecta columnas típicas
    const nameKey = Object.keys(rows[0] || {}).find(k => /name|jugador/i.test(k)) || "nombre";
    const scoreKey = Object.keys(rows[0] || {}).find(k => /score|puntos/i.test(k)) || "puntos";

    const norm = rows
      .map(r => ({
        name: (r[nameKey] ?? "???").toString(),
        score: Number((r[scoreKey] ?? 0).toString().replace(/[^\d\-]/g, "")) || 0
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return norm;
  }
}
