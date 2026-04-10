<?php
/**
 * PeachtreesCMS API - Create Post
 * POST /api/posts/create.php
 * Requires authentication
 */

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../response.php';
require_once __DIR__ . '/../auth.php';

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    error('Method not allowed', 405);
}

// Verify authentication
requireAuth();

// Get request parameters
$input = getJsonInput();
$title = trim($input['title'] ?? '');
$slug = trim($input['slug'] ?? '');
$tag = trim($input['tag'] ?? '');
$postType = trim($input['post_type'] ?? 'normal');
$summary = trim($input['summary'] ?? '');
$coverMedia = $input['cover_media'] ?? [];
$pagePattern = trim($input['page_pattern'] ?? '');
$content = $input['content'] ?? '';
$allowComments = isset($input['allow_comments']) ? intval($input['allow_comments']) : 1;

// Validate input
if (empty($title)) {
    error('Post title cannot be empty');
}

try {
    $pdo = getDB();

    // Validate slug
if (!empty($slug)) {
    // Check slug format: only allow letters, numbers, hyphens and underscores
    if (!preg_match('/^[a-zA-Z0-9_-]+$/', $slug)) {
        error('URL slug can only contain letters, numbers, hyphens and underscores');
    }
    // Check if slug already exists
    $slugCheckStmt = $pdo->prepare("SELECT id FROM pt_posts WHERE slug = ?");
    $slugCheckStmt->execute([$slug]);
    if ($slugCheckStmt->fetch()) {
        error('URL slug already exists');
    }
}

if (empty($tag)) {
    error('Please select a category');
}

if (!in_array($postType, ['normal', 'big-picture'], true)) {
    error('Invalid post type');
}

if (!in_array($allowComments, [0, 1])) {
    error('Invalid comment switch value');
}

if (!is_array($coverMedia)) {
    error('Invalid cover media format');
}

if ($postType === 'big-picture' && count($coverMedia) === 0) {
    error('Big-picture post requires at least one cover media file');
}
    
    // Check if tag exists
    $tagStmt = $pdo->prepare("SELECT tag FROM pt_tags WHERE tag = ?");
    $tagStmt->execute([$tag]);
    if (!$tagStmt->fetch()) {
        error('Selected category does not exist');
    }
    
    // Insert post
    $sql = "INSERT INTO pt_posts (tag, post_type, page_pattern, title, slug, summary, cover_media, content, allow_comments, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $tag,
        $postType,
        $pagePattern !== '' ? $pagePattern : null,
        $title,
        !empty($slug) ? $slug : null,
        $summary,
        json_encode(array_values($coverMedia), JSON_UNESCAPED_UNICODE),
        $content,
        $allowComments
    ]);
    
    $postId = $pdo->lastInsertId();
    
    // Update tag count
    $updateCountStmt = $pdo->prepare("UPDATE pt_tags SET post_count = (SELECT COUNT(*) FROM pt_posts WHERE tag = ?) WHERE tag = ?");
    $updateCountStmt->execute([$tag, $tag]);
    
    success([
        'id' => $postId
    ], 'Post created successfully');
    
} catch (PDOException $e) {
    serverError('Failed to create post: ' . $e->getMessage());
}
