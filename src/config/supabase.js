// Configuración Supabase: rellena con tus valores reales.
// Crea un proyecto en https://app.supabase.com
// Tab Settings -> Project Settings -> API: copia PROJECT_URL y anon public key.
// Tab Table editor: crea tabla 'users' y tabla 'scores' con columnas sugeridas.

export const SUPABASE_URL = "https://rwarhtqelvufkucmlgyd.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3YXJodHFlbHZ1Zmt1Y21sZ3lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2OTgzNzQsImV4cCI6MjA3MjI3NDM3NH0.d3joirLSHecQLz9ig7l7wg4sayCs_tNU6mHtSjLpm-U";

// Tablas y columnas estándar esperadas por los servicios:
// users: id (uuid, pk, default uuid_generate_v4()), username (text UNIQUE), contact (text), pass_hash (text), created_at (timestamptz default now())
// scores: id (uuid), user_id (uuid fk -> users.id), points (int), created_at (timestamptz default now())

export const TABLES = {
  users: "users",
  scores: "scores"
};

// Helper para saber si está configurado o seguimos usando fallback gsheets
export function supabaseConfigured(){
  return SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("YOUR_PROJECT_ID") && !SUPABASE_ANON_KEY.includes("YOUR_ANON_PUBLIC_KEY");
}
