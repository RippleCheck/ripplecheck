<?php

declare(strict_types=1);

require_once __DIR__ . '/../../env.php';

function getGithubClientId(): string
{
    return (string) getenv('GITHUB_CLIENT_ID');
}

function getGithubClientSecret(): string
{
    return (string) getenv('GITHUB_CLIENT_SECRET');
}

/**
 * Points session storage at a project-local folder (outside the web
 * root's normal serving path, gitignored) and hardens the session
 * cookie. Must be called before session_start() — used by both
 * login.php and callback.php so the two never drift out of sync.
 */
function configureSecureSession(): void
{
    $sessionsPath = __DIR__ . '/../../sessions';
    if (!is_dir($sessionsPath)) {
        mkdir($sessionsPath, 0700, true);
    }
    session_save_path($sessionsPath);

    session_set_cookie_params([
        'path' => '/',
        'secure' => true,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

/**
 * Appends a single timestamped line to ripplecheck-website/debug.log
 * (gitignored). Used by callback.php's catch block to record unexpected
 * errors instead of failing with a blank 500.
 */
function logDebug(string $message): void
{
    $logPath = __DIR__ . '/../../debug.log';
    $line = '[' . date('Y-m-d H:i:s') . '] ' . $message . PHP_EOL;
    file_put_contents($logPath, $line, FILE_APPEND | LOCK_EX);
}

/**
 * Built from the current request instead of a hardcoded domain, so the
 * same code produces the right callback URL whether it's running under
 * `php -S localhost:8000` or on the real Hostinger domain. GitHub still
 * requires this exact URL to be registered on the OAuth App — see the
 * setup notes for what that means for local testing.
 */
function getGithubRedirectUri(): string
{
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
    $scheme = $isHttps ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'];

    return "{$scheme}://{$host}/auth/github/callback.php";
}
