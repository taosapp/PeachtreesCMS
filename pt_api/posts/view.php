<?php
/**
 * PeachtreesCMS API - Get Post Details
 * GET /api/posts/view.php?id=1
 */

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../response.php';

// Only accept GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    error('Method not allowed', 405);
}

// Get post identifier (can be slug or id)
$identifier = $_GET['id'] ?? $_GET['slug'] ?? '';

if (empty($identifier)) {
    error('Invalid post identifier');
}

try {
    $pdo = getDB();

    // Determine if it's a numeric ID or slug
    $isNumericId = is_numeric($identifier);

    // Get current post - use OR condition to match both id and slug
    if ($isNumericId) {
        $sql = "SELECT p.id, p.tag, p.post_type, p.title, p.slug, p.summary, p.cover_media, p.content, p.allow_comments, p.active, p.created_at, p.updated_at,
                t.display_name
                FROM pt_posts p
                LEFT JOIN pt_tags t ON p.tag = t.tag
                WHERE p.id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([intval($identifier)]);
    } else {
        $sql = "SELECT p.id, p.tag, p.post_type, p.title, p.slug, p.summary, p.cover_media, p.content, p.allow_comments, p.active, p.created_at, p.updated_at,
                t.display_name
                FROM pt_posts p
                LEFT JOIN pt_tags t ON p.tag = t.tag
                WHERE p.slug = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$identifier]);
    }
    $post = $stmt->fetch();

    if (!$post) {
        notFound('Post not found');
    }

    // Check if post is published
    if ($post['active'] != 1) {
        notFound('Post not found');
    }

    $coverMedia = json_decode($post['cover_media'] ?? '[]', true);
    $coverMedia = is_array($coverMedia) ? $coverMedia : [];
    $post['cover_media'] = array_map(function ($path) {
        if (is_string($path) && str_starts_with($path, 'upload/bigpicture/')) {
            return 'pt_upload/media/' . substr($path, strlen('upload/bigpicture/'));
        }
        return $path;
    }, $coverMedia);

    // Get previous post (most recent post with smaller ID that is published)
    $prevSql = "SELECT id, title, slug FROM pt_posts WHERE id < ? AND active = 1 ORDER BY id DESC LIMIT 1";
    $prevStmt = $pdo->prepare($prevSql);
    $prevStmt->execute([$post['id']]);
    $post['prev_post'] = $prevStmt->fetch();

    // Get next post (most recent post with larger ID that is published)
    $nextSql = "SELECT id, title, slug FROM pt_posts WHERE id > ? AND active = 1 ORDER BY id ASC LIMIT 1";
    $nextStmt = $pdo->prepare($nextSql);
    $nextStmt->execute([$post['id']]);
    $post['next_post'] = $nextStmt->fetch();

    success($post);

} catch (PDOException $e) {
    serverError('Failed to get post: ' . $e->getMessage());
}
