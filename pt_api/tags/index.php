<?php
/**
 * PeachtreesCMS API - Get Tag List
 * GET /api/tags/index.php
 */

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../response.php';

// Only accept GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    error('Method not allowed', 405);
}

try {
    $pdo = getDB();
    
    $sql = "SELECT id, tag, display_name, post_count FROM pt_tags ORDER BY id ASC";
    $stmt = $pdo->query($sql);
    $tags = $stmt->fetchAll();
    
    success($tags);
    
} catch (PDOException $e) {
    serverError('Failed to get tag list: ' . $e->getMessage());
}
