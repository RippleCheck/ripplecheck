<?php

declare(strict_types=1);

require_once __DIR__ . '/oauth_config.php';
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../github_token.php';

configureSecureSession();
session_start();

$state = $_GET['state'] ?? '';
$code = $_GET['code'] ?? '';

$sessionState = $_SESSION['oauth_state'] ?? null;
unset($_SESSION['oauth_state']);

if ($code === '' || $state === '' || $sessionState === null || !hash_equals($sessionState, $state)) {
    http_response_code(400);
    exit('Login failed: the state parameter did not match. Please try logging in again.');
}

try {
    $tokenResponse = requestGithubAccessToken($code);

    if (empty($tokenResponse['access_token'])) {
        http_response_code(400);
        exit('Login failed: GitHub did not return an access token.');
    }

    $profile = fetchGithubProfile((string) $tokenResponse['access_token']);

    if (empty($profile['id']) || empty($profile['login'])) {
        http_response_code(400);
        exit('Login failed: could not fetch your GitHub profile.');
    }

    $githubId = (int) $profile['id'];
    $username = (string) $profile['login'];
    $avatarUrl = (string) ($profile['avatar_url'] ?? '');

    $encryptedToken = encryptGithubToken((string) $tokenResponse['access_token']);

    $pdo = getDbConnection();

    $upsert = $pdo->prepare(
        'INSERT INTO users (github_id, username, avatar_url, github_access_token_encrypted)
         VALUES (:github_id, :username, :avatar_url, :github_access_token_encrypted)
         ON DUPLICATE KEY UPDATE
             username = VALUES(username),
             avatar_url = VALUES(avatar_url),
             github_access_token_encrypted = VALUES(github_access_token_encrypted)'
    );
    $upsert->bindValue('github_id', $githubId);
    $upsert->bindValue('username', $username);
    $upsert->bindValue('avatar_url', $avatarUrl);
    $upsert->bindValue('github_access_token_encrypted', $encryptedToken, PDO::PARAM_LOB);
    $upsert->execute();

    $lookup = $pdo->prepare('SELECT id, username FROM users WHERE github_id = :github_id');
    $lookup->execute(['github_id' => $githubId]);
    $user = $lookup->fetch();

    session_regenerate_id(true);
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['username'] = $user['username'];

    header('Location: /dashboard.php');
    exit;
} catch (Throwable $e) {
    // Catches \Error too (e.g. a missing extension throwing "Call to
    // undefined function"), not just \Exception — that class of failure
    // is exactly what previously showed up as a blank 500 with nothing
    // in debug.log.
    logDebug(sprintf(
        "callback.php: uncaught %s: %s in %s:%d\nStack trace:\n%s",
        get_class($e),
        $e->getMessage(),
        $e->getFile(),
        $e->getLine(),
        $e->getTraceAsString()
    ));
    http_response_code(500);
    exit('Something went wrong, check debug.log');
}

/** @return array<string, mixed> */
function requestGithubAccessToken(string $code): array
{
    $postFields = http_build_query([
        'client_id' => getGithubClientId(),
        'client_secret' => getGithubClientSecret(),
        'code' => $code,
        'redirect_uri' => getGithubRedirectUri(),
    ]);

    $ch = curl_init('https://github.com/login/oauth/access_token');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $postFields,
        CURLOPT_HTTPHEADER => ['Accept: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
    ]);
    $response = curl_exec($ch);
    $curlError = curl_error($ch);

    if ($response === false) {
        throw new RuntimeException("GitHub token request failed: {$curlError}");
    }

    $data = json_decode($response, true);
    return is_array($data) ? $data : [];
}

/** @return array<string, mixed> */
function fetchGithubProfile(string $accessToken): array
{
    $ch = curl_init('https://api.github.com/user');
    curl_setopt_array($ch, [
        CURLOPT_HTTPHEADER => [
            "Authorization: Bearer {$accessToken}",
            'Accept: application/vnd.github+json',
            'User-Agent: RippleCheck-Website',
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
    ]);
    $response = curl_exec($ch);
    $curlError = curl_error($ch);

    if ($response === false) {
        throw new RuntimeException("GitHub profile request failed: {$curlError}");
    }

    $data = json_decode($response, true);
    return is_array($data) ? $data : [];
}
