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
if (str_starts_with($path, 'pt_upload/')) {
    $path = substr($path, 10);
}

if (!str_starts_with($path, 'media/')) {
    error('Can only delete files in media directory');
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

// Clean up empty directories (up to media directory)
$currentDir = dirname($realPath);
$mediaRoot = realpath(rtrim(UPLOAD_DIR, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'media');
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
    'path' => 'pt_upload/' . str_replace('\\', '/', $path)
], 'Deleted successfully');
