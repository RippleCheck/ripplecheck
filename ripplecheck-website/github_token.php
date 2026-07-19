<?php

declare(strict_types=1);

require_once __DIR__ . '/env.php';

/**
 * Encrypts/decrypts the real GitHub OAuth access token before it touches
 * the database. Unlike app_token.php's HMAC-signed token (which only ever
 * carries our own uid/exp and is safe to hand to the Electron client),
 * this is a genuine third-party credential with repo read/write scope —
 * it never leaves this server, and is encrypted at rest so a database
 * leak alone doesn't hand out live GitHub access.
 *
 * Uses PHP's built-in openssl extension (AES-256-GCM, authenticated) rather
 * than libsodium — openssl ships enabled on virtually all shared hosting,
 * whereas sodium sometimes isn't. This is a different primitive from
 * app_token.php's HMAC signing key and deliberately doesn't share it.
 */

const GITHUB_TOKEN_CIPHER = 'aes-256-gcm';
const GITHUB_TOKEN_KEY_BYTES = 32;   // AES-256
const GITHUB_TOKEN_IV_BYTES = 12;    // GCM standard nonce length
const GITHUB_TOKEN_TAG_BYTES = 16;   // GCM authentication tag

function getGithubTokenEncryptionKey(): string
{
    $encoded = (string) getenv('GITHUB_TOKEN_ENCRYPTION_KEY');
    $key = base64_decode($encoded, true);

    if ($key === false || strlen($key) !== GITHUB_TOKEN_KEY_BYTES) {
        throw new RuntimeException(
            'GITHUB_TOKEN_ENCRYPTION_KEY must be a base64-encoded ' .
            GITHUB_TOKEN_KEY_BYTES . '-byte key. Generate with: ' .
            'php -r "echo base64_encode(random_bytes(' . GITHUB_TOKEN_KEY_BYTES . '));"'
        );
    }

    return $key;
}

/** IV and tag are random/derived per encryption and stored alongside the
 * ciphertext (iv . tag . ciphertext) — neither is a secret. */
function encryptGithubToken(string $plainToken): string
{
    $iv = random_bytes(GITHUB_TOKEN_IV_BYTES);
    $tag = '';
    $ciphertext = openssl_encrypt(
        $plainToken,
        GITHUB_TOKEN_CIPHER,
        getGithubTokenEncryptionKey(),
        OPENSSL_RAW_DATA,
        $iv,
        $tag,
        '',
        GITHUB_TOKEN_TAG_BYTES
    );

    if ($ciphertext === false) {
        throw new RuntimeException('Failed to encrypt GitHub token.');
    }

    return $iv . $tag . $ciphertext;
}

/** Returns null on any malformed/undecryptable input rather than throwing, since a
 * corrupt or missing value should just be treated as "no token available". The GCM
 * tag also makes decryption fail (→ null) on any tampering or wrong key. */
function decryptGithubToken(?string $encrypted): ?string
{
    $headerLength = GITHUB_TOKEN_IV_BYTES + GITHUB_TOKEN_TAG_BYTES;
    if ($encrypted === null || strlen($encrypted) <= $headerLength) {
        return null;
    }

    $iv = substr($encrypted, 0, GITHUB_TOKEN_IV_BYTES);
    $tag = substr($encrypted, GITHUB_TOKEN_IV_BYTES, GITHUB_TOKEN_TAG_BYTES);
    $ciphertext = substr($encrypted, $headerLength);

    $plainToken = openssl_decrypt(
        $ciphertext,
        GITHUB_TOKEN_CIPHER,
        getGithubTokenEncryptionKey(),
        OPENSSL_RAW_DATA,
        $iv,
        $tag
    );

    return $plainToken === false ? null : $plainToken;
}
