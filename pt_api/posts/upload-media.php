<?php
/**
 * PeachtreesCMS API - Upload Normal Post Media (image/video/audio)
 * POST /api/posts/upload-media.php
 * Supports session auth or mail token auth (X-Mail-Token header / token POST field)
 */

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../response.php';
require_once __DIR__ . '/../auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    error('Method not allowed', 405);
}

// Support both session auth and mail token auth
$authenticated = false;
$user = getCurrentUser();
if ($user) {
    $authenticated = true;
} else {
    // Fallback: token-based auth for mail handler
    $token = $_POST['token'] ?? ($_SERVER['HTTP_X_MAIL_TOKEN'] ?? '');
    if ($token !== '') {
        $pdo = getDB();
        $stmt = $pdo->prepare('SELECT option_value FROM pt_options WHERE option_key = ? LIMIT 1');
        $stmt->execute(['mail_publish_secret']);
        $row = $stmt->fetch();
        $secret = $row ? (string)$row['option_value'] : '';
        if ($secret !== '' && hash_equals($secret, $token)) {
            $authenticated = true;
        }
    }
}
if (!$authenticated) {
    unauthorized('Please login first');
}

if (!isset($_FILES['file'])) {
    error('Please upload a media file');
}

$file = $_FILES['file'];
if ($file['error'] !== UPLOAD_ERR_OK) {
    error('File upload failed');
}

// Check if fileinfo extension is available
if (!function_exists('finfo_open')) {
    serverError('Server configuration error: fileinfo extension not enabled. Please enable this extension and try again.');
}

try {
    $allowedMimeToExt = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
        'video/mp4' => 'mp4',
        'audio/mpeg' => 'mp3',
        'audio/mp3' => 'mp3',
        'audio/wav' => 'wav',
        'audio/x-wav' => 'wav',
        'audio/ogg' => 'ogg',
        'audio/mp4' => 'm4a',
        'audio/aac' => 'aac',
    ];

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (!isset($allowedMimeToExt[$mime])) {
        error('Only jpg/png/webp/gif/mp4/mp3/wav/ogg/m4a/aac media files are supported');
    }

    $year = date('Y');
    $month = date('m');
    $day = date('d');
    $relativeDir = "{$year}/{$month}";
    $absoluteDir = UPLOAD_DIR . $relativeDir;
    $uploadRoot = UPLOAD_DIR;

    if (!is_dir($absoluteDir)) {
        if (!is_dir($uploadRoot) || !is_writable($uploadRoot)) {
            serverError('Upload directory not writable, please check upload directory permissions: ' . $uploadRoot);
        }
        if (!@mkdir($absoluteDir, 0755, true) && !is_dir($absoluteDir)) {
            serverError('Failed to create upload directory');
        }
    }

    $ext = $allowedMimeToExt[$mime];
    $hash = bin2hex(random_bytes(8));
    $filename = "{$day}-{$hash}.{$ext}";
    $relativePath = "upload/{$relativeDir}/{$filename}";
    $absolutePath = UPLOAD_DIR . "{$relativeDir}/{$filename}";

    if (!move_uploaded_file($file['tmp_name'], $absolutePath)) {
        serverError('Failed to save file');
    }

    success([
        'path' => $relativePath,
        'url' => $relativePath
    ], 'Upload successful');
} catch (Exception $e) {
    serverError('Upload failed: ' . $e->getMessage());
}
