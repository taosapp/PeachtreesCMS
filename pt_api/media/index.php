<?php
/**
 * PeachtreesCMS API - Media Library List
 * GET /api/media/index.php
 * Requires admin privileges
 *
 * 媒体列表统一从 pt_media 数据表读取（含上传者、原始文件名等元数据），
 * 并在返回前执行 syncMediaLibrary() 做文件系统补录与孤儿清理，
 * 保证历史文件（无数据库记录）也能出现在列表中。
 */

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../response.php';
require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/_helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    error('Method not allowed', 405);
}

requireAdmin();

try {
    $pdo = getDB();
    ensureMediaTable($pdo);
    syncMediaLibrary($pdo);

    $stmt = $pdo->query(
        "SELECT id, filename, original_name, path, mime_type, file_size, created_at
         FROM pt_media
         ORDER BY created_at DESC, id DESC"
    );
    $rows = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];

    $files = [];
    foreach ($rows as $row) {
        $files[] = [
            'id' => (int)$row['id'],
            'path' => $row['path'],
            'url' => $row['path'], // 站点相对路径，由前端 utils/path.js 统一转换
            'type' => mediaTypeFromMime($row['mime_type']),
            'size' => (int)$row['file_size'],
            'modified_at' => $row['created_at'],
            'original_name' => $row['original_name'],
            'mime_type' => $row['mime_type']
        ];
    }

    success([
        'files' => $files
    ], 'Media list retrieved successfully');
} catch (PDOException $e) {
    serverError('Failed to get media list: ' . $e->getMessage());
}