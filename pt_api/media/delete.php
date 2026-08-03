<?php
/**
 * PeachtreesCMS API - Delete Media File
 * DELETE /api/media/delete.php
 * Requires admin privileges
 * 
 * Security notes:
 * - Only admins can delete files (requireAdmin)
 * - Path traversal protection via realpath() validation
 * - Can only delete files within media directory
 */

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../response.php';
require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/_helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    error('Method not allowed', 405);
}

requireAdmin();

$input = getJsonInput();
$path = $input['path'] ?? '';
if (!is_string($path) || trim($path) === '') {
    error('Missing file path');
}

$path = ltrim(trim($path), '/');
if (str_starts_with($path, 'upload/')) {
    $path = substr($path, 7);
}

$fullPath = rtrim(UPLOAD_DIR, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $path);
$realPath = realpath($fullPath);
$uploadRoot = realpath(UPLOAD_DIR);
if ($realPath === false || $uploadRoot === false || strpos($realPath, $uploadRoot) !== 0) {
    error('Invalid file path');
}

if (!is_file($realPath)) {
    error('File not found');
}

if (!@unlink($realPath)) {
    serverError('Failed to delete');
}

// 同步删除 pt_media 中的记录（文件已删，记录删除失败仅记日志，syncMediaLibrary 会清理孤儿）
try {
    $pdo = getDB();
    $del = $pdo->prepare("DELETE FROM pt_media WHERE path = ?");
    $del->execute(['upload/' . str_replace('\\', '/', $path)]);
} catch (Throwable $e) {
    error_log('pt_media delete failed: ' . $e->getMessage());
}

// Clean up empty directories (up to upload root)
$currentDir = dirname($realPath);
$mediaRoot = realpath(rtrim(UPLOAD_DIR, DIRECTORY_SEPARATOR));
while ($mediaRoot && strpos($currentDir, $mediaRoot) === 0 && $currentDir !== $mediaRoot) {
    $items = scandir($currentDir);
    if ($items && count($items) === 2) {
        @rmdir($currentDir);
        $currentDir = dirname($currentDir);
        continue;
    }
    break;
}

success([
    'path' => '/upload/' . str_replace('\\', '/', $path)
], 'Deleted successfully');
