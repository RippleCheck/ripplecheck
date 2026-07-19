<?php

declare(strict_types=1);

require_once __DIR__ . '/../env.php';
require_once __DIR__ . '/../app_token.php';
require_once __DIR__ . '/../github_token.php';
require_once __DIR__ . '/../github_api.php';
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth/github/oauth_config.php'; // for logDebug()

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

try {
    $pdo = getDbConnection();
    $statement = $pdo->prepare('SELECT github_access_token_encrypted FROM users WHERE id = :id');
    $statement->execute(['id' => $claims['uid']]);
    $user = $statement->fetch();
} catch (Throwable $e) {
    // A DB outage must not surface as an uncaught PDOException — that either
    // leaks connection details in a stack trace (display_errors on) or sends
    // a bodyless 500 the app can only report as a generic network failure.
    // Return a parseable JSON error instead; the browser shows "try again".
    logDebug('repos.php: DB error: ' . $e->getMessage());
    http_response_code(503);
    echo json_encode(['error' => 'db_unavailable']);
    exit;
}

if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'User not found']);
    exit;
}

$encryptedToken = $user['github_access_token_encrypted'] ?? null;

if ($encryptedToken === null || $encryptedToken === '') {
    // Signed in, but no GitHub token was ever stored (e.g. the account
    // predates repo browsing). Logging in again stores one under the current
    // OAuth scope.
    http_response_code(401);
    echo json_encode(['error' => 'missing_token']);
    exit;
}

$githubToken = decryptGithubToken($encryptedToken);

if ($githubToken === null) {
    // A token is stored but can't be decrypted (encryption key rotated, or a
    // corrupt row). Re-login writes a fresh, decryptable token.
    logDebug('repos.php: stored GitHub token failed to decrypt');
    http_response_code(401);
    echo json_encode(['error' => 'reauth_required']);
    exit;
}

try {
    // visibility=public is belt-and-suspenders here — the public_repo OAuth
    // scope (see auth/github/login.php) already keeps private repos out of
    // reach, but this makes the "public repos only" intent explicit in the
    // request itself rather than relying solely on scope enforcement.
    [$status, $body] = githubApiRequest(
        'https://api.github.com/user/repos?visibility=public&sort=updated&direction=desc&per_page=30',
        $githubToken
    );
} catch (Throwable $e) {
    // The HTTP request itself failed (DNS, TLS, connect timeout) — there's no
    // upstream status to report, so status 0 signals "never reached GitHub".
    logDebug('repos.php: GitHub request threw: ' . $e->getMessage());
    http_response_code(502);
    echo json_encode(['error' => 'github_api_error', 'status' => 0]);
    exit;
}

if ($status === 401) {
    // GitHub itself rejected the token — expired or revoked. Re-login fixes it,
    // so surface it as reauth rather than a generic API error.
    logDebug('repos.php: GitHub returned 401 (token rejected)');
    http_response_code(401);
    echo json_encode(['error' => 'reauth_required']);
    exit;
}

if ($status !== 200 || !is_array($body)) {
    // Any other non-200 from GitHub — pass the real HTTP status through so the
    // app shows the actual cause (e.g. 403 rate limit, 5xx outage) instead of
    // a generic failure.
    logDebug('repos.php: GitHub returned status ' . $status);
    http_response_code(502);
    echo json_encode(['error' => 'github_api_error', 'status' => $status]);
    exit;
}

$repos = array_map(
    static fn (array $repo): array => [
        'name' => (string) ($repo['name'] ?? ''),
        'full_name' => (string) ($repo['full_name'] ?? ''),
        'private' => (bool) ($repo['private'] ?? false),
        'updated_at' => (string) ($repo['updated_at'] ?? ''),
    ],
    $body
);

echo json_encode(['repos' => $repos]);
