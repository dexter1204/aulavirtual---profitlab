<?php
// ============================================================
// Profit Lab · Aula Virtual — Accesos unificados (super-app)
// ------------------------------------------------------------
// Un solo modelo de acceso premium por producto + cupones multi-scope
// (el "cupón general"). Convive con quant_access / signals_access:
// al otorgar quant|signals, se ESPEJA a esas tablas para que los
// endpoints y clientes existentes (p.ej. /quant/me, backend Python)
// sigan viendo el acceso sin cambios.
//
// Rutas (dispatch desde index.php con $seg[0] === 'access'):
//   GET  /access/me                 → estado por producto del usuario
//   POST /access/redeem {code}      → canjear cupón (multi-scope)
//   GET  /access/coupons            → (admin) listar cupones
//   POST /access/coupons {...}      → (admin) crear cupón
//   DELETE /access/coupons/{id}     → (admin) borrar cupón
//   POST /access/grant {user_id,products[],days} → (admin) otorgar manual
// ============================================================

require_once __DIR__ . '/helpers.php';

/** Productos que expone /access/me. (courses se reserva para el futuro.) */
function ent_products(): array {
  return ['quant', 'signals', 'news'];
}

/** ¿Es un producto/scope válido? */
function ent_scope_valid(string $p): bool {
  return in_array($p, ['quant', 'signals', 'news', 'courses'], true);
}

/**
 * Estado de acceso de UN producto para el usuario.
 * Admin siempre tiene acceso. Combina (OR) la tabla unificada con las
 * tablas legacy quant_access/signals_access, para no perder accesos.
 */
function ent_state(array $u, string $product): array {
  if (($u['role'] ?? '') === 'admin') {
    return ['has_access' => true, 'access_until' => null, 'lifetime' => true];
  }

  $life = false;
  $until = null;

  // Fuente 1: tabla unificada.
  $s = db()->prepare('SELECT lifetime, access_until FROM entitlements WHERE user_id = ? AND product = ?');
  $s->execute([$u['id'], $product]);
  if ($row = $s->fetch()) {
    if ((int) $row['lifetime'] === 1) $life = true;
    elseif (!empty($row['access_until'])) $until = $row['access_until'];
  }

  // Fuente 2 (fallback): tablas legacy para quant/signals.
  if (!$life) {
    $legacy = $product === 'quant' ? 'quant_access'
            : ($product === 'signals' ? 'signals_access' : null);
    if ($legacy) {
      try {
        $ls = db()->prepare("SELECT lifetime, access_until FROM $legacy WHERE user_id = ?");
        $ls->execute([$u['id']]);
        if ($lr = $ls->fetch()) {
          if ((int) $lr['lifetime'] === 1) {
            $life = true;
          } elseif (!empty($lr['access_until'])
                 && (empty($until) || strtotime($lr['access_until']) > strtotime($until))) {
            $until = $lr['access_until'];
          }
        }
      } catch (Throwable $e) {
        // La tabla legacy puede no existir en entornos nuevos: se ignora.
      }
    }
  }

  $has = $life || ($until && strtotime($until) > time());
  return ['has_access' => $has, 'access_until' => $until, 'lifetime' => $life];
}

/**
 * Otorga/extiende el acceso de UN producto. $days <= 0 → vitalicio.
 * Espeja quant/signals a sus tablas legacy para compatibilidad.
 */
function ent_grant(string $userId, string $product, int $days, string $source): void {
  $cur = db()->prepare('SELECT lifetime, access_until FROM entitlements WHERE user_id = ? AND product = ?');
  $cur->execute([$userId, $product]);
  $row = $cur->fetch();

  if (!($row && (int) $row['lifetime'] === 1)) { // si ya es vitalicio, no tocar
    if ($days <= 0) {
      $lifetime = 1; $until = null;
    } else {
      $base = time();
      if ($row && !empty($row['access_until']) && strtotime($row['access_until']) > $base) {
        $base = strtotime($row['access_until']); // extiende desde el acceso vigente
      }
      $lifetime = 0; $until = date('Y-m-d H:i:s', $base + $days * 86400);
    }
    if ($row) {
      db()->prepare('UPDATE entitlements SET lifetime = ?, access_until = ?, source = ?, updated_at = ? WHERE user_id = ? AND product = ?')
          ->execute([$lifetime, $until, $source, date('Y-m-d H:i:s'), $userId, $product]);
    } else {
      db()->prepare('INSERT INTO entitlements (user_id, product, lifetime, access_until, source) VALUES (?,?,?,?,?)')
          ->execute([$userId, $product, $lifetime, $until, $source]);
    }
  }

  // Espejo a las tablas legacy (compatibilidad con endpoints/clientes existentes).
  if ($product === 'quant' && function_exists('grant_quant_access')) {
    grant_quant_access($userId, $days, $source);
  }
  if ($product === 'signals' && function_exists('grant_signals_access')) {
    grant_signals_access($userId, $days, $source);
  }
}

/** Normaliza una lista de scopes (array o string con comas) a productos válidos. */
function ent_parse_scopes($raw): array {
  $list = is_array($raw) ? $raw : explode(',', (string) $raw);
  $out = [];
  foreach ($list as $x) {
    $x = strtolower(trim((string) $x));
    if ($x !== '' && ent_scope_valid($x) && !in_array($x, $out, true)) $out[] = $x;
  }
  return $out;
}

/** Estado de todos los productos (para /access/me y respuestas de canje). */
function ent_all_states(array $u): array {
  $products = [];
  foreach (ent_products() as $p) $products[$p] = ent_state($u, $p);
  return $products;
}

/** Dispatcher del bloque /access. */
function handle_access(array $seg, string $method): void {
  // GET /access/me → estado por producto del usuario autenticado
  if (($seg[1] ?? '') === 'me' && $method === 'GET') {
    $u = require_auth();
    json_out([
      'authenticated' => true,
      'user' => ['id' => $u['id'], 'name' => $u['name'], 'email' => $u['email'], 'role' => $u['role']],
      'products' => ent_all_states($u),
    ]);
  }

  // POST /access/redeem {code} → canjear cupón multi-scope
  if (($seg[1] ?? '') === 'redeem' && $method === 'POST') {
    $u = require_auth();
    $code = strtoupper(trim((string) (body()['code'] ?? '')));
    if ($code === '') fail('Ingresa un cupón');

    $c = db()->prepare('SELECT * FROM access_coupons WHERE code = ?');
    $c->execute([$code]);
    $coupon = $c->fetch();
    if (!$coupon || !(int) $coupon['active']) fail('Cupón inválido');
    if (!empty($coupon['expires_at']) && strtotime($coupon['expires_at']) < time()) fail('Cupón expirado');
    if ((int) $coupon['max_uses'] > 0 && (int) $coupon['uses'] >= (int) $coupon['max_uses']) fail('Cupón agotado');

    $used = db()->prepare('SELECT 1 FROM access_coupon_uses WHERE coupon_id = ? AND user_id = ?');
    $used->execute([$coupon['id'], $u['id']]);
    if ($used->fetchColumn()) fail('Ya canjeaste este cupón');

    $scopes = ent_parse_scopes($coupon['scopes']);
    if (!$scopes) fail('El cupón no otorga ningún producto');

    foreach ($scopes as $p) ent_grant($u['id'], $p, (int) $coupon['days'], 'coupon');
    db()->prepare('INSERT INTO access_coupon_uses (id, coupon_id, user_id) VALUES (?,?,?)')
        ->execute([uuid(), $coupon['id'], $u['id']]);
    db()->prepare('UPDATE access_coupons SET uses = uses + 1 WHERE id = ?')->execute([$coupon['id']]);

    json_out(['ok' => true, 'unlocked' => $scopes, 'products' => ent_all_states($u)]);
  }

  // ----- Admin: cupones -----
  if (($seg[1] ?? '') === 'coupons') {
    if (count($seg) === 2 && $method === 'GET') {
      require_admin();
      json_out(db()->query('SELECT * FROM access_coupons ORDER BY created_at DESC')->fetchAll());
    }
    if (count($seg) === 2 && $method === 'POST') {
      require_admin();
      $b = body();
      $scopes = ent_parse_scopes($b['scopes'] ?? 'quant,signals,news');
      if (!$scopes) fail('Indica al menos un producto (scopes)');
      $code = strtoupper(trim((string) ($b['code'] ?? '')));
      if ($code === '') $code = 'PLQ-' . strtoupper(bin2hex(random_bytes(3)));
      $exists = db()->prepare('SELECT 1 FROM access_coupons WHERE code = ?');
      $exists->execute([$code]);
      if ($exists->fetchColumn()) fail('Ya existe un cupón con ese código', 409);
      $id = uuid();
      db()->prepare('INSERT INTO access_coupons (id, code, scopes, days, max_uses, active, expires_at, note) VALUES (?,?,?,?,?,1,?,?)')
          ->execute([$id, $code, implode(',', $scopes), (int) ($b['days'] ?? 30), (int) ($b['max_uses'] ?? 0),
                     !empty($b['expires_at']) ? $b['expires_at'] : null, $b['note'] ?? null]);
      json_out(['id' => $id, 'code' => $code, 'scopes' => $scopes], 201);
    }
    if (count($seg) === 3 && $method === 'DELETE') {
      require_admin();
      db()->prepare('DELETE FROM access_coupons WHERE id = ?')->execute([$seg[2]]);
      json_out(['ok' => true]);
    }
  }

  // POST /access/grant {user_id, products[], days} (admin) → otorgar manual
  if (($seg[1] ?? '') === 'grant' && $method === 'POST') {
    require_admin();
    $b = body();
    $uid = (string) ($b['user_id'] ?? '');
    if ($uid === '') fail('user_id requerido');
    $uq = db()->prepare('SELECT 1 FROM users WHERE id = ?');
    $uq->execute([$uid]);
    if (!$uq->fetchColumn()) fail('Usuario no encontrado', 404);
    $scopes = ent_parse_scopes($b['products'] ?? $b['scopes'] ?? '');
    if (!$scopes) fail('Indica products (o scopes)');
    foreach ($scopes as $p) ent_grant($uid, $p, (int) ($b['days'] ?? 0), 'admin');
    json_out(['ok' => true, 'granted' => $scopes]);
  }

  fail('Ruta de access no encontrada', 404);
}
