<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/jwt.php';

// ---------- CORS + JSON ----------
function send_cors_headers(): void {
  $origin = config()['cors_origin'] ?? '';
  if ($origin !== '') {
    header("Access-Control-Allow-Origin: $origin");
    header('Vary: Origin');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
  }
  if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
  }
}

function json_out($data, int $code = 200): void {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($data);
  exit;
}

function fail(string $message, int $code = 400): void {
  json_out(['error' => $message], $code);
}

function body(): array {
  $raw = file_get_contents('php://input');
  if ($raw === '' || $raw === false) return [];
  $data = json_decode($raw, true);
  return is_array($data) ? $data : [];
}

function uuid(): string {
  $d = random_bytes(16);
  $d[6] = chr((ord($d[6]) & 0x0f) | 0x40);
  $d[8] = chr((ord($d[8]) & 0x3f) | 0x80);
  return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($d), 4));
}

// ---------- Autenticación ----------
function bearer_token(): ?string {
  $headers = [];
  if (function_exists('getallheaders')) {
    foreach (getallheaders() as $k => $v) $headers[strtolower($k)] = $v;
  }
  $auth = $headers['authorization']
    ?? $_SERVER['HTTP_AUTHORIZATION']
    ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
    ?? '';
  if (preg_match('/Bearer\s+(.+)/i', $auth, $m)) return trim($m[1]);
  return null;
}

/** Devuelve el usuario actual (fila de users sin password) o null. */
function current_user(): ?array {
  static $cached = false;
  static $user = null;
  if ($cached) return $user;
  $cached = true;

  $token = bearer_token();
  if (!$token) return $user = null;

  $payload = jwt_decode($token, config()['jwt_secret']);
  if (!$payload || empty($payload['sub'])) return $user = null;

  $stmt = db()->prepare('SELECT id, name, email, role, avatar_url, created_at, updated_at FROM users WHERE id = ?');
  $stmt->execute([$payload['sub']]);
  $row = $stmt->fetch();
  return $user = ($row ?: null);
}

function require_auth(): array {
  $u = current_user();
  if (!$u) fail('No autenticado', 401);
  return $u;
}

function require_admin(): array {
  $u = require_auth();
  if ($u['role'] !== 'admin') fail('Requiere permisos de administrador', 403);
  return $u;
}

function is_enrolled(string $userId, string $courseId): bool {
  $stmt = db()->prepare('SELECT 1 FROM enrollments WHERE user_id = ? AND course_id = ? LIMIT 1');
  $stmt->execute([$userId, $courseId]);
  return (bool) $stmt->fetchColumn();
}

// ---------- Mercado Pago (HTTP via cURL) ----------
/** Llama a la API de Mercado Pago. Devuelve [httpCode, dataArray]. */
function mp_request(string $method, string $url, string $token, ?array $body = null): array {
  $ch = curl_init($url);
  $headers = ['Authorization: Bearer ' . $token, 'Content-Type: application/json'];
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST  => $method,
    CURLOPT_HTTPHEADER     => $headers,
    CURLOPT_TIMEOUT        => 20,
  ]);
  if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
  $resp = curl_exec($ch);
  $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  $data = $resp ? json_decode($resp, true) : null;
  return [$code, is_array($data) ? $data : []];
}

// Normaliza los tipos de una fila de curso para JSON (bool/int).
function shape_course(array $c): array {
  $c['position'] = (int) $c['position'];
  if (array_key_exists('price', $c)) $c['price'] = (float) $c['price'];
  if (array_key_exists('students', $c)) $c['students'] = (int) $c['students'];
  return $c;
}

function shape_lesson(array $l, bool $authorized): array {
  $l['is_preview'] = (bool) $l['is_preview'];
  $l['position']   = (int) $l['position'];
  $l['drip_days']  = $l['drip_days'] !== null ? (int) $l['drip_days'] : null;
  // Protege el video: solo se entrega youtube_id si está autorizado (admin/inscrito/preview)
  if (!$authorized && !$l['is_preview']) {
    $l['youtube_id'] = null;
  }
  return $l;
}
