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
    json_out(['name' => 'Profit Lab Aula Virtual API', 'status' => 'ok',
              'version' => 'v15-tareas', 'features' => ['assignments', 'submissions']]);
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

        // Subconsulta para el nº de alumnos inscritos por curso (evita N+1).
        $withStudents = '(SELECT COUNT(*) FROM enrollments e WHERE e.course_id = courses.id) AS students';

        if ($slug !== null) {
          $s = db()->prepare("SELECT *, $withStudents FROM courses WHERE slug = ?");
          $s->execute([$slug]);
          $c = $s->fetch();
          if (!$c || ($c['status'] !== 'published' && !$isAdmin)) json_out(null);
          json_out(shape_course($c));
        }

        if ($all && $isAdmin) {
          $rows = db()->query("SELECT *, $withStudents FROM courses ORDER BY position ASC, created_at DESC")->fetchAll();
        } else {
          $rows = db()->query("SELECT *, $withStudents FROM courses WHERE status = 'published' ORDER BY position ASC, created_at DESC")->fetchAll();
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

    // /courses/{id}/stats  (público: nº de alumnos)
    if ($sub === 'stats' && $method === 'GET') {
      $st = db()->prepare('SELECT COUNT(*) FROM enrollments WHERE course_id = ?');
      $st->execute([$id]);
      json_out(['students' => (int) $st->fetchColumn()]);
    }

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
      $provider = ($b['video_provider'] ?? 'youtube') === 'drive' ? 'drive' : 'youtube';
      db()->prepare('INSERT INTO lessons
          (id,module_id,course_id,title,description,youtube_id,video_provider,duration,position,is_preview,release_type,release_at,drip_days,resources)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
        ->execute([
          $id, $b['module_id'], $b['course_id'], $b['title'], $b['description'] ?? null,
          $b['youtube_id'], $provider, $b['duration'] ?? null, (int)($b['position'] ?? 0),
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
      $allowed = ['title','description','youtube_id','video_provider','duration','is_preview','release_type','release_at','drip_days','resources','position','module_id'];
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
    // PUT /users/{id}/password  — restablecer contraseña (admin da una clave temporal)
    if (count($seg) === 3 && $seg[2] === 'password' && $method === 'PUT') {
      $new = (string)(body()['new_password'] ?? '');
      if (strlen($new) < 6) fail('La contraseña debe tener al menos 6 caracteres');
      $exists = db()->prepare('SELECT 1 FROM users WHERE id = ?');
      $exists->execute([$seg[1]]);
      if (!$exists->fetchColumn()) fail('Usuario no encontrado', 404);
      db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?')
          ->execute([password_hash($new, PASSWORD_DEFAULT), $seg[1]]);
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

  // ============ TAREAS (assignments) ============
  if ($seg[0] === 'assignments') {
    if (count($seg) === 1) {
      // GET /assignments?course_id=  → tareas del curso (admin o alumno inscrito)
      if ($method === 'GET') {
        $courseId = $_GET['course_id'] ?? '';
        if ($courseId === '') fail('course_id requerido');
        $me = current_user();
        $isAdmin = $me && $me['role'] === 'admin';
        if (!$isAdmin && !($me && is_enrolled($me['id'], $courseId))) fail('No autorizado', 403);
        $s = db()->prepare('SELECT * FROM assignments WHERE course_id = ? ORDER BY position ASC, created_at ASC');
        $s->execute([$courseId]);
        json_out($s->fetchAll());
      }
      // POST /assignments  (admin)
      if ($method === 'POST') {
        require_admin();
        $b = body();
        foreach (['course_id','title'] as $req) if (empty($b[$req])) fail("$req requerido");
        $id = uuid();
        db()->prepare('INSERT INTO assignments (id,course_id,title,description,due_date,position) VALUES (?,?,?,?,?,?)')
            ->execute([$id, $b['course_id'], $b['title'], $b['description'] ?? null,
                       !empty($b['due_date']) ? $b['due_date'] : null, (int)($b['position'] ?? 0)]);
        json_out(['id' => $id], 201);
      }
    }

    $aid = $seg[1] ?? '';
    $sub = $seg[2] ?? '';

    // PUT /assignments/{id}  (admin)
    if (count($seg) === 2 && $method === 'PUT') {
      require_admin();
      $b = body();
      $sets = []; $vals = [];
      foreach (['title','description','due_date','position'] as $k) {
        if (array_key_exists($k, $b)) { $sets[] = "$k = ?"; $vals[] = ($k === 'due_date' && empty($b[$k])) ? null : $b[$k]; }
      }
      if ($sets) { $vals[] = $aid; db()->prepare('UPDATE assignments SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($vals); }
      json_out(['ok' => true]);
    }
    // DELETE /assignments/{id}  (admin)
    if (count($seg) === 2 && $method === 'DELETE') {
      require_admin();
      db()->prepare('DELETE FROM assignments WHERE id = ?')->execute([$aid]);
      json_out(['ok' => true]);
    }

    // Cargar la tarea para los sub-endpoints
    $aStmt = db()->prepare('SELECT * FROM assignments WHERE id = ?');
    $aStmt->execute([$aid]);
    $assignment = $aStmt->fetch();
    if (!$assignment) fail('Tarea no encontrada', 404);
    $courseId = $assignment['course_id'];

    // GET /assignments/{id}/submissions  (admin) → todas las entregas + archivos
    if ($sub === 'submissions' && $method === 'GET') {
      require_admin();
      $s = db()->prepare('SELECT s.*, u.name AS user_name, u.email AS user_email
                          FROM submissions s JOIN users u ON u.id = s.user_id
                          WHERE s.assignment_id = ? ORDER BY s.updated_at DESC, s.created_at DESC');
      $s->execute([$aid]);
      $subs = $s->fetchAll();
      foreach ($subs as &$row) {
        $fs = db()->prepare('SELECT * FROM submission_files WHERE submission_id = ? ORDER BY created_at ASC');
        $fs->execute([$row['id']]);
        $row['files'] = $fs->fetchAll();
      }
      json_out($subs);
    }

    // GET /assignments/{id}/my-submission  (alumno) → su entrega o null
    if ($sub === 'my-submission' && $method === 'GET') {
      $u = require_auth();
      $s = db()->prepare('SELECT * FROM submissions WHERE assignment_id = ? AND user_id = ?');
      $s->execute([$aid, $u['id']]);
      $mine = $s->fetch();
      if (!$mine) json_out(null);
      $fs = db()->prepare('SELECT * FROM submission_files WHERE submission_id = ? ORDER BY created_at ASC');
      $fs->execute([$mine['id']]);
      $mine['files'] = $fs->fetchAll();
      json_out($mine);
    }

    // POST /assignments/{id}/upload  (alumno inscrito) → sube UN archivo, devuelve {url,...}
    if ($sub === 'upload' && $method === 'POST') {
      $u = require_auth();
      if ($u['role'] !== 'admin' && !is_enrolled($u['id'], $courseId)) fail('Debes estar inscrito en el curso', 403);
      if (empty($_FILES['file'])) fail('No se recibió ningún archivo');
      $f = $_FILES['file'];
      if ($f['error'] !== UPLOAD_ERR_OK) fail('Error al subir el archivo (código ' . $f['error'] . ')');
      if ($f['size'] > 50 * 1024 * 1024) fail('El archivo supera el límite de 50 MB', 413);
      $ext = strtolower(pathinfo($f['name'], PATHINFO_EXTENSION));
      $allowed = ['pdf','doc','docx','xls','xlsx','ppt','pptx','txt','csv','zip','rar',
                  'png','jpg','jpeg','gif','webp','mp4','mp3','wav'];
      if (!in_array($ext, $allowed, true)) fail('Tipo de archivo no permitido: .' . $ext, 415);
      $dir = __DIR__ . '/../uploads';
      if (!is_dir($dir)) @mkdir($dir, 0755, true);
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
      json_out(['url' => $appBase . '/uploads/' . $fname, 'name' => $f['name'],
                'mime' => $f['type'] ?: null, 'size' => (int) $f['size']]);
    }

    // POST /assignments/{id}/submit  (alumno inscrito) → crea/actualiza su entrega
    if ($sub === 'submit' && $method === 'POST') {
      $u = require_auth();
      if ($u['role'] !== 'admin' && !is_enrolled($u['id'], $courseId)) fail('Debes estar inscrito en el curso', 403);
      $b = body();
      $files = is_array($b['files'] ?? null) ? $b['files'] : [];
      $ex = db()->prepare('SELECT id FROM submissions WHERE assignment_id = ? AND user_id = ?');
      $ex->execute([$aid, $u['id']]);
      $sid = $ex->fetchColumn();
      if ($sid) {
        db()->prepare('UPDATE submissions SET comment = ?, status = ?, updated_at = ? WHERE id = ?')
            ->execute([$b['comment'] ?? null, 'entregada', date('Y-m-d H:i:s'), $sid]);
      } else {
        $sid = uuid();
        db()->prepare('INSERT INTO submissions (id,assignment_id,user_id,comment,status) VALUES (?,?,?,?,?)')
            ->execute([$sid, $aid, $u['id'], $b['comment'] ?? null, 'entregada']);
      }
      db()->prepare('DELETE FROM submission_files WHERE submission_id = ?')->execute([$sid]);
      $ins = db()->prepare('INSERT INTO submission_files (id,submission_id,title,url,mime,size) VALUES (?,?,?,?,?,?)');
      foreach ($files as $ff) {
        if (empty($ff['url'])) continue;
        $ins->execute([uuid(), $sid, $ff['title'] ?? 'archivo', $ff['url'],
                       $ff['mime'] ?? null, isset($ff['size']) ? (int) $ff['size'] : null]);
      }
      json_out(['id' => $sid], 201);
    }

    fail('Ruta de assignments no encontrada', 404);
  }

  // ============ SUBMISSIONS (calificar · admin) ============
  if ($seg[0] === 'submissions') {
    // PUT /submissions/{id}  (admin) → status / grade / feedback
    if (count($seg) === 2 && $method === 'PUT') {
      require_admin();
      $b = body();
      $sets = []; $vals = [];
      foreach (['status','grade','feedback'] as $k) {
        if (array_key_exists($k, $b)) { $sets[] = "$k = ?"; $vals[] = $b[$k]; }
      }
      if ($sets) { $vals[] = $seg[1]; db()->prepare('UPDATE submissions SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($vals); }
      json_out(['ok' => true]);
    }
    fail('Ruta de submissions no encontrada', 404);
  }

  // ============ QUANT · acceso a "Mercados" (gamma/beta) ============
  if ($seg[0] === 'quant') {
    $cfg = config();
    $qPrice = (float) ($cfg['quant_price'] ?? 0);
    $qCurrency = $cfg['quant_currency'] ?? ($cfg['mp_currency'] ?? 'PEN');
    $qDays = (int) ($cfg['quant_access_days'] ?? 30); // 0 = vitalicio al comprar

    // GET /quant/me → estado de acceso del usuario autenticado
    if (($seg[1] ?? '') === 'me' && $method === 'GET') {
      $u = require_auth();
      $st = quant_state($u);
      json_out([
        'authenticated' => true,
        'user' => ['id' => $u['id'], 'name' => $u['name'], 'email' => $u['email'], 'role' => $u['role']],
        'has_access' => $st['has_access'],
        'access_until' => $st['access_until'],
        'lifetime' => $st['lifetime'],
        'price' => $qPrice,
        'currency' => $qCurrency,
        'days' => $qDays,
      ]);
    }

    // POST /quant/redeem {code} → canjear cupón
    if (($seg[1] ?? '') === 'redeem' && $method === 'POST') {
      $u = require_auth();
      $code = strtoupper(trim((string) (body()['code'] ?? '')));
      if ($code === '') fail('Ingresa un cupón');
      $c = db()->prepare('SELECT * FROM quant_coupons WHERE code = ?');
      $c->execute([$code]);
      $coupon = $c->fetch();
      if (!$coupon || !(int) $coupon['active']) fail('Cupón inválido');
      if (!empty($coupon['expires_at']) && strtotime($coupon['expires_at']) < time()) fail('Cupón expirado');
      if ((int) $coupon['max_uses'] > 0 && (int) $coupon['uses'] >= (int) $coupon['max_uses']) fail('Cupón agotado');
      $used = db()->prepare('SELECT 1 FROM quant_coupon_uses WHERE coupon_id = ? AND user_id = ?');
      $used->execute([$coupon['id'], $u['id']]);
      if ($used->fetchColumn()) fail('Ya canjeaste este cupón');

      grant_quant_access($u['id'], (int) $coupon['days'], 'coupon');
      db()->prepare('INSERT INTO quant_coupon_uses (id,coupon_id,user_id) VALUES (?,?,?)')->execute([uuid(), $coupon['id'], $u['id']]);
      db()->prepare('UPDATE quant_coupons SET uses = uses + 1 WHERE id = ?')->execute([$coupon['id']]);
      $st = quant_state($u);
      json_out(['ok' => true, 'has_access' => $st['has_access'], 'access_until' => $st['access_until'], 'lifetime' => $st['lifetime']]);
    }

    // POST /quant/checkout → preferencia de pago (Mercado Pago)
    if (($seg[1] ?? '') === 'checkout' && $method === 'POST') {
      $u = require_auth();
      $token = $cfg['mp_access_token'] ?? '';
      if ($token === '') fail('Pagos no configurados (falta el Access Token de Mercado Pago).', 503);
      if ($qPrice <= 0) fail('El precio del acceso no está configurado (quant_price en config.php).', 503);
      $st = quant_state($u);
      if ($st['has_access']) fail('Ya tienes acceso al dashboard');
      $site = rtrim($cfg['site_url'] ?? '', '/');
      $pref = [
        'items' => [[
          'title'       => 'ProfitLab Quant — Acceso Mercados',
          'quantity'    => 1,
          'currency_id' => $qCurrency,
          'unit_price'  => $qPrice,
        ]],
        'payer' => ['email' => $u['email']],
        'external_reference' => $u['id'] . ':quant',
        'metadata' => ['user_id' => $u['id'], 'kind' => 'quant'],
        'back_urls' => [
          'success' => $site . '/mercados/?pago=ok',
          'failure' => $site . '/mercados/?pago=error',
          'pending' => $site . '/mercados/?pago=pendiente',
        ],
        'auto_return'      => 'approved',
        'notification_url' => $site . '/api/mp/webhook',
        'statement_descriptor' => 'PROFITLAB',
      ];
      [$code, $data] = mp_request('POST', 'https://api.mercadopago.com/checkout/preferences', $token, $pref);
      if ($code >= 200 && $code < 300 && !empty($data['init_point'])) {
        $sandbox = !empty($cfg['mp_sandbox']) || str_starts_with($token, 'TEST-');
        $link = $sandbox ? ($data['sandbox_init_point'] ?? $data['init_point']) : $data['init_point'];
        json_out(['init_point' => $link, 'id' => $data['id'] ?? null, 'sandbox' => $sandbox]);
      }
      $detail = $data['message'] ?? ($data['error'] ?? '');
      fail('No se pudo iniciar el pago' . ($detail ? ": $detail" : ''), 502);
    }

    // ----- Admin: cupones -----
    if (($seg[1] ?? '') === 'coupons') {
      if (count($seg) === 2 && $method === 'GET') {
        require_admin();
        json_out(db()->query('SELECT * FROM quant_coupons ORDER BY created_at DESC')->fetchAll());
      }
      if (count($seg) === 2 && $method === 'POST') {
        require_admin();
        $b = body();
        $code = strtoupper(trim((string) ($b['code'] ?? '')));
        if ($code === '') $code = 'QT' . strtoupper(bin2hex(random_bytes(3)));
        $exists = db()->prepare('SELECT 1 FROM quant_coupons WHERE code = ?');
        $exists->execute([$code]);
        if ($exists->fetchColumn()) fail('Ya existe un cupón con ese código', 409);
        $id = uuid();
        db()->prepare('INSERT INTO quant_coupons (id,code,days,max_uses,active,expires_at,note) VALUES (?,?,?,?,1,?,?)')
            ->execute([$id, $code, (int) ($b['days'] ?? 30), (int) ($b['max_uses'] ?? 0),
                       !empty($b['expires_at']) ? $b['expires_at'] : null, $b['note'] ?? null]);
        json_out(['id' => $id, 'code' => $code], 201);
      }
      if (count($seg) === 3 && $method === 'DELETE') {
        require_admin();
        db()->prepare('DELETE FROM quant_coupons WHERE id = ?')->execute([$seg[2]]);
        json_out(['ok' => true]);
      }
    }

    // POST /quant/grant {user_id,days}  (admin) → otorgar acceso manual
    if (($seg[1] ?? '') === 'grant' && $method === 'POST') {
      require_admin();
      $b = body();
      $uid = (string) ($b['user_id'] ?? '');
      if ($uid === '') fail('user_id requerido');
      $uq = db()->prepare('SELECT 1 FROM users WHERE id = ?');
      $uq->execute([$uid]);
      if (!$uq->fetchColumn()) fail('Usuario no encontrado', 404);
      grant_quant_access($uid, (int) ($b['days'] ?? 0), 'admin');
      json_out(['ok' => true]);
    }

    fail('Ruta de quant no encontrada', 404);
  }

  // ============ CHECKOUT · Mercado Pago ============
  // POST /checkout  → crea una preferencia y devuelve el enlace de pago
  if ($seg[0] === 'checkout' && count($seg) === 1 && $method === 'POST') {
    $u = require_auth();
    $cfg = config();
    $token = $cfg['mp_access_token'] ?? '';
    if ($token === '') fail('Pagos no configurados (falta el Access Token de Mercado Pago).', 503);

    $courseId = body()['course_id'] ?? '';
    $c = fetch_course($courseId);
    if (!$c) fail('Curso no encontrado', 404);
    if ($c['status'] !== 'published') fail('El curso no está disponible');
    if ((float) ($c['price'] ?? 0) <= 0) fail('Este curso es gratuito, inscríbete directamente');
    if (is_enrolled($u['id'], $courseId)) fail('Ya tienes acceso a este curso');

    $site = rtrim($cfg['site_url'] ?? '', '/');
    $pref = [
      'items' => [[
        'title'       => mb_substr($c['title'], 0, 250),
        'quantity'    => 1,
        'currency_id' => $cfg['mp_currency'] ?? 'PEN',
        'unit_price'  => (float) $c['price'],
      ]],
      'payer' => ['email' => $u['email']],
      'external_reference' => $u['id'] . ':' . $courseId,
      'metadata' => ['user_id' => $u['id'], 'course_id' => $courseId],
      'back_urls' => [
        'success' => $site . '/mis-cursos/?pago=ok',
        'failure' => $site . '/curso/?slug=' . rawurlencode($c['slug']) . '&pago=error',
        'pending' => $site . '/mis-cursos/?pago=pendiente',
      ],
      'auto_return'      => 'approved',
      'notification_url' => $site . '/api/mp/webhook',
      'statement_descriptor' => 'PROFITLAB',
    ];
    [$code, $data] = mp_request('POST', 'https://api.mercadopago.com/checkout/preferences', $token, $pref);
    if ($code >= 200 && $code < 300 && !empty($data['init_point'])) {
      // Modo prueba: con 'mp_sandbox' => true, o token antiguo TEST-, usa el
      // checkout de pruebas (no mueve dinero real).
      $sandbox = !empty($cfg['mp_sandbox']) || str_starts_with($token, 'TEST-');
      $link = $sandbox ? ($data['sandbox_init_point'] ?? $data['init_point']) : $data['init_point'];
      json_out(['init_point' => $link, 'id' => $data['id'] ?? null, 'sandbox' => $sandbox]);
    }
    // Propaga el mensaje real de Mercado Pago para diagnosticar más fácil
    $detail = $data['message'] ?? ($data['error'] ?? '');
    fail('No se pudo iniciar el pago con Mercado Pago' . ($detail ? ": $detail" : ''), 502);
  }

  // Confirmación/verificación de un pago (la usa la página de retorno y el webhook)
  if ($seg[0] === 'mp') {
    $cfg = config();
    $token = $cfg['mp_access_token'] ?? '';

    // POST /mp/verify {payment_id}  (auth) → verifica y da acceso al instante
    if (($seg[1] ?? '') === 'verify' && $method === 'POST') {
      $u = require_auth();
      if ($token === '') fail('Pagos no configurados', 503);
      $pid = body()['payment_id'] ?? '';
      if ($pid === '') fail('payment_id requerido');
      $ok = mp_settle_payment((string) $pid, $token);
      json_out(['ok' => $ok]);
    }

    // POST/GET /mp/webhook  → notificación server-to-server de Mercado Pago
    if (($seg[1] ?? '') === 'webhook') {
      if ($token !== '') {
        $pid = $_GET['data.id'] ?? $_GET['id'] ?? (body()['data']['id'] ?? null);
        $type = $_GET['type'] ?? $_GET['topic'] ?? (body()['type'] ?? '');
        if ($pid && ($type === 'payment' || $type === '')) {
          mp_settle_payment((string) $pid, $token);
        }
      }
      http_response_code(200);
      echo 'ok';
      exit;
    }
    fail('Ruta mp no encontrada', 404);
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

// ── Acceso al QUANT (Mercados) ──────────────────────────────────────────────
function quant_state(array $u): array {
  // Los administradores siempre tienen acceso.
  if (($u['role'] ?? '') === 'admin') {
    return ['has_access' => true, 'access_until' => null, 'lifetime' => true];
  }
  $s = db()->prepare('SELECT lifetime, access_until FROM quant_access WHERE user_id = ?');
  $s->execute([$u['id']]);
  $row = $s->fetch();
  if (!$row) return ['has_access' => false, 'access_until' => null, 'lifetime' => false];
  $life = (int) $row['lifetime'] === 1;
  $until = $row['access_until'] ?? null;
  $has = $life || ($until && strtotime($until) > time());
  return ['has_access' => $has, 'access_until' => $until, 'lifetime' => $life];
}

/** Otorga/extiende el acceso al quant. $days <= 0 → vitalicio. */
function grant_quant_access(string $userId, int $days, string $source): void {
  $cur = db()->prepare('SELECT lifetime, access_until FROM quant_access WHERE user_id = ?');
  $cur->execute([$userId]);
  $row = $cur->fetch();
  if ($row && (int) $row['lifetime'] === 1) return; // ya es vitalicio

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
    db()->prepare('UPDATE quant_access SET lifetime = ?, access_until = ?, source = ?, updated_at = ? WHERE user_id = ?')
        ->execute([$lifetime, $until, $source, date('Y-m-d H:i:s'), $userId]);
  } else {
    db()->prepare('INSERT INTO quant_access (user_id, lifetime, access_until, source) VALUES (?,?,?,?)')
        ->execute([$userId, $lifetime, $until, $source]);
  }
}

function upsert_enrollment(
  string $userId,
  string $courseId,
  string $provider = 'manual',
  ?string $reference = null,
  ?float $amount = null,
  ?string $currency = null
): void {
  // Idempotencia por referencia (ej. id de pago de Mercado Pago)
  if ($reference !== null) {
    $r = db()->prepare('SELECT 1 FROM purchases WHERE reference = ? LIMIT 1');
    $r->execute([$reference]);
    if ($r->fetchColumn()) {
      // Ya procesado: asegura la inscripción y termina.
      ensure_enrollment($userId, $courseId);
      return;
    }
  }
  ensure_enrollment($userId, $courseId);

  $c = fetch_course($courseId);
  db()->prepare('INSERT INTO purchases (id,user_id,course_id,course_title,amount,currency,status,provider,reference) VALUES (?,?,?,?,?,?,?,?,?)')
      ->execute([
        uuid(), $userId, $courseId, $c['title'] ?? 'Curso',
        $amount !== null ? $amount : (float) ($c['price'] ?? 0),
        $currency ?? ($c['currency'] ?? 'USD'),
        'completed', $provider, $reference,
      ]);
}

function ensure_enrollment(string $userId, string $courseId): void {
  $s = db()->prepare('SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?');
  $s->execute([$userId, $courseId]);
  if (!$s->fetchColumn()) {
    db()->prepare('INSERT INTO enrollments (id, user_id, course_id) VALUES (?,?,?)')
        ->execute([uuid(), $userId, $courseId]);
  }
}

/**
 * Verifica un pago en Mercado Pago y, si está aprobado, inscribe al alumno
 * y registra la compra (idempotente). Devuelve true si quedó inscrito.
 */
function mp_settle_payment(string $paymentId, string $token): bool {
  [$code, $p] = mp_request('GET', 'https://api.mercadopago.com/v1/payments/' . rawurlencode($paymentId), $token);
  if ($code < 200 || $code >= 300) return false;
  if (($p['status'] ?? '') !== 'approved') return false;

  $ref = (string) ($p['external_reference'] ?? '');
  $parts = explode(':', $ref);
  if (count($parts) !== 2) return false;
  [$userId, $courseId] = $parts;

  // Validar que el usuario existe
  $uq = db()->prepare('SELECT 1 FROM users WHERE id = ?');
  $uq->execute([$userId]);
  if (!$uq->fetchColumn()) return false;

  // Compra de acceso al QUANT (Mercados), no un curso.
  if ($courseId === 'quant') {
    $payRef = 'mp_' . $paymentId;
    $r = db()->prepare('SELECT 1 FROM purchases WHERE reference = ? LIMIT 1');
    $r->execute([$payRef]);
    if ($r->fetchColumn()) return true; // ya procesado (idempotente)
    $days = (int) (config()['quant_access_days'] ?? 30);
    grant_quant_access($userId, $days, 'mercadopago');
    db()->prepare('INSERT INTO purchases (id,user_id,course_id,course_title,amount,currency,status,provider,reference) VALUES (?,?,?,?,?,?,?,?,?)')
        ->execute([uuid(), $userId, null, 'ProfitLab Quant — Acceso Mercados',
                   (float) ($p['transaction_amount'] ?? 0), $p['currency_id'] ?? 'USD',
                   'completed', 'mercadopago', $payRef]);
    return true;
  }

  if (!fetch_course($courseId)) return false;

  upsert_enrollment(
    $userId, $courseId, 'mercadopago', 'mp_' . $paymentId,
    (float) ($p['transaction_amount'] ?? 0),
    $p['currency_id'] ?? null
  );
  return true;
}
