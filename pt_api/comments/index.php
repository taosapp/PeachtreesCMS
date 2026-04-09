<?php
/**
 * PeachtreesCMS API - Get Comment List
 * GET /api/comments/index.php
 */

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../response.php';
require_once __DIR__ . '/../auth.php';

// Only accept GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    error('Method not allowed', 405);
}

// Get request parameters
$postId = intval($_GET['post_id'] ?? 0);
$status = intval($_GET['status'] ?? 1); // Default only show approved comments
$page = max(1, intval($_GET['page'] ?? 1));
$pageSize = max(1, min(100, intval($_GET['page_size'] ?? 20)));
$flat = isset($_GET['flat']) && $_GET['flat'] === '1'; // Whether to return flat list (admin needs this)

// Check if admin privileges are needed (to view all status comments)
$isAdmin = isAdmin();

// Validate input
// If not admin, must provide post_id
if (!$isAdmin && $postId <= 0) {
    error('Invalid post ID');
}

try {
    $pdo = getDB();

    // If post_id is provided, check if post exists
    if ($postId > 0) {
        $postStmt = $pdo->prepare("SELECT id FROM pt_posts WHERE id = ?");
        $postStmt->execute([$postId]);
        if (!$postStmt->fetch()) {
            notFound('Post not found');
        }
    }

    // Build query conditions
    $whereConditions = [];
    $params = [];

    if ($postId > 0) {
        $whereConditions[] = "c.post_id = ?";
        $params[] = $postId;
    }

    if ($isAdmin) {
        // Admin can view all status comments
        if ($status > 0) {
            $whereConditions[] = "c.status = ?";
            $params[] = $status;
        }
    } else {
        // Regular users can only see approved comments
        $whereConditions[] = "c.status = 1";
    }

    // If no where conditions, use 1=1
    if (empty($whereConditions)) {
        $whereClause = "1=1";
    } else {
        $whereClause = implode(' AND ', $whereConditions);
    }
    // Calculate total count
    $countSql = "SELECT COUNT(*) as total FROM pt_comments c WHERE " . $whereClause;
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute($params);
    $total = $countStmt->fetch()['total'];

    // Get comment list
    $offset = ($page - 1) * $pageSize;
    $sql = "SELECT
                c.id,
                c.post_id,
                c.user_id,
                c.content,
                c.status,
                c.parent_id,
                c.created_at,
                cu.email,
                cu.nickname,
                cu.website,
                cu.avatar
            FROM pt_comments c
            LEFT JOIN pt_comment_users cu ON c.user_id = cu.id
            WHERE " . $whereClause . "
            ORDER BY c.created_at DESC
            LIMIT ? OFFSET ?";

    $params[] = $pageSize;
    $params[] = $offset;

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $comments = $stmt->fetchAll();

    // Based on flat parameter, decide whether to return tree structure or flat list
    if ($flat) {
        // Return flat list (admin needs this)
        $finalComments = $comments;
    } else {
        // Build tree structure (handle replies)
        $commentMap = [];
        $rootComments = [];

        foreach ($comments as $comment) {
            $commentMap[$comment['id']] = $comment;
            $comment['replies'] = [];
            $comment['can_reply'] = true; // Whether can reply
        }

        foreach ($comments as $comment) {
            if ($comment['parent_id'] === null) {
                $rootComments[] = &$commentMap[$comment['id']];
            } else {
                if (isset($commentMap[$comment['parent_id']])) {
                    $commentMap[$comment['parent_id']]['replies'][] = &$commentMap[$comment['id']];
                }
            }
        }

        $finalComments = $rootComments;
    }

    success([
        'comments' => $finalComments,
        'pagination' => [
            'page' => $page,
            'page_size' => $pageSize,
            'total' => $total,
            'total_pages' => ceil($total / $pageSize)
        ],
        'is_admin' => $isAdmin
    ], 'Comment list retrieved successfully');

} catch (PDOException $e) {
    serverError('Failed to get comment list: ' . $e->getMessage());
}
