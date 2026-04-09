<?php
/**
 * PeachtreesCMS API - Get Post List
 * GET /api/posts/index.php
 * Parameters: page, perPage, tag
 */

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../response.php';

// Only accept GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    error('Method not allowed', 405);
}

// Get pagination parameters
$page = max(1, intval($_GET['page'] ?? 1));
$perPage = max(1, min(100, intval($_GET['perPage'] ?? 10)));
$tag = $_GET['tag'] ?? null;
$showInactive = isset($_GET['showInactive']) && $_GET['showInactive'] === 'true';
$offset = ($page - 1) * $perPage;

try {
    $pdo = getDB();

    // Build query conditions
    $conditions = [];
    $params = [];

    if ($tag) {
        $conditions[] = "p.tag = ?";
        $params[] = $tag;
    }

    // By default only show published posts
    if (!$showInactive) {
        $conditions[] = "p.active = 1";
    }

    $whereClause = !empty($conditions) ? "WHERE " . implode(" AND ", $conditions) : "";

    // Get total count
    $countSql = "SELECT COUNT(*) FROM pt_posts p $whereClause";
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute($params);
    $total = $countStmt->fetchColumn();
    
    // Get post list
    $listSql = "SELECT p.id, p.tag, p.post_type, p.title, p.slug, p.summary, p.cover_media, p.content, p.allow_comments, p.active, p.created_at, p.updated_at,
                t.display_name
                FROM pt_posts p
                LEFT JOIN pt_tags t ON p.tag = t.tag
                $whereClause
                ORDER BY p.created_at DESC
                LIMIT ? OFFSET ?";

    $listStmt = $pdo->prepare($listSql);

    // Bind parameters
    $paramIndex = 1;
    foreach ($params as $param) {
        $listStmt->bindValue($paramIndex++, $param, PDO::PARAM_STR);
    }
    $listStmt->bindValue($paramIndex++, $perPage, PDO::PARAM_INT);
    $listStmt->bindValue($paramIndex, $offset, PDO::PARAM_INT);

    $listStmt->execute();
    $posts = $listStmt->fetchAll();
    
    // Process post excerpts
    foreach ($posts as &$post) {
        $coverMedia = json_decode($post['cover_media'] ?? '[]', true);
        $coverMedia = is_array($coverMedia) ? $coverMedia : [];
        $post['cover_media'] = array_map(function ($path) {
            if (is_string($path) && str_starts_with($path, 'upload/bigpicture/')) {
                return 'pt_upload/media/' . substr($path, strlen('upload/bigpicture/'));
            }
            return $path;
        }, $coverMedia);

        // Generate excerpt (remove HTML tags, take first 200 characters)
        $summarySource = trim($post['summary'] ?? '') !== '' ? $post['summary'] : $post['content'];
        $plainText = strip_tags($summarySource);
        $post['excerpt'] = mb_substr($plainText, 0, 200, 'UTF-8');
        if (mb_strlen($plainText, 'UTF-8') > 200) {
            $post['excerpt'] .= '...';
        }
    }
    
    success([
        'posts' => $posts,
        'pagination' => [
            'page' => $page,
            'perPage' => $perPage,
            'total' => intval($total),
            'totalPages' => ceil($total / $perPage)
        ],
        '_debug' => [
            'tag' => $tag,
            'showInactive' => $showInactive,
            'where' => $whereClause,
            'total_raw' => $total
        ]
    ]);
    
} catch (PDOException $e) {
    serverError('Failed to get post list: ' . $e->getMessage());
}
