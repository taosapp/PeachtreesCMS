<?php
/**
 * PeachtreesCMS API - 数据库配置
 * 使用 PDO 连接 MySQL
 * 敏感信息从 .env 文件读取
 */

// 加载环境变量函数
function loadEnv($file) {
    if (!file_exists($file)) {
        return false;
    }
    
    $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        // 跳过注释行
        if (strpos(trim($line), '#') === 0) {
            continue;
        }
        
        // 解析 KEY=VALUE
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            
            // 移除可能的引号
            if ((strpos($value, '"') === 0 && strrpos($value, '"') === strlen($value) - 1) ||
                (strpos($value, "'") === 0 && strrpos($value, "'") === strlen($value) - 1)) {
                $value = substr($value, 1, -1);
            }
            
            // 设置到 $_ENV 和 putenv
            $_ENV[$key] = $value;
            putenv("$key=$value");
        }
    }
    return true;
}

// 加载 .env 文件
$envFile = __DIR__ . '/.env';
if (!loadEnv($envFile)) {
    // 如果 .env 不存在，尝试加载 .env.local（本地开发）
    $envLocalFile = __DIR__ . '/.env.local';
    if (!loadEnv($envLocalFile)) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['error' => '配置文件缺失：请创建 api/.env 文件']);
        exit;
    }
}

// 环境模式
$appEnv = $_ENV['APP_ENV'] ?? 'development';
$isProduction = $appEnv === 'production';

// 数据库配置
define('DB_HOST', $_ENV['DB_HOST'] ?? 'localhost');
define('DB_NAME', $_ENV['DB_NAME'] ?? 'peachtrees');
define('DB_USER', $_ENV['DB_USER'] ?? 'root');
define('DB_PASS', $_ENV['DB_PASS'] ?? '');
define('DB_CHARSET', $_ENV['DB_CHARSET'] ?? 'utf8mb4');

// JWT 配置
define('JWT_SECRET', $_ENV['JWT_SECRET'] ?? 'default_secret_change_in_production');
define('JWT_EXPIRE', intval($_ENV['JWT_EXPIRE'] ?? 86400));

// 时区设置
$timezone = $_ENV['TIMEZONE'] ?? 'Asia/Shanghai';
date_default_timezone_set($timezone);

// 强制输出编码为 UTF-8，避免出现 UTF-16/UTF-32 输出导致的 0x00 字节
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
// mbstring.http_output 已废弃（PHP 8.2+），避免触发 Deprecated 输出
ini_set('mbstring.func_overload', '0');
ini_set('output_handler', '');
ini_set('zlib.output_compression', '0');

// 错误报告配置
if ($isProduction) {
    error_reporting(E_ALL);
    ini_set('display_errors', '0');
    ini_set('log_errors', '1');
    ini_set('error_log', '/var/log/php/peachtreescms-error.log');
} else {
    error_reporting(E_ALL);
    ini_set('display_errors', '1');
}

// 上传目录配置
if ($isProduction) {
    define('UPLOAD_DIR', '/var/www/html/upload/');
    define('UPLOAD_URL', '/upload/');
} else {
    define('UPLOAD_DIR', __DIR__ . '/../upload/');
    define('UPLOAD_URL', '/upload/');
}

// 创建 PDO 连接
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

// 启动 Session
if (session_status() === PHP_SESSION_NONE) {
    $sessionPath = __DIR__ . '/sessions';
    if (!is_dir($sessionPath)) {
        @mkdir($sessionPath, 0755, true);
    }
    if (is_dir($sessionPath)) {
        session_save_path($sessionPath);
    }
    session_set_cookie_params([
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    session_start();
}
