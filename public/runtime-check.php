<?php
/**
 * Temporary Laravel runtime and environment-source check.
 * Upload to the Laravel public/ directory as runtime-check.php.
 * Delete this file immediately after troubleshooting.
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-Robots-Tag: noindex, nofollow, noarchive');

$root = dirname(__DIR__);
$envPath = $root . '/.env';
$envText = is_readable($envPath) ? (string) file_get_contents($envPath) : '';

$readEnvironmentValue = static function (string $key): ?string {
    $getenv = getenv($key);
    if ($getenv !== false && $getenv !== '') {
        return (string) $getenv;
    }

    if (isset($_SERVER[$key]) && $_SERVER[$key] !== '') {
        return (string) $_SERVER[$key];
    }

    if (isset($_ENV[$key]) && $_ENV[$key] !== '') {
        return (string) $_ENV[$key];
    }

    return null;
};

$result = [
    'status' => 'ok',
    'php_version' => PHP_VERSION,
    'sapi' => PHP_SAPI,
    'document_root' => $_SERVER['DOCUMENT_ROOT'] ?? null,
    'current_directory' => getcwd(),
    'script_directory' => __DIR__,
    'calculated_laravel_root' => $root,
    'env_file' => [
        'path' => $envPath,
        'exists' => is_file($envPath),
        'readable' => is_readable($envPath),
        'contains_DB_DATABASE_line' => (bool) preg_match('/^DB_DATABASE\\s*=/m', $envText),
        'contains_DB_USERNAME_line' => (bool) preg_match('/^DB_USERNAME\\s*=/m', $envText),
        'contains_SESSION_DRIVER_line' => (bool) preg_match('/^SESSION_DRIVER\\s*=/m', $envText),
        'contains_gips_staging_db' => str_contains($envText, 'gips_staging_db'),
    ],
    'web_environment_before_laravel' => [
        'DB_DATABASE' => $readEnvironmentValue('DB_DATABASE'),
        'DB_USERNAME' => $readEnvironmentValue('DB_USERNAME'),
        'DB_HOST' => $readEnvironmentValue('DB_HOST'),
        'SESSION_DRIVER' => $readEnvironmentValue('SESSION_DRIVER'),
    ],
    'laravel_booted' => false,
    'config_cache_present' => is_file($root . '/bootstrap/cache/config.php'),
    'resolved_laravel_config' => [
        'session_driver' => null,
        'database_host' => null,
        'database' => null,
        'username' => null,
        'connection' => 'not_tested',
    ],
];

try {
    $autoload = $root . '/vendor/autoload.php';
    $bootstrap = $root . '/bootstrap/app.php';

    if (!is_file($autoload) || !is_file($bootstrap)) {
        throw new RuntimeException('Laravel bootstrap files were not found.');
    }

    require_once $autoload;
    $app = require_once $bootstrap;

    if (method_exists($app, 'make')) {
        $kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
        $kernel->bootstrap();
    }

    $result['laravel_booted'] = true;
    $result['resolved_laravel_config']['session_driver'] = function_exists('config') ? config('session.driver') : null;
    $result['resolved_laravel_config']['database_host'] = function_exists('config') ? config('database.connections.mysql.host') : null;
    $result['resolved_laravel_config']['database'] = function_exists('config') ? config('database.connections.mysql.database') : null;
    $result['resolved_laravel_config']['username'] = function_exists('config') ? config('database.connections.mysql.username') : null;

    if (function_exists('app') && app()->bound('db')) {
        app('db')->connection()->select('SELECT 1');
        $result['resolved_laravel_config']['connection'] = 'ok';
    }
} catch (Throwable $e) {
    $result['status'] = 'error';
    $result['error_class'] = get_class($e);
    $result['error_message'] = $e->getMessage();
}

http_response_code($result['status'] === 'ok' ? 200 : 500);
echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;