<?php
/**
 * PeachtreesCMS API - Create Tag
 * POST /api/tags/create.php
 * Requires login
 */

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../response.php';
require_once __DIR__ . '/../auth.php';

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    error('Method not allowed', 405);
}

// Verify login
requireAuth();

// Get request parameters
$input = getJsonInput();
$tag = trim($input['tag'] ?? '');
$tagLocal = trim($input['display_name'] ?? '');

// Validate input
if (empty($tag)) {
    error('Tag slug cannot be empty');
}

if (empty($tagLocal)) {
    error('Tag name cannot be empty');
}

// Validate slug format (only letters, numbers, underscores, hyphens)
if (!preg_match('/^[a-zA-Z0-9_-]+$/', $tag)) {
    error('Tag slug can only contain letters, numbers, underscores and hyphens');
}

try {
    $pdo = getDB();
    
    // Check if tag already exists
    $checkStmt = $pdo->prepare("SELECT id FROM pt_tags WHERE tag = ?");
    $checkStmt->execute([$tag]);
    if ($checkStmt->fetch()) {
        error('Tag slug already exists');
    }
    
    // Insert tag
    $sql = "INSERT INTO pt_tags (tag, display_name, post_count) VALUES (?, ?, 0)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$tag, $tagLocal]);
    
    $tagId = $pdo->lastInsertId();
    
    success([
        'id' => $tagId,
        'tag' => $tag,
        'display_name' => $tagLocal,
        'post_count' => 0
    ], 'Tag created successfully');
    
} catch (PDOException $e) {
    serverError('Failed to create tag: ' . $e->getMessage());
}
