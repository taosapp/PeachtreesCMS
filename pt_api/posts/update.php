<?php
/**
 * PeachtreesCMS API - Update Post
 * PUT /api/posts/update.php
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
$title = trim($input['title'] ?? '');
$tag = trim($input['tag'] ?? '');
$postType = trim($input['post_type'] ?? 'normal');
$summary = trim($input['summary'] ?? '');
$coverMedia = $input['cover_media'] ?? [];
$content = $input['content'] ?? '';
$allowComments = isset($input['allow_comments']) ? intval($input['allow_comments']) : null;

// Handle slug - if not provided or empty string, set to null (use ID as URL)
$slug = null;
if (array_key_exists('slug', $input)) {
    $slug = trim($input['slug']);
    if ($slug === '') {
        $slug = null;
    }
}

// Validate input (no database connection needed)
if ($id <= 0) {
    error('Invalid post ID');
}

if (empty($title)) {
    error('Post title cannot be empty');
}

if (empty($tag)) {
    error('Please select a category');
}

if (!in_array($postType, ['normal', 'big-picture'], true)) {
    error('Invalid post type');
}

if ($allowComments !== null && !in_array($allowComments, [0, 1])) {
    error('Invalid comment switch value');
}

if (!is_array($coverMedia)) {
    error('Invalid cover media format');
}

if ($postType === 'big-picture' && count($coverMedia) === 0) {
    error('Big-picture post requires at least one cover media file');
}

try {
    $pdo = getDB();

    // Validate slug (if provided, need database connection to check for duplicates)
    if ($slug !== null && $slug !== '') {
        // Check slug format: only allow letters, numbers, hyphens and underscores
        if (!preg_match('/^[a-zA-Z0-9_-]+$/', $slug)) {
            error('URL slug can only contain letters, numbers, hyphens and underscores');
        }
        // Check if slug is already used by another post
        $slugCheckStmt = $pdo->prepare("SELECT id FROM pt_posts WHERE slug = ? AND id != ?");
        $slugCheckStmt->execute([$slug, $id]);
        if ($slugCheckStmt->fetch()) {
            error('URL slug already exists');
        }
    }

    // Check if post exists
    $checkStmt = $pdo->prepare("SELECT id, tag, post_type, slug, summary, cover_media, allow_comments FROM pt_posts WHERE id = ?");
    $checkStmt->execute([$id]);
    $oldPost = $checkStmt->fetch();

    if (!$oldPost) {
        notFound('Post not found');
    }

    $oldTag = $oldPost['tag'];

    // Handle default values
    if (!array_key_exists('post_type', $input)) {
        $postType = $oldPost['post_type'];
    }

    if ($allowComments === null) {
        $allowComments = $oldPost['allow_comments'];
    }

    if (!array_key_exists('summary', $input)) {
        $summary = $oldPost['summary'] ?? '';
    }

    if (!array_key_exists('cover_media', $input)) {
        $coverMedia = json_decode($oldPost['cover_media'] ?? '[]', true);
        if (!is_array($coverMedia)) {
            $coverMedia = [];
        }
    }

    // Handle final slug value
    if (!array_key_exists('slug', $input)) {
        // Slug field not provided, keep original value
        $slug = $oldPost['slug'];
    } elseif ($slug === '' || $slug === null) {
        // Empty value provided, user wants to clear slug
        $slug = null;
    } elseif ($slug === $oldPost['slug']) {
        // Slug value unchanged, keep original value
        $slug = $oldPost['slug'];
    }
    // Otherwise, user set a new slug value, use the new value

    // Update post
    $sql = "UPDATE pt_posts SET tag = ?, post_type = ?, title = ?, slug = ?, summary = ?, cover_media = ?, content = ?, allow_comments = ?, updated_at = NOW() WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $tag,
        $postType,
        $title,
        $slug,
        $summary,
        json_encode(array_values($coverMedia), JSON_UNESCAPED_UNICODE),
        $content,
        $allowComments,
        $id
    ]);

    // Update old and new tag counts
    if ($oldTag != $tag) {
        $updateOldTag = $pdo->prepare("UPDATE pt_tags SET post_count = (SELECT COUNT(*) FROM pt_posts WHERE tag = ?) WHERE tag = ?");
        $updateOldTag->execute([$oldTag, $oldTag]);
    }
    $updateNewTag = $pdo->prepare("UPDATE pt_tags SET post_count = (SELECT COUNT(*) FROM pt_posts WHERE tag = ?) WHERE tag = ?");
    $updateNewTag->execute([$tag, $tag]);

    success([
        'id' => $id
    ], 'Post updated successfully');

} catch (PDOException $e) {
    serverError('Failed to update post: ' . $e->getMessage());
}
