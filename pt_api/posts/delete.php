<?php
/**
 * PeachtreesCMS API - Delete Post
 * DELETE /api/posts/delete.php
 * Requires authentication
 */

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../response.php';
require_once __DIR__ . '/../auth.php';

// Accept DELETE and POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'DELETE' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    error('Method not allowed', 405);
}

// Verify authentication
$currentUser = requireAuth();

// Get request parameters
$input = getJsonInput();
$id = intval($input['id'] ?? 0);

// Also support GET parameter
if ($id <= 0) {
    $id = intval($_GET['id'] ?? 0);
}

if ($id <= 0) {
    error('Invalid post ID');
}

try {
    $pdo = getDB();
    
    // Check if post exists and get its tag and user_id
    $checkStmt = $pdo->prepare("SELECT id, user_id, tag FROM pt_posts WHERE id = ?");
    $checkStmt->execute([$id]);
    $post = $checkStmt->fetch();
    
    if (!$post) {
        notFound('Post not found');
    }

    // Role-based authorization check
    if ((int)($currentUser['role'] ?? 2) !== 1) {
        if ((int)$post['user_id'] !== (int)$currentUser['id']) {
            forbidden('You do not have permission to delete this post');
        }
    }
    
    $tag = $post['tag'];
    
    // Delete post
    $deleteStmt = $pdo->prepare("DELETE FROM pt_posts WHERE id = ?");
    $deleteStmt->execute([$id]);
    
    // Update tag count
    if ($tag) {
        $updateCountStmt = $pdo->prepare("UPDATE pt_tags SET post_count = (SELECT COUNT(*) FROM pt_posts WHERE tag = ?) WHERE tag = ?");
        $updateCountStmt->execute([$tag, $tag]);
    }
    
    success(null, 'Post deleted successfully');
    
} catch (PDOException $e) {
    serverError('Failed to delete post: ' . $e->getMessage());
}
