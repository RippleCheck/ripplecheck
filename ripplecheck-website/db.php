<?php

declare(strict_types=1);

require_once __DIR__ . '/env.php';

/**
 * Returns a shared PDO connection for this request. Always uses prepared
 * statements with bound parameters at the call site — never build SQL by
 * concatenating/interpolating values into the query string.
 */
function getDbConnection(): PDO
{
    static $pdo = null;

    if ($pdo !== null) {
        return $pdo;
    }

    $host = getenv('DB_HOST');
    $name = getenv('DB_NAME');
    $user = getenv('DB_USER');
    $password = getenv('DB_PASSWORD');

    $dsn = "mysql:host={$host};dbname={$name};charset=utf8mb4";

    $pdo = new PDO($dsn, $user, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    return $pdo;
}
