<?php
declare(strict_types=1);

// Forwarded through to auth/github/login.php so the ?from=app signal
// (set by the Electron app when it opens this page) survives the click
// through to where it actually gets stored in the session.
$authHref = '/auth/github/login.php';
if (($_GET['from'] ?? '') === 'app') {
    $authHref .= '?from=app';
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Log in — RippleCheck</title>
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
    justify-content: center;
    height: 100vh;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 24px;
  }
  .brand img { width: 26px; height: auto; }
  .brand span { font-size: 14px; font-weight: 600; color: #F5F5F5; }
  h1 { font-size: 18px; margin-bottom: 24px; }
  a {
    color: #0A0A0A;
    background: #38BDF8;
    padding: 10px 18px;
    border-radius: 6px;
    text-decoration: none;
    font-weight: 600;
    font-size: 14px;
  }
</style>
</head>
<body>
  <div class="brand"><img src="/assets/logo-mark.png" alt=""><span>RippleCheck</span></div>
  <h1>Log in to RippleCheck</h1>
  <a href="<?= htmlspecialchars($authHref, ENT_QUOTES, 'UTF-8') ?>">Log in with GitHub</a>
</body>
</html>
