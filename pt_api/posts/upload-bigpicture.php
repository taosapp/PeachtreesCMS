<?php
/**
 * PeachtreesCMS API - Upload Big-Picture Post Cover Media
 * POST /api/posts/upload-bigpicture.php
 * Requires authentication
 */

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../response.php';
require_once __DIR__ . '/../auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    error('Method not allowed', 405);
}

requireAuth();

if (!isset($_FILES['files']) && !isset($_FILES['file'])) {
    // Check if it's because post_max_size was exceeded
    $contentLength = $_SERVER['CONTENT_LENGTH'] ?? 0;
    $postMaxSize = ini_get('post_max_size');
    
    // Convert post_max_size to bytes
    $multiplier = 1;
    $unit = strtoupper(substr($postMaxSize, -1));
    if ($unit === 'G') $multiplier = 1024 * 1024 * 1024;
    elseif ($unit === 'M') $multiplier = 1024 * 1024;
    elseif ($unit === 'K') $multiplier = 1024;
    $limit = intval($postMaxSize) * $multiplier;

    if ($contentLength > $limit) {
        error("Upload content too large (current {$contentLength} bytes), exceeds server post_max_size limit ({$postMaxSize}). Please reduce image count or compress images before retrying.");
    }

    error('No upload file received. Please check if files are selected or if any single file is too large.');
}

/**
 * Normalize file array, compatible with single and multiple files.
 * @return array
 */
function normalizeUploadFiles() {
    if (isset($_FILES['files'])) {
        $files = $_FILES['files'];
    } else {
        $files = $_FILES['file'];
    }

    if (!is_array($files['name'])) {
        return [
            [
                'name' => $files['name'],
                'type' => $files['type'],
                'tmp_name' => $files['tmp_name'],
                'error' => $files['error'],
                'size' => $files['size'],
            ]
        ];
    }

    $normalized = [];
    $count = count($files['name']);
    for ($i = 0; $i < $count; $i++) {
        $normalized[] = [
            'name' => $files['name'][$i],
            'type' => $files['type'][$i],
            'tmp_name' => $files['tmp_name'][$i],
            'error' => $files['error'][$i],
            'size' => $files['size'][$i],
        ];
    }
    return $normalized;
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
    ];

    $uploadFiles = normalizeUploadFiles();
    $savedPaths = [];

    $year = date('Y');
    $month = date('m');
    $day = date('d');
    $relativeDir = "media/{$year}/{$month}";
    $absoluteDir = UPLOAD_DIR . $relativeDir;
    $uploadRoot = UPLOAD_DIR;

    if (!is_dir($absoluteDir)) {
        if (!is_dir($uploadRoot) || !is_writable($uploadRoot)) {
            serverError('Upload directory not writable, please check upload directory permissions: ' . $uploadRoot);
        }
        if (!@mkdir($absoluteDir, 0755, true) && !is_dir($absoluteDir)) {
            serverError('Failed to create upload directory: ' . $absoluteDir);
        }
    }

    foreach ($uploadFiles as $file) {
        if ($file['error'] !== UPLOAD_ERR_OK) {
            $errMsgs = [
                UPLOAD_ERR_INI_SIZE => 'File size exceeds server limit (upload_max_filesize)',
                UPLOAD_ERR_FORM_SIZE => 'File size exceeds form limit',
                UPLOAD_ERR_PARTIAL => 'File was only partially uploaded',
                UPLOAD_ERR_NO_FILE => 'No file was uploaded',
                UPLOAD_ERR_NO_TMP_DIR => 'Temporary folder not found',
                UPLOAD_ERR_CANT_WRITE => 'Failed to write file',
            ];
            error($errMsgs[$file['error']] ?? 'File upload failed (error code: ' . $file['error'] . ')');
        }

        if ($file['size'] === 0) {
            error('Uploaded file content is empty');
        }

        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        if (!isset($allowedMimeToExt[$mime])) {
            error('Unsupported file type: ' . $mime . '. Only jpg/png/webp/gif/mp4 are supported');
        }

        $ext = $allowedMimeToExt[$mime];
        $hash = bin2hex(random_bytes(8));
        $filename = "{$day}-{$hash}.{$ext}";
        $relativePath = "pt_upload/{$relativeDir}/{$filename}";
        $absolutePath = UPLOAD_DIR . "{$relativeDir}/{$filename}";

        if (!move_uploaded_file($file['tmp_name'], $absolutePath)) {
            serverError('Failed to save file');
        }

        $savedPaths[] = $relativePath;
    }

    success([
        'paths' => $savedPaths
    ], 'Upload successful');
} catch (Exception $e) {
    serverError('Upload failed: ' . $e->getMessage());
}
