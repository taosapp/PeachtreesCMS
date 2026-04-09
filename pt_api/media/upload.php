<?php
/**
 * PeachtreesCMS API - Upload Media Files
 * POST /api/media/upload.php
 * Requires admin privileges
 */

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../response.php';
require_once __DIR__ . '/../auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    error('Method not allowed', 405);
}

requireAdmin();

if (!isset($_FILES['files']) && !isset($_FILES['file'])) {
    error('Please upload media files');
}

if (!function_exists('finfo_open')) {
    serverError('Server configuration error: fileinfo extension not enabled');
}

function normalizeUploadFiles(): array {
    if (isset($_FILES['files'])) {
        $files = $_FILES['files'];
    } else {
        $files = $_FILES['file'];
    }

    if (!is_array($files['name'])) {
        return [[
            'name' => $files['name'],
            'type' => $files['type'],
            'tmp_name' => $files['tmp_name'],
            'error' => $files['error'],
            'size' => $files['size'],
        ]];
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

try {
    $allowedMimeToExt = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
        'video/mp4' => 'mp4',
        'video/webm' => 'webm',
        'video/ogg' => 'ogg',
        'audio/mpeg' => 'mp3',
        'audio/mp3' => 'mp3',
        'audio/wav' => 'wav',
        'audio/x-wav' => 'wav',
        'audio/ogg' => 'ogg',
        'audio/mp4' => 'm4a',
        'audio/aac' => 'aac',
    ];

    $uploadFiles = normalizeUploadFiles();
    $saved = [];

    $year = date('Y');
    $month = date('m');
    $day = date('d');
    $relativeDir = "media/{$year}/{$month}";
    $absoluteDir = UPLOAD_DIR . $relativeDir;
    $uploadRoot = UPLOAD_DIR;

    if (!is_dir($absoluteDir)) {
        if (!is_dir($uploadRoot) || !is_writable($uploadRoot)) {
            serverError('Upload directory not writable, check pt_upload permissions: ' . $uploadRoot);
        }
        if (!@mkdir($absoluteDir, 0755, true) && !is_dir($absoluteDir)) {
            serverError('Failed to create upload directory: ' . $absoluteDir);
        }
    }

    foreach ($uploadFiles as $file) {
        if ($file['error'] !== UPLOAD_ERR_OK) {
            $errMsgs = [
                UPLOAD_ERR_INI_SIZE => 'File exceeds server limit (upload_max_filesize)',
                UPLOAD_ERR_FORM_SIZE => 'File exceeds form limit',
                UPLOAD_ERR_PARTIAL => 'File only partially uploaded',
                UPLOAD_ERR_NO_FILE => 'No file uploaded',
                UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder',
                UPLOAD_ERR_CANT_WRITE => 'Failed to write file',
            ];
            error($errMsgs[$file['error']] ?? 'File upload failed (error code: ' . $file['error'] . ')');
        }

        if ($file['size'] === 0) {
            error('Uploaded file is empty');
        }

        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        if (!isset($allowedMimeToExt[$mime])) {
            error('Only jpg/png/webp/gif/mp4/webm/ogg/mp3/wav/m4a/aac files allowed');
        }

        $ext = $allowedMimeToExt[$mime];
        $hash = bin2hex(random_bytes(8));
        $filename = "{$day}-{$hash}.{$ext}";
        $relativePath = "pt_upload/{$relativeDir}/{$filename}";
        $absolutePath = UPLOAD_DIR . "{$relativeDir}/{$filename}";

        if (!move_uploaded_file($file['tmp_name'], $absolutePath)) {
            serverError('Failed to save file');
        }

        $saved[] = [
            'path' => $relativePath,
            'url' => '/' . $relativePath
        ];
    }

    success([
        'files' => $saved
    ], 'Upload successful');
} catch (Exception $e) {
    serverError('Upload failed: ' . $e->getMessage());
}
