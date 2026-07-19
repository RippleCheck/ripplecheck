<?php
declare(strict_types=1);
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>RippleCheck</title>
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
    text-align: center;
  }
  h1 {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    color: #38BDF8;
    margin-bottom: 8px;
  }
  h1 img { width: 30px; height: auto; }
  p { color: #9CA3AF; margin-top: 0; }
  a {
    margin-top: 24px;
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
  <h1><img src="/assets/logo-mark.png" alt="">RippleCheck</h1>
  <p>See what breaks before you break it.</p>
  <a href="/login.php">Log in with GitHub</a>
</body>
</html>
