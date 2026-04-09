<?php
/**
 * PeachtreesCMS API - Delete Tag
 * DELETE /api/tags/delete.php
 * Requires login
 */

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../response.php';
require_once __DIR__ . '/../auth.php';

// Accept DELETE and POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'DELETE' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    error('Method not allowed', 405);
}

// Verify login
requireAuth();

// Get request parameters
$input = getJsonInput();
$id = intval($input['id'] ?? 0);

// Also support GET parameter
if ($id <= 0) {
    $id = intval($_GET['id'] ?? 0);
}

if ($id <= 0) {
    error('Invalid tag ID');
}

try {
    $pdo = getDB();
    
    // Check if tag exists
    $checkStmt = $pdo->prepare("SELECT id, tag FROM pt_tags WHERE id = ?");
    $checkStmt->execute([$id]);
    $tag = $checkStmt->fetch();
    
    if (!$tag) {
        notFound('Tag not found');
    }
    
    // Check if any posts use this tag
    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM pt_posts WHERE tag = ?");
    $countStmt->execute([$tag['tag']]);
    $postCount = $countStmt->fetchColumn();
    
    if ($postCount > 0) {
        error("Cannot delete: {$postCount} posts are using this tag");
    }
    
    // Delete tag
    $deleteStmt = $pdo->prepare("DELETE FROM pt_tags WHERE id = ?");
    $deleteStmt->execute([$id]);
    
    success(null, 'Tag deleted successfully');
    
} catch (PDOException $e) {
    serverError('Failed to delete tag: ' . $e->getMessage());
}
