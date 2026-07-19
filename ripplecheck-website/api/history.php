<?php

declare(strict_types=1);

require_once __DIR__ . '/../env.php';
require_once __DIR__ . '/../app_token.php';

header('Content-Type: application/json');

// Same bearer-token auth as api/me.php — see that file for the header-name
// fallback rationale.
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');

if (!preg_match('/^Bearer\s+(.+)$/i', $authHeader, $matches)) {
    http_response_code(401);
    echo json_encode(['error' => 'Missing bearer token']);
    exit;
}

$claims = verifyAppToken($matches[1]);

if ($claims === null) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid or expired token']);
    exit;
}

// Scan history isn't persisted yet (no `scans` table exists) — once
// scan-saving ships, replace this with a query scoped to $claims['uid'].
echo json_encode(['scans' => []]);
