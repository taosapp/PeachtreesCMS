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

// Load .env file
$envFile = __DIR__ . '/.env';
if (!loadEnv($envFile)) {
    // If .env doesn't exist, try .env.local (for local development)
    $envLocalFile = __DIR__ . '/.env.local';
    if (!loadEnv($envLocalFile)) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Config file missing: please create api/.env']);
        exit;
    }
}

// Database configuration (must be read from .env)
$requiredEnvVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASS'];
$missingVars = [];
foreach ($requiredEnvVars as $var) {
    if (!isset($_ENV[$var]) || $_ENV[$var] === '') {
        $missingVars[] = $var;
    }
}
if (!empty($missingVars)) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Missing required config: ' . implode(', ', $missingVars) . ', please configure in api/.env']);
    exit;
}

define('DB_HOST', $_ENV['DB_HOST']);
define('DB_NAME', $_ENV['DB_NAME']);
define('DB_USER', $_ENV['DB_USER']);
define('DB_PASS', $_ENV['DB_PASS']);
define('DB_CHARSET', 'utf8mb4');

// JWT configuration
if (!isset($_ENV['JWT_SECRET']) || $_ENV['JWT_SECRET'] === '') {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Missing required config: JWT_SECRET, please configure in api/.env']);
    exit;
}
define('JWT_SECRET', $_ENV['JWT_SECRET']);
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
$uploadDir = $_ENV['UPLOAD_DIR'] ?? '';

if (!empty($uploadDir)) {
    // User defined upload directory, ensure it ends with slash
    $uploadDir = rtrim($uploadDir, '/\\') . '/';
} else {
    // Default path: use pt_upload/ under project root
    $uploadDir = __DIR__ . '/../pt_upload/';
}
define('UPLOAD_DIR', $uploadDir);

// Upload URL configuration
// For shared hosting in subdirectory, set UPLOAD_URL_BASE environment variable
// Example: /PeachtreesCMS/pt_upload/
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
        define('UPLOAD_URL', '/pt_upload/');
    } else {
        define('UPLOAD_URL', rtrim($baseDir, '/') . '/pt_upload/');
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
