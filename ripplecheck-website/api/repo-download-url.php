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

$fullName = (string) ($_GET['full_name'] ?? '');

// owner/repo only — GitHub usernames/repo names are limited to
// alphanumerics, hyphens, underscores and dots.
if (!preg_match('#^[\w.-]+/[\w.-]+$#', $fullName)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid full_name']);
    exit;
}

try {
    $pdo = getDbConnection();
    $statement = $pdo->prepare('SELECT github_access_token_encrypted FROM users WHERE id = :id');
    $statement->execute(['id' => $claims['uid']]);
    $user = $statement->fetch();
} catch (Throwable $e) {
    // See repos.php: never let a DB outage escape as an uncaught PDOException
    // (leaks connection details / sends an unparseable 500). Clean JSON error.
    logDebug('repo-download-url.php: DB error: ' . $e->getMessage());
    http_response_code(503);
    echo json_encode(['error' => 'db_unavailable']);
    exit;
}

if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'User not found']);
    exit;
}

$githubToken = decryptGithubToken($user['github_access_token_encrypted']);

if ($githubToken === null) {
    http_response_code(401);
    echo json_encode(['error' => 'reauth_required']);
    exit;
}

try {
    // No ref specified — GitHub uses the repo's default branch. The
    // redirect target is a short-lived, pre-signed codeload.github.com
    // URL; the real GitHub token is never sent to the Electron client,
    // only this one-time-use download link.
    $downloadUrl = githubApiResolveRedirect("https://api.github.com/repos/{$fullName}/zipball", $githubToken);
} catch (Throwable $e) {
    logDebug('repo-download-url.php: GitHub request failed: ' . $e->getMessage());
    http_response_code(502);
    echo json_encode(['error' => 'github_request_failed']);
    exit;
}

if ($downloadUrl === null) {
    http_response_code(502);
    echo json_encode(['error' => 'github_request_failed']);
    exit;
}

// An EMPTY repo (no commits / no default branch) still resolves, but GitHub
// omits the ref from the codeload URL — e.g. ".../legacy.zip/" instead of
// ".../legacy.zip/refs/heads/main". Fetching that ref-less URL always 404s,
// which the app would otherwise surface as a misleading "download failed, try
// again" (retrying can't help). Detect it here and return a specific
// repo_empty so the app can say the repo has nothing to download.
$downloadPath = rtrim((string) parse_url($downloadUrl, PHP_URL_PATH), '/');
if (preg_match('#/legacy\.(zip|tar\.gz)$#', $downloadPath)) {
    http_response_code(422);
    echo json_encode(['error' => 'repo_empty']);
    exit;
}

echo json_encode(['downloadUrl' => $downloadUrl]);
