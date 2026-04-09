<?php
/**
 * PeachtreesCMS API - Update Tag
 * PUT /api/tags/update.php
 * Requires login
 */

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../response.php';
require_once __DIR__ . '/../auth.php';

// Only accept PUT and POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    error('Method not allowed', 405);
}

// Verify login
requireAuth();

// Get request parameters
$input = getJsonInput();
$id = intval($input['id'] ?? 0);
$tag = trim($input['tag'] ?? '');
$tagLocal = trim($input['display_name'] ?? '');

// Validate input
if ($id <= 0) {
    error('Invalid tag ID');
}

if (empty($tag)) {
    error('Tag slug cannot be empty');
}

if (empty($tagLocal)) {
    error('Tag name cannot be empty');
}

// Validate slug format
if (!preg_match('/^[a-zA-Z0-9_-]+$/', $tag)) {
    error('Tag slug can only contain letters, numbers, underscores and hyphens');
}

try {
    $pdo = getDB();
    
    // Check if tag exists
    $checkStmt = $pdo->prepare("SELECT tag FROM pt_tags WHERE id = ?");
    $checkStmt->execute([$id]);
    $oldTag = $checkStmt->fetch();
    
    if (!$oldTag) {
        notFound('Tag not found');
    }
    
    // Check if new slug is already used by another tag
    $dupStmt = $pdo->prepare("SELECT id FROM pt_tags WHERE tag = ? AND id != ?");
    $dupStmt->execute([$tag, $id]);
    if ($dupStmt->fetch()) {
        error('Tag slug already in use');
    }
    
    $oldTagName = $oldTag['tag'];
    
    // Begin transaction
    $pdo->beginTransaction();
    
    try {
        // Update tag
        $updateStmt = $pdo->prepare("UPDATE pt_tags SET tag = ?, display_name = ? WHERE id = ?");
        $updateStmt->execute([$tag, $tagLocal, $id]);
        
        // If slug changed, update posts table
        if ($oldTagName !== $tag) {
            $updatePostsStmt = $pdo->prepare("UPDATE pt_posts SET tag = ? WHERE tag = ?");
            $updatePostsStmt->execute([$tag, $oldTagName]);
        }
        
        $pdo->commit();
        
        success([
            'id' => $id,
            'tag' => $tag,
            'display_name' => $tagLocal
        ], 'Tag updated successfully');
        
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
    
} catch (PDOException $e) {
    serverError('Failed to update tag: ' . $e->getMessage());
}
