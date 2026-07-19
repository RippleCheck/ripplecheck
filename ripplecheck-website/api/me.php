<?php

declare(strict_types=1);

require_once __DIR__ . '/../env.php';
require_once __DIR__ . '/../app_token.php';
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth/github/oauth_config.php'; // for logDebug()

header('Content-Type: application/json');

// Some hosts (and PHP's built-in dev server, under certain configs) don't
// forward the Authorization header into $_SERVER['HTTP_AUTHORIZATION'] —
// mod_php/CGI commonly expose it as REDIRECT_HTTP_AUTHORIZATION instead.
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

try {
    $pdo = getDbConnection();
    $statement = $pdo->prepare('SELECT username, avatar_url FROM users WHERE id = :id');
    $statement->execute(['id' => $claims['uid']]);
    $user = $statement->fetch();
} catch (Throwable $e) {
    // Same rationale as repos.php: a DB outage must return parseable JSON,
    // not an uncaught PDOException / blank 500.
    logDebug('me.php: DB error: ' . $e->getMessage());
    http_response_code(503);
    echo json_encode(['error' => 'db_unavailable']);
    exit;
}

if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'User not found']);
    exit;
}

echo json_encode([
    'username' => $user['username'],
    'avatar_url' => $user['avatar_url'],
]);
