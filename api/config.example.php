<?php
// ============================================================
// Profit Lab · Aula Virtual — Configuración de la API
// ------------------------------------------------------------
// 1. Copia este archivo a  config.php
// 2. Rellena con los datos de tu base de datos MySQL de SiteGround
//    (Site Tools → Bases de datos MySQL).
// 3. NUNCA subas config.php a un repositorio público.
// ============================================================

return [
  // --- Base de datos MySQL ---
  'db_host' => 'localhost',              // en SiteGround suele ser 'localhost'
  'db_name' => 'TU_BASE_DE_DATOS',       // ej. dbxxxx_aula
  'db_user' => 'TU_USUARIO',             // ej. usrxxxx_aula
  'db_pass' => 'TU_CONTRASEÑA',
  'db_charset' => 'utf8mb4',

  // --- Seguridad ---
  // Clave secreta para firmar los tokens JWT. Genera una larga y aleatoria:
  //   php -r "echo bin2hex(random_bytes(32));"
  'jwt_secret'  => 'CAMBIA_ESTO_POR_UNA_CLAVE_LARGA_Y_ALEATORIA',
  'jwt_ttl'     => 60 * 60 * 24 * 30,    // vigencia del token en segundos (30 días)

  // --- CORS ---
  // Deja '' si el frontend y la API están en el MISMO dominio (recomendado).
  // Si están en dominios distintos, pon la URL del frontend, ej:
  //   'https://aula.tudominio.com'
  'cors_origin' => '',
];
