export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function randBetween(min, max) {
  return Math.random() * (max - min) + min;
}

export function parseCSV(text) {
  // Parser simple para CSV sin comillas complejas.
  // Si tu CSV tiene comas dentro de campos, reemplázalo por un parser robusto.
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift().split(",").map(h => h.trim().toLowerCase());
  return lines.map(line => {
    const cols = line.split(",").map(c => c.trim());
    const rec = {};
    headers.forEach((h, i) => (rec[h] = cols[i] ?? ""));
    return rec;
  });
}

export function formatNumber(n) {
  return new Intl.NumberFormat("es-AR").format(n);
}
