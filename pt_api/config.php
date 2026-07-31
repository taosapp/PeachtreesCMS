<?php
/**
 * PeachtreesCMS API - Database Configuration
 * Uses PDO to connect to MySQL
 * Sensitive information is read from .env file
 */

// Load environment variables from .env file
function loadEnv($file) {
    if (!file_exists($file)) {
        return false;
    }

    $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        // Skip comment lines
        if (strpos(trim($line), '#') === 0) {
            continue;
        }

        // Parse KEY=VALUE
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);

            // Remove surrounding quotes
            if ((strpos($value, '"') === 0 && strrpos($value, '"') === strlen($value) - 1) ||
                (strpos($value, "'") === 0 && strrpos($value, "'") === strlen($value) - 1)) {
                $value = substr($value, 1, -1);
            }

            // Set to $_ENV and putenv
            $_ENV[$key] = $value;
            putenv("$key=$value");
        }
    }
    return true;
}

// Load .env file — optional override for production config
// If .env is absent, built-in defaults below will be used
$searchDirs = [__DIR__];
$parent = __DIR__;
for ($i = 0; $i < 3; $i++) {
    $next = dirname($parent);
    if ($next === $parent) break; // reached filesystem root
    $searchDirs[] = $next;
    $parent = $next;
}

// .env found anywhere in parent chain will override defaults
foreach ($searchDirs as $dir) {
    if (loadEnv($dir . '/.env')) {
        break;
    }
}

// .env.local in pt_api/ overrides for local development
loadEnv(__DIR__ . '/.env.local');

// Database configuration — defaults used when .env is absent
define('DB_HOST', $_ENV['DB_HOST'] ?? 'localhost');
define('DB_NAME', $_ENV['DB_NAME'] ?? 'peachtrees');
define('DB_USER', $_ENV['DB_USER'] ?? 'root');
define('DB_PASS', $_ENV['DB_PASS'] ?? '');
define('DB_CHARSET', 'utf8mb4');

// JWT configuration — change secret in .env for production
define('JWT_SECRET', $_ENV['JWT_SECRET'] ?? 'dev-only-insecure-key-CHANGE-ME');
define('JWT_EXPIRE', 86400);
// Timezone setting
date_default_timezone_set('Asia/Shanghai');

// Force output encoding to UTF-8, avoid 0x00 bytes from UTF-16/UTF-32 output
ini_set('default_charset', 'UTF-8');
if (function_exists('mb_internal_encoding')) {
    mb_internal_encoding('UTF-8');
}
if (function_exists('mb_http_output')) {
    mb_http_output('pass');
}
if (function_exists('mb_regex_encoding')) {
    mb_regex_encoding('UTF-8');
}
ini_set('mbstring.encoding_translation', '0');
// mbstring.http_output is deprecated (PHP 8.2+), avoid triggering Deprecated output
ini_set('mbstring.func_overload', '0');
ini_set('output_handler', '');
ini_set('zlib.output_compression', '0');

// Upload directory configuration (read from .env, supports user customization)
// Supports absolute or relative paths (relative to project root).
$uploadDir = $_ENV['UPLOAD_DIR'] ?? '';
$projectRoot = realpath(__DIR__ . '/..') ?: (__DIR__ . '/..');

if (!empty($uploadDir)) {
    $uploadDir = rtrim($uploadDir, '/\\');
    // Resolve relative path against project root
    if (!preg_match('/^(\/|[a-zA-Z]:[\/\\\\])/', $uploadDir)) {
        $uploadDir = $projectRoot . '/' . $uploadDir;
    }
    $uploadDir .= '/';
} else {
    // Default path: use upload/ under project root
    $uploadDir = $projectRoot . '/upload/';
}
define('UPLOAD_DIR', $uploadDir);

// Theme directory configuration (read from .env, supports user customization)
$themeDir = $_ENV['THEME_DIR'] ?? '';
if (!empty($themeDir)) {
    $themeDir = rtrim($themeDir, '/\\');
    if (!preg_match('/^(\/|[a-zA-Z]:[\/\\\\])/', $themeDir)) {
        $themeDir = $projectRoot . '/' . $themeDir;
    }
} else {
    $themeDir = $projectRoot . '/theme';
}
define('THEME_DIR', $themeDir);

// Style/pattern directory configuration (read from .env, supports user customization)
$styleDir = $_ENV['STYLE_DIR'] ?? '';
if (!empty($styleDir)) {
    $styleDir = rtrim($styleDir, '/\\');
    if (!preg_match('/^(\/|[a-zA-Z]:[\/\\\\])/', $styleDir)) {
        $styleDir = $projectRoot . '/' . $styleDir;
    }
} else {
    $styleDir = $projectRoot . '/pattern';
}
define('STYLE_DIR', $styleDir);

// Upload URL configuration
// ⚠️ DEPRECATED (historical only): since the path convention update, backend APIs
// return SITE-RELATIVE paths (e.g. upload/2026/04/x.jpg) and the frontend converts
// them via pt_frontend/src/utils/path.js. Do NOT use UPLOAD_URL / UPLOAD_URL_BASE
// to build absolute upload URLs anymore.
// For shared hosting in subdirectory, set UPLOAD_URL_BASE environment variable
// Example: /PeachtreesCMS/upload/
$uploadUrlBase = $_ENV['UPLOAD_URL_BASE'] ?? '';
if (!empty($uploadUrlBase)) {
    // Use custom URL base from environment
    define('UPLOAD_URL', rtrim($uploadUrlBase, '/') . '/');
} else {
    // Default: try to detect from request
    $scriptDir = dirname($_SERVER['SCRIPT_NAME'] ?? '/');
    // Remove /pt_api/... from path to get base directory
    // Example: /PeachtreesCMS/pt_api/media => /PeachtreesCMS
    $baseDir = preg_replace('#/pt_api(/.*)?$#i', '', $scriptDir);
    if ($baseDir === '' || $baseDir === '/') {
        define('UPLOAD_URL', '/upload/');
    } else {
        define('UPLOAD_URL', rtrim($baseDir, '/') . '/upload/');
    }
}

// Create PDO connection
function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Database connection failed']);
            exit;
        }
    }
    return $pdo;
}

// Start Session
if (session_status() === PHP_SESSION_NONE) {
    $sessionPath = __DIR__ . '/sessions';
    if (!is_dir($sessionPath)) {
        @mkdir($sessionPath, 0755, true);
    }
    if (is_dir($sessionPath)) {
        session_save_path($sessionPath);
    }

    // Set secure session cookie parameters
    // secure: true when HTTPS is detected, ensures cookies only sent over HTTPS
    $isSecure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ||
                (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') ||
                (!empty($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443);

    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $isSecure,
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    session_start();
}
