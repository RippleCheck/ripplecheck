<?php

declare(strict_types=1);

/**
 * Minimal .env loader — no Composer/vlucas-dotenv dependency, since shared
 * hosting (Hostinger) may not have Composer packages installed. Parses
 * simple KEY=value lines, skips blanks/#-comments, strips one layer of
 * surrounding quotes, and exposes values via getenv()/$_ENV/$_SERVER.
 */
function loadEnv(string $path): void
{
    if (!is_readable($path)) {
        throw new RuntimeException("Cannot read .env file at {$path}. Copy .env.example to .env and fill in real values.");
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

    foreach ($lines as $line) {
        $line = trim($line);

        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }

        $separatorPosition = strpos($line, '=');
        if ($separatorPosition === false) {
            continue;
        }

        $key = trim(substr($line, 0, $separatorPosition));
        $value = trim(substr($line, $separatorPosition + 1));
        $value = trim($value, "\"'");

        if ($key === '') {
            continue;
        }

        putenv("{$key}={$value}");
        $_ENV[$key] = $value;
        $_SERVER[$key] = $value;
    }
}

loadEnv(__DIR__ . '/.env');
