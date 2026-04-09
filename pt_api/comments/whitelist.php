<?php
/**
 * PeachtreesCMS API - Comment Whitelist List
 * GET /api/comments/whitelist.php
 * Requires admin privileges
 */

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../response.php';
require_once __DIR__ . '/../auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    error('Method not allowed', 405);
}

requireAdmin();

$keyword = trim($_GET['keyword'] ?? '');
$status = trim($_GET['status'] ?? '');
$page = max(1, intval($_GET['page'] ?? 1));
$pageSize = max(1, min(100, intval($_GET['page_size'] ?? 20)));

try {
    $pdo = getDB();

    $conditions = [];
    $params = [];

    if ($keyword !== '') {
        $conditions[] = "(cu.email LIKE ? OR cu.nickname LIKE ?)";
        $like = '%' . $keyword . '%';
        $params[] = $like;
        $params[] = $like;
    }

    match ($status) {
        'trusted', 'blocked' => $conditions[] = "cw.status = ?",
        default => null
    };
    if (in_array($status, ['trusted', 'blocked'], true)) {
        $params[] = $status;
    }
    $whereClause = empty($conditions) ? '1=1' : implode(' AND ', $conditions);

    $countSql = "SELECT COUNT(*) AS total
                 FROM pt_commenter_whitelist cw
                 INNER JOIN pt_comment_users cu ON cu.id = cw.comment_user_id
                 WHERE {$whereClause}";
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute($params);
    $total = intval($countStmt->fetch()['total'] ?? 0);

    $offset = ($page - 1) * $pageSize;

    $sql = "SELECT
                cw.id,
                cw.comment_user_id,
                cw.status,
                cw.reason,
                cw.expires_at,
                cw.created_by,
                cw.created_at,
                cw.updated_at,
                cu.email,
                cu.nickname,
                cu.website
            FROM pt_commenter_whitelist cw
            INNER JOIN pt_comment_users cu ON cu.id = cw.comment_user_id
            WHERE {$whereClause}
            ORDER BY cw.updated_at DESC, cw.id DESC
            LIMIT ? OFFSET ?";
    $queryParams = $params;
    $queryParams[] = $pageSize;
    $queryParams[] = $offset;
    $stmt = $pdo->prepare($sql);
    $stmt->execute($queryParams);
    $items = $stmt->fetchAll();

    success([
        'items' => $items,
        'pagination' => [
            'page' => $page,
            'page_size' => $pageSize,
            'total' => $total,
            'total_pages' => max(1, intval(ceil($total / $pageSize))),
        ]
    ], 'Whitelist retrieved successfully');
} catch (PDOException $e) {
    serverError('Failed to get whitelist: ' . $e->getMessage());
}

