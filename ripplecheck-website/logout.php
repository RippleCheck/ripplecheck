<?php

declare(strict_types=1);

require_once __DIR__ . '/auth/github/oauth_config.php';

configureSecureSession();
session_start();

$_SESSION = [];

if (ini_get('session.use_cookies')) {
    $cookieParams = session_get_cookie_params();
    setcookie(
        session_name(),
        '',
        time() - 42000,
        $cookieParams['path'],
        $cookieParams['domain'],
        $cookieParams['secure'],
        $cookieParams['httponly']
    );
}

session_destroy();

header('Location: /index.php');
exit;
