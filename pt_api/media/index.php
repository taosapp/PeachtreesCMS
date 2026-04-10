<?php
/**
 * PeachtreesCMS API - Media Library List
 * GET /api/media/index.php
 * Requires admin privileges
 */

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../response.php';
require_once __DIR__ . '/../auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    error('Method not allowed', 405);
}

requireAdmin();

$baseDir = rtrim(UPLOAD_DIR, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'media';
if (!is_dir($baseDir)) {
    success([
        'files' => []
    ]);
}

$imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
$videoExts = ['mp4', 'webm', 'ogg'];
$audioExts = ['mp3', 'wav', 'ogg', 'm4a', 'aac'];

$files = [];
$iterator = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($baseDir, RecursiveDirectoryIterator::SKIP_DOTS)
);

foreach ($iterator as $file) {
    if (!$file->isFile()) {
        continue;
    }
    $ext = strtolower($file->getExtension());
    if (!in_array($ext, $imageExts, true) && !in_array($ext, $videoExts, true) && !in_array($ext, $audioExts, true)) {
        continue;
    }

    $relativePath = str_replace('\\', '/', substr($file->getPathname(), strlen(rtrim(UPLOAD_DIR, DIRECTORY_SEPARATOR)) + 1));
    $type = in_array($ext, $imageExts, true) ? 'image' : (in_array($ext, $videoExts, true) ? 'video' : 'audio');

    $files[] = [
        'path' => '/pt_upload/' . $relativePath,
        'url' => '/pt_upload/' . $relativePath,
        'type' => $type,
        'size' => $file->getSize(),
        'modified_at' => date('Y-m-d H:i:s', $file->getMTime())
    ];
}

usort($files, function ($a, $b) {
    return strcmp($b['modified_at'], $a['modified_at']);
});

success([
    'files' => $files
]);
