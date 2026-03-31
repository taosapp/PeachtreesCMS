<?php
/**
 * PeachtreesCMS API - 获取静态导出进度
 * GET /api/data/export-static-status.php
 * 需要管理员权限
 */

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../response.php';
require_once __DIR__ . '/../auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    error('Method not allowed', 405);
}

requireAdmin();

$statusPath = __DIR__ . '/../../static_html/.export_status.json';
if (!is_file($statusPath)) {
    success([
        'status' => 'idle',
        'progress' => 0,
        'message' => 'No export in progress'
    ]);
}

$raw = file_get_contents($statusPath);
$data = json_decode($raw, true);
if (!is_array($data)) {
    @unlink($statusPath);
    success([
        'status' => 'idle',
        'progress' => 0,
        'message' => 'No export in progress'
    ]);
}

success($data);
