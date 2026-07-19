<?php

declare(strict_types=1);

require_once __DIR__ . '/env.php';
require_once __DIR__ . '/auth/github/oauth_config.php';
require_once __DIR__ . '/app_token.php';

configureSecureSession();
session_start();

if (empty($_SESSION['user_id'])) {
    header('Location: /login.php');
    exit;
}

require_once __DIR__ . '/db.php';

$pdo = getDbConnection();
$statement = $pdo->prepare('SELECT username, avatar_url FROM users WHERE id = :id');
$statement->execute(['id' => $_SESSION['user_id']]);
$user = $statement->fetch();

if (!$user) {
    session_destroy();
    header('Location: /login.php');
    exit;
}

// This login started from the Electron app's "Log in with GitHub" button
// (auth/github/login.php?from=app) rather than a normal browser visit —
// hand off to the app via its registered custom protocol instead of
// rendering the dashboard page.
if (!empty($_SESSION['login_from_app'])) {
    unset($_SESSION['login_from_app']);
    $appToken = generateAppToken((int) $_SESSION['user_id']);
    header('Location: ripplecheck://auth?token=' . urlencode($appToken));
    exit;
}

$username = htmlspecialchars($user['username'], ENT_QUOTES, 'UTF-8');
$avatarUrl = htmlspecialchars($user['avatar_url'], ENT_QUOTES, 'UTF-8');
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Dashboard — RippleCheck</title>
<link rel="icon" type="image/png" href="/assets/favicon.png">
<style>
  body {
    margin: 0;
    background: #0A0A0A;
    color: #F5F5F5;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 60px 20px;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 32px;
  }
  .brand img.logo-mark { width: 26px; height: auto; }
  .brand span { font-size: 14px; font-weight: 600; color: #F5F5F5; }
  .avatar {
    border-radius: 50%;
    width: 96px;
    height: 96px;
    margin-bottom: 16px;
  }
  h1 {
    font-size: 20px;
    margin: 0 0 24px;
  }
  a {
    color: #38BDF8;
    text-decoration: none;
    font-size: 14px;
  }
  a:hover {
    text-decoration: underline;
  }
</style>
</head>
<body>
  <div class="brand"><img class="logo-mark" src="/assets/logo-mark.png" alt=""><span>RippleCheck</span></div>
  <img class="avatar" src="<?= $avatarUrl ?>" alt="<?= $username ?>'s avatar">
  <h1>Welcome, <?= $username ?></h1>
  <a href="/logout.php">Log out</a>
</body>
</html>
