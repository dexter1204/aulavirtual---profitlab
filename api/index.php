<?php
// ============================================================
// Profit Lab · Aula Virtual — API REST (front controller)
// Todas las rutas /api/* entran aquí (ver api/.htaccess).
// ============================================================

require_once __DIR__ . '/lib/helpers.php';

send_cors_headers();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
$pos = strpos($uri, '/api/');
$route = $pos !== false ? substr($uri, $pos + 5) : ltrim($uri, '/');
$route = trim($route, '/');
$seg = $route === '' ? [] : array_map('rawurldecode', explode('/', $route));

// ------------------------------------------------------------
// Utilidades locales
// ------------------------------------------------------------
function slugify(string $text): string {
  $text = strtolower(trim($text));
  $text = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $text) ?: $text;
  $text = preg_replace('/[^a-z0-9]+/', '-', $text);
  $text = trim($text, '-');
  return substr($text, 0, 60) ?: 'curso';
}

function fetch_course(string $id): ?array {
  $s = db()->prepare('SELECT * FROM courses WHERE id = ?');
  $s->execute([$id]);
  $c = $s->fetch();
  return $c ?: null;
}

function reorder_table(string $table, array $ids): void {
  $pdo = db();
  $pdo->beginTransaction();
  $stmt = $pdo->prepare("UPDATE $table SET position = ? WHERE id = ?");
  foreach (array_values($ids) as $i => $id) {
    $stmt->execute([$i, $id]);
  }
  $pdo->commit();
}

// ------------------------------------------------------------
// RUTAS
// ------------------------------------------------------------
try {
  // Raíz
  if (count($seg) === 0) {
    json_out(['name' => 'Profit Lab Aula Virtual API', 'status' => 'ok']);
  }

  // ============ AUTH ============
  if ($seg[0] === 'auth') {
    // POST /auth/signup
    if (($seg[1] ?? '') === 'signup' && $method === 'POST') {
      $b = body();
      $name = trim($b['name'] ?? '');
      $email = strtolower(trim($b['email'] ?? ''));
      $password = (string)($b['password'] ?? '');
      if ($name === '' || $email === '' || $password === '') fail('Completa todos los campos');
      if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Email no válido');
      if (strlen($password) < 6) fail('La contraseña debe tener al menos 6 caracteres');

      $exists = db()->prepare('SELECT 1 FROM users WHERE email = ?');
      $exists->execute([$email]);
      if ($exists->fetchColumn()) fail('Ese email ya está registrado', 409);

      $id = uuid();
      $hash = password_hash($password, PASSWORD_DEFAULT);
      db()->prepare('INSERT INTO users (id, name, email, password_hash, role) VALUES (?,?,?,?,?)')
          ->execute([$id, $name, $email, $hash, 'student']);
      respond_with_token($id);
    }

    // POST /auth/login
    if (($seg[1] ?? '') === 'login' && $method === 'POST') {
      $b = body();
      $email = strtolower(trim($b['email'] ?? ''));
      $password = (string)($b['password'] ?? '');
      $s = db()->prepare('SELECT * FROM users WHERE email = ?');
      $s->execute([$email]);
      $u = $s->fetch();
      if (!$u || !password_verify($password, $u['password_hash'])) {
        fail('Email o contraseña incorrectos', 401);
      }
      respond_with_token($u['id']);
    }

    // GET /auth/me
    if (($seg[1] ?? '') === 'me' && $method === 'GET') {
      json_out(require_auth());
    }
    fail('Ruta de auth no encontrada', 404);
  }

  // ============ PROFILE ============
  if ($seg[0] === 'profile') {
    $u = require_auth();

    // PUT /profile/password  — cambiar contraseña
    if (($seg[1] ?? '') === 'password' && $method === 'PUT') {
      $b = body();
      $cur = (string)($b['current_password'] ?? '');
      $new = (string)($b['new_password'] ?? '');
      if (strlen($new) < 6) fail('La nueva contraseña debe tener al menos 6 caracteres');
      $s = db()->prepare('SELECT password_hash FROM users WHERE id = ?');
      $s->execute([$u['id']]);
      $hash = $s->fetchColumn();
      if (!$hash || !password_verify($cur, $hash)) fail('La contraseña actual es incorrecta', 403);
      db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?')
          ->execute([password_hash($new, PASSWORD_DEFAULT), $u['id']]);
      json_out(['ok' => true]);
    }

    // PUT /profile  — cambiar nombre
    if (count($seg) === 1 && $method === 'PUT') {
      $b = body();
      $name = trim($b['name'] ?? '');
      if ($name === '') fail('El nombre no puede estar vacío');
      db()->prepare('UPDATE users SET name = ? WHERE id = ?')->execute([$name, $u['id']]);
      json_out(['ok' => true]);
    }
    fail('Ruta de profile no encontrada', 404);
  }

  // ============ PURCHASES (perfil de compras) ============
  if ($seg[0] === 'purchases') {
    // GET /purchases/me
    if (($seg[1] ?? '') === 'me' && $method === 'GET') {
      $u = require_auth();
      $s = db()->prepare('SELECT * FROM purchases WHERE user_id = ? ORDER BY created_at DESC');
      $s->execute([$u['id']]);
      $rows = array_map(function ($r) { $r['amount'] = (float) $r['amount']; return $r; }, $s->fetchAll());
      json_out($rows);
    }
    // GET /purchases  (admin: todas)
    if (count($seg) === 1 && $method === 'GET') {
      require_admin();
      $rows = db()->query(
        'SELECT p.*, u.name AS user_name, u.email AS user_email
         FROM purchases p JOIN users u ON u.id = p.user_id
         ORDER BY p.created_at DESC')->fetchAll();
      foreach ($rows as &$r) { $r['amount'] = (float) $r['amount']; }
      json_out($rows);
    }
    fail('Ruta de purchases no encontrada', 404);
  }

  // ============ COURSES ============
  if ($seg[0] === 'courses') {
    // POST /courses/reorder
    if (($seg[1] ?? '') === 'reorder' && $method === 'POST') {
      require_admin();
      reorder_table('courses', body()['ids'] ?? []);
      json_out(['ok' => true]);
    }

    // Colección: /courses
    if (count($seg) === 1) {
      if ($method === 'GET') {
        $slug = $_GET['slug'] ?? null;
        $all  = ($_GET['all'] ?? '') === '1';
        $me = current_user();
        $isAdmin = $me && $me['role'] === 'admin';

        if ($slug !== null) {
          $s = db()->prepare('SELECT * FROM courses WHERE slug = ?');
          $s->execute([$slug]);
          $c = $s->fetch();
          if (!$c || ($c['status'] !== 'published' && !$isAdmin)) json_out(null);
          json_out(shape_course($c));
        }

        if ($all && $isAdmin) {
          $rows = db()->query('SELECT * FROM courses ORDER BY position ASC, created_at DESC')->fetchAll();
        } else {
          $rows = db()->query("SELECT * FROM courses WHERE status = 'published' ORDER BY position ASC, created_at DESC")->fetchAll();
        }
        json_out(array_map('shape_course', $rows));
      }
      if ($method === 'POST') {
        require_admin();
        $b = body();
        if (trim($b['title'] ?? '') === '') fail('El título es obligatorio');
        $id = uuid();
        $slug = slugify($b['slug'] ?? $b['title']) . '-' . substr(bin2hex(random_bytes(3)), 0, 4);
        db()->prepare('INSERT INTO courses
            (id,title,slug,subtitle,description,thumbnail_url,category,level,instructor,status,published_at,access_type,price,currency,position)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,0)')
          ->execute([
            $id, $b['title'], $slug, $b['subtitle'] ?? null, $b['description'] ?? null,
            $b['thumbnail_url'] ?? null, $b['category'] ?? 'General', $b['level'] ?? 'principiante',
            $b['instructor'] ?? 'Profit Lab', $b['status'] ?? 'draft', $b['published_at'] ?? null,
            $b['access_type'] ?? 'free', (float)($b['price'] ?? 0), $b['currency'] ?? 'USD',
          ]);
        json_out(shape_course(fetch_course($id)), 201);
      }
    }

    // Elemento: /courses/{id}[...]
    $id = $seg[1] ?? '';
    $sub = $seg[2] ?? '';

    // /courses/{id}/curriculum
    if ($sub === 'curriculum' && $method === 'GET') {
      $course = fetch_course($id);
      if (!$course) fail('Curso no encontrado', 404);
      $me = current_user();
      $isAdmin = $me && $me['role'] === 'admin';
      $authorized = $isAdmin || ($me && is_enrolled($me['id'], $id));

      $mods = db()->prepare('SELECT * FROM modules WHERE course_id = ? ORDER BY position ASC');
      $mods->execute([$id]);
      $modules = $mods->fetchAll();

      $les = db()->prepare('SELECT * FROM lessons WHERE course_id = ? ORDER BY position ASC');
      $les->execute([$id]);
      $lessons = $les->fetchAll();

      $byModule = [];
      foreach ($lessons as $l) {
        $byModule[$l['module_id']][] = shape_lesson($l, $authorized);
      }
      foreach ($modules as &$m) {
        $m['position'] = (int) $m['position'];
        $m['lessons'] = $byModule[$m['id']] ?? [];
      }
      json_out($modules);
    }

    // /courses/{id}/enrollments  (admin)
    if ($sub === 'enrollments') {
      if ($method === 'GET') {
        require_admin();
        $s = db()->prepare(
          'SELECT e.*, u.name AS u_name, u.email AS u_email, u.avatar_url AS u_avatar
           FROM enrollments e JOIN users u ON u.id = e.user_id
           WHERE e.course_id = ? ORDER BY e.enrolled_at DESC');
        $s->execute([$id]);
        $out = array_map(function ($r) {
          return [
            'id' => $r['id'], 'user_id' => $r['user_id'], 'course_id' => $r['course_id'],
            'status' => $r['status'], 'enrolled_at' => $r['enrolled_at'], 'completed_at' => $r['completed_at'],
            'profile' => ['id' => $r['user_id'], 'name' => $r['u_name'], 'email' => $r['u_email'], 'avatar_url' => $r['u_avatar']],
          ];
        }, $s->fetchAll());
        json_out($out);
      }
      if ($method === 'POST') {
        require_admin();
        $userId = body()['user_id'] ?? '';
        if ($userId === '') fail('user_id requerido');
        upsert_enrollment($userId, $id);
        json_out(['ok' => true], 201);
      }
    }

    // /courses/{id}  GET / PUT / DELETE
    if (count($seg) === 2) {
      if ($method === 'GET') {
        $c = fetch_course($id);
        $me = current_user();
        $isAdmin = $me && $me['role'] === 'admin';
        if (!$c || ($c['status'] !== 'published' && !$isAdmin)) json_out(null);
        json_out(shape_course($c));
      }
      if ($method === 'PUT') {
        require_admin();
        $b = body();
        $allowed = ['title','subtitle','description','thumbnail_url','category','level','instructor','status','published_at','access_type','price','currency'];
        $sets = []; $vals = [];
        foreach ($allowed as $k) {
          if (array_key_exists($k, $b)) { $sets[] = "$k = ?"; $vals[] = $b[$k]; }
        }
        if ($sets) {
          $vals[] = $id;
          db()->prepare('UPDATE courses SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($vals);
        }
        json_out(shape_course(fetch_course($id)));
      }
      if ($method === 'DELETE') {
        require_admin();
        db()->prepare('DELETE FROM courses WHERE id = ?')->execute([$id]);
        json_out(['ok' => true]);
      }
    }
    fail('Ruta de courses no encontrada', 404);
  }

  // ============ MODULES ============
  if ($seg[0] === 'modules') {
    if (($seg[1] ?? '') === 'reorder' && $method === 'POST') {
      require_admin();
      reorder_table('modules', body()['ids'] ?? []);
      json_out(['ok' => true]);
    }
    if (count($seg) === 1 && $method === 'POST') {
      require_admin();
      $b = body();
      if (empty($b['course_id']) || trim($b['title'] ?? '') === '') fail('course_id y title requeridos');
      $id = uuid();
      db()->prepare('INSERT INTO modules (id, course_id, title, position) VALUES (?,?,?,?)')
          ->execute([$id, $b['course_id'], $b['title'], (int)($b['position'] ?? 0)]);
      json_out(['id' => $id], 201);
    }
    $id = $seg[1] ?? '';
    if (count($seg) === 2 && $method === 'PUT') {
      require_admin();
      $b = body();
      if (isset($b['title'])) db()->prepare('UPDATE modules SET title = ? WHERE id = ?')->execute([$b['title'], $id]);
      json_out(['ok' => true]);
    }
    if (count($seg) === 2 && $method === 'DELETE') {
      require_admin();
      db()->prepare('DELETE FROM modules WHERE id = ?')->execute([$id]);
      json_out(['ok' => true]);
    }
    fail('Ruta de modules no encontrada', 404);
  }

  // ============ LESSONS ============
  if ($seg[0] === 'lessons') {
    // GET /lessons/{id}/materials  (admin / inscrito / muestra)
    if (($seg[2] ?? '') === 'materials' && $method === 'GET') {
      $lessonId = $seg[1];
      $ls = db()->prepare('SELECT course_id, is_preview FROM lessons WHERE id = ?');
      $ls->execute([$lessonId]);
      $lrow = $ls->fetch();
      if (!$lrow) fail('Clase no encontrada', 404);
      $me = current_user();
      $isAdmin = $me && $me['role'] === 'admin';
      $authorized = $isAdmin || $lrow['is_preview'] || ($me && is_enrolled($me['id'], $lrow['course_id']));
      if (!$authorized) fail('No autorizado', 403);
      $s = db()->prepare('SELECT * FROM materials WHERE lesson_id = ? ORDER BY position ASC, created_at ASC');
      $s->execute([$lessonId]);
      $rows = array_map(function ($r) {
        $r['size'] = $r['size'] !== null ? (int) $r['size'] : null;
        $r['position'] = (int) $r['position'];
        return $r;
      }, $s->fetchAll());
      json_out($rows);
    }

    if (($seg[1] ?? '') === 'reorder' && $method === 'POST') {
      require_admin();
      reorder_table('lessons', body()['ids'] ?? []);
      json_out(['ok' => true]);
    }
    if (count($seg) === 1 && $method === 'POST') {
      require_admin();
      $b = body();
      foreach (['module_id','course_id','title','youtube_id'] as $req) {
        if (empty($b[$req])) fail("$req requerido");
      }
      $id = uuid();
      db()->prepare('INSERT INTO lessons
          (id,module_id,course_id,title,description,youtube_id,duration,position,is_preview,release_type,release_at,drip_days,resources)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
        ->execute([
          $id, $b['module_id'], $b['course_id'], $b['title'], $b['description'] ?? null,
          $b['youtube_id'], $b['duration'] ?? null, (int)($b['position'] ?? 0),
          !empty($b['is_preview']) ? 1 : 0, $b['release_type'] ?? 'immediate',
          $b['release_at'] ?? null, isset($b['drip_days']) ? (int)$b['drip_days'] : null,
          $b['resources'] ?? null,
        ]);
      json_out(['id' => $id], 201);
    }
    $id = $seg[1] ?? '';
    if (count($seg) === 2 && $method === 'PUT') {
      require_admin();
      $b = body();
      $allowed = ['title','description','youtube_id','duration','is_preview','release_type','release_at','drip_days','resources','position','module_id'];
      $sets = []; $vals = [];
      foreach ($allowed as $k) {
        if (array_key_exists($k, $b)) {
          $sets[] = "$k = ?";
          $vals[] = ($k === 'is_preview') ? (!empty($b[$k]) ? 1 : 0) : $b[$k];
        }
      }
      if ($sets) { $vals[] = $id; db()->prepare('UPDATE lessons SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($vals); }
      json_out(['ok' => true]);
    }
    if (count($seg) === 2 && $method === 'DELETE') {
      require_admin();
      db()->prepare('DELETE FROM lessons WHERE id = ?')->execute([$id]);
      json_out(['ok' => true]);
    }
    fail('Ruta de lessons no encontrada', 404);
  }

  // ============ ENROLL (self) ============
  if ($seg[0] === 'enroll') {
    $u = require_auth();
    if (count($seg) === 1 && $method === 'POST') {
      $courseId = body()['course_id'] ?? '';
      $c = fetch_course($courseId);
      if (!$c) fail('Curso no encontrado', 404);
      if ($c['status'] !== 'published') fail('El curso aún no está disponible');
      if ($c['access_type'] !== 'free') fail('Este curso requiere inscripción por un administrador', 403);
      upsert_enrollment($u['id'], $courseId);
      json_out(['ok' => true], 201);
    }
    if (count($seg) === 2 && $method === 'DELETE') {
      db()->prepare('DELETE FROM enrollments WHERE user_id = ? AND course_id = ?')->execute([$u['id'], $seg[1]]);
      json_out(['ok' => true]);
    }
    fail('Ruta de enroll no encontrada', 404);
  }

  // ============ ENROLLMENTS ============
  if ($seg[0] === 'enrollments') {
    // GET /enrollments/me
    if (($seg[1] ?? '') === 'me' && $method === 'GET') {
      $u = require_auth();
      $out = [];
      $s2 = db()->prepare(
        'SELECT e.id AS e_id, e.status AS e_status, e.enrolled_at, e.completed_at, e.course_id
         FROM enrollments e WHERE e.user_id = ? ORDER BY e.enrolled_at DESC');
      $s2->execute([$u['id']]);
      foreach ($s2->fetchAll() as $e) {
        $course = fetch_course($e['course_id']);
        $out[] = [
          'id' => $e['e_id'], 'user_id' => $u['id'], 'course_id' => $e['course_id'],
          'status' => $e['e_status'], 'enrolled_at' => $e['enrolled_at'], 'completed_at' => $e['completed_at'],
          'course' => $course ? shape_course($course) : null,
        ];
      }
      json_out($out);
    }
    // DELETE /enrollments/{id}  (admin)
    if (count($seg) === 2 && $method === 'DELETE') {
      require_admin();
      db()->prepare('DELETE FROM enrollments WHERE id = ?')->execute([$seg[1]]);
      json_out(['ok' => true]);
    }
    fail('Ruta de enrollments no encontrada', 404);
  }

  // ============ MY-ENROLLMENT ============
  if ($seg[0] === 'my-enrollment' && $method === 'GET') {
    $u = require_auth();
    $courseId = $seg[1] ?? '';
    $s = db()->prepare('SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?');
    $s->execute([$u['id'], $courseId]);
    $e = $s->fetch();
    json_out($e ?: null);
  }

  // ============ PROGRESS ============
  if ($seg[0] === 'progress') {
    $u = require_auth();
    if (count($seg) === 2 && $method === 'GET') {
      $s = db()->prepare('SELECT lesson_id, completed FROM lesson_progress WHERE user_id = ? AND course_id = ?');
      $s->execute([$u['id'], $seg[1]]);
      $map = [];
      foreach ($s->fetchAll() as $r) $map[$r['lesson_id']] = (bool)$r['completed'];
      json_out($map);
    }
    if (count($seg) === 1 && $method === 'POST') {
      $b = body();
      foreach (['course_id','lesson_id'] as $req) if (empty($b[$req])) fail("$req requerido");
      $completed = !empty($b['completed']) ? 1 : 0;
      $s = db()->prepare('SELECT id FROM lesson_progress WHERE user_id = ? AND lesson_id = ?');
      $s->execute([$u['id'], $b['lesson_id']]);
      $existing = $s->fetchColumn();
      if ($existing) {
        db()->prepare('UPDATE lesson_progress SET completed = ?, completed_at = ? WHERE id = ?')
            ->execute([$completed, $completed ? date('Y-m-d H:i:s') : null, $existing]);
      } else {
        db()->prepare('INSERT INTO lesson_progress (id,user_id,lesson_id,course_id,completed,completed_at) VALUES (?,?,?,?,?,?)')
            ->execute([uuid(), $u['id'], $b['lesson_id'], $b['course_id'], $completed, $completed ? date('Y-m-d H:i:s') : null]);
      }
      json_out(['ok' => true]);
    }
    fail('Ruta de progress no encontrada', 404);
  }

  // ============ USERS (admin) ============
  if ($seg[0] === 'users') {
    require_admin();
    if (count($seg) === 1 && $method === 'GET') {
      $rows = db()->query('SELECT id,name,email,role,avatar_url,created_at,updated_at FROM users ORDER BY created_at DESC')->fetchAll();
      $counts = [];
      foreach (db()->query('SELECT user_id, COUNT(*) c FROM enrollments GROUP BY user_id')->fetchAll() as $r) {
        $counts[$r['user_id']] = (int)$r['c'];
      }
      foreach ($rows as &$r) $r['enrollments'] = $counts[$r['id']] ?? 0;
      json_out($rows);
    }
    // PUT /users/{id}/role
    if (count($seg) === 3 && $seg[2] === 'role' && $method === 'PUT') {
      $role = body()['role'] ?? '';
      if (!in_array($role, ['admin','student'], true)) fail('Rol no válido');
      db()->prepare('UPDATE users SET role = ? WHERE id = ?')->execute([$role, $seg[1]]);
      json_out(['ok' => true]);
    }
    fail('Ruta de users no encontrada', 404);
  }

  // ============ UPLOAD de archivos (admin) ============
  if ($seg[0] === 'upload' && $method === 'POST') {
    require_admin();
    if (empty($_FILES['file'])) fail('No se recibió ningún archivo');
    $f = $_FILES['file'];
    if ($f['error'] !== UPLOAD_ERR_OK) fail('Error al subir el archivo (código ' . $f['error'] . ')');
    if ($f['size'] > 50 * 1024 * 1024) fail('El archivo supera el límite de 50 MB', 413);
    $ext = strtolower(pathinfo($f['name'], PATHINFO_EXTENSION));
    $allowed = ['pdf','doc','docx','xls','xlsx','ppt','pptx','txt','csv','zip','rar',
                'png','jpg','jpeg','gif','webp','svg','mp4','webm','mov','mp3','wav'];
    if (!in_array($ext, $allowed, true)) fail('Tipo de archivo no permitido: .' . $ext, 415);

    $dir = __DIR__ . '/../uploads';
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    // Protección: impedir ejecución de scripts en /uploads
    $ht = "$dir/.htaccess";
    if (!file_exists($ht)) {
      @file_put_contents($ht,
        "php_flag engine off\nRemoveHandler .php .phtml .phar\n" .
        "<FilesMatch \"\\.(php|phtml|phar|cgi|pl|py)$\">\n  Require all denied\n</FilesMatch>\n");
    }
    $fname = bin2hex(random_bytes(8)) . '.' . $ext;
    if (!move_uploaded_file($f['tmp_name'], "$dir/$fname")) fail('No se pudo guardar el archivo', 500);

    $uriPath = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $pos = strpos($uriPath, '/api');
    $appBase = $pos !== false ? substr($uriPath, 0, $pos) : '';
    json_out([
      'url'  => $appBase . '/uploads/' . $fname,
      'name' => $f['name'],
      'mime' => $f['type'] ?: null,
      'size' => (int) $f['size'],
    ]);
  }

  // ============ MATERIALS (admin: crear/borrar) ============
  if ($seg[0] === 'materials') {
    if (count($seg) === 1 && $method === 'POST') {
      require_admin();
      $b = body();
      foreach (['lesson_id','course_id','title','url'] as $req) if (empty($b[$req])) fail("$req requerido");
      $kind = in_array(($b['kind'] ?? ''), ['file','link'], true) ? $b['kind'] : 'link';
      $id = uuid();
      db()->prepare('INSERT INTO materials (id,lesson_id,course_id,kind,title,url,mime,size,position) VALUES (?,?,?,?,?,?,?,?,?)')
          ->execute([$id, $b['lesson_id'], $b['course_id'], $kind, $b['title'], $b['url'],
                     $b['mime'] ?? null, isset($b['size']) ? (int) $b['size'] : null, (int) ($b['position'] ?? 0)]);
      json_out(['id' => $id], 201);
    }
    if (count($seg) === 2 && $method === 'DELETE') {
      require_admin();
      db()->prepare('DELETE FROM materials WHERE id = ?')->execute([$seg[1]]);
      json_out(['ok' => true]);
    }
    fail('Ruta de materials no encontrada', 404);
  }

  // ============ STATS (admin) ============
  if ($seg[0] === 'stats' && $method === 'GET') {
    require_admin();
    $courses = (int) db()->query('SELECT COUNT(*) FROM courses')->fetchColumn();
    $published = (int) db()->query("SELECT COUNT(*) FROM courses WHERE status='published'")->fetchColumn();
    $students = (int) db()->query("SELECT COUNT(*) FROM users WHERE role='student'")->fetchColumn();
    $enrollments = (int) db()->query('SELECT COUNT(*) FROM enrollments')->fetchColumn();
    json_out([
      'courses' => $courses, 'published' => $published,
      'drafts' => $courses - $published, 'students' => $students, 'enrollments' => $enrollments,
    ]);
  }

  fail('Ruta no encontrada', 404);
} catch (Throwable $e) {
  fail('Error del servidor', 500);
}

// ------------------------------------------------------------
// Funciones auxiliares que usan el contexto anterior
// ------------------------------------------------------------
function respond_with_token(string $userId): void {
  $c = config();
  $token = jwt_encode(['sub' => $userId], $c['jwt_secret'], $c['jwt_ttl']);
  $s = db()->prepare('SELECT id,name,email,role,avatar_url,created_at,updated_at FROM users WHERE id = ?');
  $s->execute([$userId]);
  json_out(['token' => $token, 'profile' => $s->fetch()]);
}

function upsert_enrollment(string $userId, string $courseId): void {
  $s = db()->prepare('SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?');
  $s->execute([$userId, $courseId]);
  if (!$s->fetchColumn()) {
    db()->prepare('INSERT INTO enrollments (id, user_id, course_id) VALUES (?,?,?)')
        ->execute([uuid(), $userId, $courseId]);
    // Registrar la compra (snapshot del precio en el momento)
    $c = fetch_course($courseId);
    if ($c) {
      db()->prepare('INSERT INTO purchases (id,user_id,course_id,course_title,amount,currency,status) VALUES (?,?,?,?,?,?,?)')
          ->execute([uuid(), $userId, $courseId, $c['title'], (float)($c['price'] ?? 0), $c['currency'] ?? 'USD', 'completed']);
    }
  }
}
