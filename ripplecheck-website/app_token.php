<?php

declare(strict_types=1);

require_once __DIR__ . '/env.php';

/**
 * Handles the token handed to the Electron app after an in-app GitHub
 * login (see auth/github/login.php's ?from=app and dashboard.php), and
 * verified by api/me.php on every app launch. Stateless and HMAC-signed
 * rather than stored server-side — nothing to look up, just to verify.
 */
function getAppTokenSecret(): string
{
    return (string) getenv('APP_TOKEN_SECRET');
}

function base64UrlEncode(string $data): string
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64UrlDecode(string $data): string
{
    $padded = str_pad($data, strlen($data) + (4 - strlen($data) % 4) % 4, '=');
    $decoded = base64_decode(strtr($padded, '-_', '+/'), true);
    return $decoded === false ? '' : $decoded;
}

/**
 * The token doubles as both a short-lived handoff (it travels through a
 * ripplecheck:// URL the OS dispatches) and the credential the app keeps
 * across restarts, so its lifetime is a deliberate middle ground — long
 * enough to act as a "stay logged in" credential, not eternal. Tune
 * $ttlSeconds down if the handoff-exposure risk matters more than
 * restart-persistence for your threat model.
 */
function generateAppToken(int $userId, int $ttlSeconds = 2592000): string
{
    $payload = base64UrlEncode((string) json_encode([
        'uid' => $userId,
        'exp' => time() + $ttlSeconds,
    ], JSON_THROW_ON_ERROR));

    $signature = base64UrlEncode(hash_hmac('sha256', $payload, getAppTokenSecret(), true));

    return $payload . '.' . $signature;
}

/** @return array{uid: int}|null */
function verifyAppToken(string $token): ?array
{
    $parts = explode('.', $token, 2);
    if (count($parts) !== 2) {
        return null;
    }

    [$payload, $signature] = $parts;
    $expected = base64UrlEncode(hash_hmac('sha256', $payload, getAppTokenSecret(), true));

    if (!hash_equals($expected, $signature)) {
        return null;
    }

    $data = json_decode(base64UrlDecode($payload), true);
    if (!is_array($data) || empty($data['uid']) || empty($data['exp'])) {
        return null;
    }

    if ((int) $data['exp'] < time()) {
        return null;
    }

    return ['uid' => (int) $data['uid']];
}
