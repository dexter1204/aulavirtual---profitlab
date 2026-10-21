<?php
// Conexión PDO a MySQL (singleton)

function config(): array {
  static $cfg = null;
  if ($cfg === null) {
    $path = __DIR__ . '/../config.php';
    if (!file_exists($path)) {
      http_response_code(500);
      header('Content-Type: application/json');
      echo json_encode(['error' => 'Falta config.php. Copia config.example.php y configúralo.']);
      exit;
    }
    $cfg = require $path;
  }
  return $cfg;
}

function db(): PDO {
  static $pdo = null;
  if ($pdo === null) {
    $c = config();
    $driver = $c['db_driver'] ?? 'mysql';
    try {
      if ($driver === 'sqlite') {
        // Solo para desarrollo/pruebas locales.
        $pdo = new PDO('sqlite:' . $c['db_path'], null, null, [
          PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
          PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        $pdo->exec('PRAGMA foreign_keys = ON');
        return $pdo;
      }
      $dsn = "mysql:host={$c['db_host']};dbname={$c['db_name']};charset={$c['db_charset']}";
      $pdo = new PDO($dsn, $c['db_user'], $c['db_pass'], [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
      ]);
    } catch (PDOException $e) {
      http_response_code(500);
      header('Content-Type: application/json');
      echo json_encode(['error' => 'No se pudo conectar a la base de datos']);
      exit;
    }
  }
  return $pdo;
}
