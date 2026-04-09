<?php
/**
 * PeachtreesCMS API - Toggle Post Publication Status
 * PUT /api/posts/toggle-active.php
 * Requires authentication
 */

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../response.php';
require_once __DIR__ . '/../auth.php';

// Only accept PUT and POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    error('Method not allowed', 405);
}

// Verify authentication
requireAuth();

// Get request parameters
$input = getJsonInput();
$id = intval($input['id'] ?? 0);

// Validate input
if ($id <= 0) {
    error('Invalid post ID');
}

try {
    $pdo = getDB();
    
    // Check if post exists
    $checkStmt = $pdo->prepare("SELECT id, active FROM pt_posts WHERE id = ?");
    $checkStmt->execute([$id]);
    $post = $checkStmt->fetch();
    
    if (!$post) {
        notFound('Post not found');
    }

    // Toggle active status
    $newActive = $post['active'] == 1 ? 0 : 1;
    
    // Update post status
    $sql = "UPDATE pt_posts SET active = ?, updated_at = NOW() WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$newActive, $id]);
    
    success([
        'id' => $id,
        'active' => $newActive
    ], $newActive == 1 ? 'Post published' : 'Post unpublished');
    
} catch (PDOException $e) {
    serverError('Failed to toggle post status: ' . $e->getMessage());
}
