<?php

declare(strict_types=1);

/**
 * Minimal shared GitHub REST API client for the repo-browsing/download
 * endpoints (api/repos.php, api/repo-download-url.php). callback.php has
 * its own bespoke request helpers for the OAuth token exchange/profile
 * fetch — left as-is here rather than folded in, since that's a
 * different concern (unauthenticated token exchange vs. authenticated
 * API calls) and already working.
 */

/** @return array{0: int, 1: mixed} [http status, decoded JSON body] */
function githubApiRequest(string $url, string $token): array
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_HTTPHEADER => [
            "Authorization: Bearer {$token}",
            'Accept: application/vnd.github+json',
            'User-Agent: RippleCheck-Website',
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 15,
    ]);
    $response = curl_exec($ch);
    $curlError = curl_error($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($response === false) {
        throw new RuntimeException("GitHub API request failed: {$curlError}");
    }

    return [$status, json_decode($response, true)];
}

/**
 * GitHub's zipball/tarball endpoints respond with a 302 to a time-limited,
 * pre-signed codeload.github.com URL rather than the archive itself — that
 * signed URL is what actually needs handing to the Electron client (so the
 * real GitHub token never has to leave this server). Returns null if
 * GitHub didn't redirect (repo not found, no access, etc).
 */
function githubApiResolveRedirect(string $url, string $token): ?string
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_HTTPHEADER => [
            "Authorization: Bearer {$token}",
            'Accept: application/vnd.github+json',
            'User-Agent: RippleCheck-Website',
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_TIMEOUT => 15,
    ]);
    curl_exec($ch);
    $curlError = curl_error($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $location = curl_getinfo($ch, CURLINFO_REDIRECT_URL);
    curl_close($ch);

    if ($curlError !== '') {
        throw new RuntimeException("GitHub API request failed: {$curlError}");
    }

    if ($status < 300 || $status >= 400 || empty($location)) {
        return null;
    }

    return $location;
}
