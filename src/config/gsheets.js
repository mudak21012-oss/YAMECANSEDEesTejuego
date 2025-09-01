// Configuración Google Sheets / Forms para registro & login sin backend dedicado.
// Reemplaza USERS_FORM_URL y las entry.* por los IDs reales de tu Google Form.

export const USERS_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTZ-GFIahnmzB09C1GWCvAs1PaNXmpN2_Ed5taWtseTRlqx0P8-ZKJ28TOsvziFOw/pub?gid=117223967&single=true&output=csv";

// URL de envío del Form (formResponse)
export const USERS_FORM_URL =
  "https://docs.google.com/forms/d/e/XXXXXXXXXXXXXXXXXXXXXXXX/formResponse"; // TODO: sustituir

// Mapeo de campos: entry.xxxxxxxxxxx => cada input del form pre-rellenado
export const USERS_FORM_FIELDS = {
  nombre: "entry.1111111111",        // TODO: reemplazar
  password_hash: "entry.2222222222", // TODO: reemplazar
  contacto: "entry.3333333333"       // TODO: reemplazar (opcional)
};

// Clave de localStorage para la sesión
export const LS_USER_KEY = "hoho3d_user";
