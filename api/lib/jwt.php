<?php
// JWT mínimo (HS256) en PHP puro — sin dependencias externas.

function base64url_encode(string $data): string {
  return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode(string $data): string {
  return base64_decode(strtr($data, '-_', '+/'));
}

function jwt_encode(array $payload, string $secret, int $ttl): string {
  $header = ['alg' => 'HS256', 'typ' => 'JWT'];
  $now = time();
  $payload['iat'] = $now;
  $payload['exp'] = $now + $ttl;

  $h = base64url_encode(json_encode($header));
  $p = base64url_encode(json_encode($payload));
  $signature = hash_hmac('sha256', "$h.$p", $secret, true);
  $s = base64url_encode($signature);
  return "$h.$p.$s";
}

function jwt_decode(string $token, string $secret): ?array {
  $parts = explode('.', $token);
  if (count($parts) !== 3) return null;
  [$h, $p, $s] = $parts;

  $expected = base64url_encode(hash_hmac('sha256', "$h.$p", $secret, true));
  if (!hash_equals($expected, $s)) return null;

  $payload = json_decode(base64url_decode($p), true);
  if (!is_array($payload)) return null;
  if (isset($payload['exp']) && time() >= $payload['exp']) return null;

  return $payload;
}
