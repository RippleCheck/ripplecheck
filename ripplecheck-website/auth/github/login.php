<?php

declare(strict_types=1);

require_once __DIR__ . '/oauth_config.php';

configureSecureSession();
session_start();

// Random per-request state, checked again in callback.php, so a forged
// callback request (CSRF) without a matching session can't log someone in.
$state = bin2hex(random_bytes(16));
$_SESSION['oauth_state'] = $state;

// Carries through the GitHub round-trip via the session (GitHub's own
// redirect back to callback.php only echoes state/code, nothing of ours)
// so dashboard.php knows to hand off to the Electron app instead of
// rendering the normal dashboard page.
if (($_GET['from'] ?? '') === 'app') {
    $_SESSION['login_from_app'] = true;
}

$authorizeUrl = 'https://github.com/login/oauth/authorize?' . http_build_query([
    'client_id' => getGithubClientId(),
    'redirect_uri' => getGithubRedirectUri(),
    'state' => $state,
    // The Cloud tab's repo browser only lists/downloads the user's PUBLIC
    // repos, so 'public_repo' is the scope — deliberately not 'repo',
    // which also grants private-repo access and read/write (vs.
    // public_repo's read/write limited to public repos only). Per
    // GitHub's OAuth scope docs (docs.github.com/en/apps/oauth-apps/
    // building-oauth-apps/scopes-for-oauth-apps), there's no narrower
    // "public repos, read-only" scope than this.
    'scope' => 'read:user public_repo',
]);

header('Location: ' . $authorizeUrl);
exit;
