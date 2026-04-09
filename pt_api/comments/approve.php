<?php
/**
 * PeachtreesCMS API - Approve Comment
 * PUT /api/comments/approve.php
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
$status = intval($input['status'] ?? 1);

// Validate input
if ($id <= 0) {
    error('Invalid comment ID');
}

if (!in_array($status, [0, 1, 2])) {
    error('Invalid status value');
}

// Status descriptions
$statusText = [
    0 => 'Pending',
    1 => 'Approved',
    2 => 'Rejected'
];

try {
    $pdo = getDB();
    
    // Check if comment exists
    $checkStmt = $pdo->prepare("SELECT id, status, user_id FROM pt_comments WHERE id = ?");
    $checkStmt->execute([$id]);
    $comment = $checkStmt->fetch();
    
    if (!$comment) {
        notFound('Comment not found');
    }
    
    // Update comment status
    $sql = "UPDATE pt_comments SET status = ?, updated_at = NOW() WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$status, $id]);

    // Auto whitelist rules:
    // 1) Cumulative >=3 approved comments -> trusted
    // 2) Cumulative >=2 rejected comments -> blocked (if currently trusted, don't auto-downgrade)
    try {
        $userId = intval($comment['user_id'] ?? 0);
        if ($userId > 0 && in_array($status, [1, 2], true)) {
            $wlStmt = $pdo->prepare("SELECT status FROM pt_commenter_whitelist WHERE comment_user_id = ? LIMIT 1");
            $wlStmt->execute([$userId]);
            $wl = $wlStmt->fetch();
            $currentWlStatus = $wl['status'] ?? null;

            if ($status === 1 && $currentWlStatus !== 'blocked') {
                $approvedCountStmt = $pdo->prepare("SELECT COUNT(*) AS cnt FROM pt_comments WHERE user_id = ? AND status = 1");
                $approvedCountStmt->execute([$userId]);
                $approvedCount = intval($approvedCountStmt->fetch()['cnt'] ?? 0);

                if ($approvedCount >= 3) {
                    $upsertTrustedStmt = $pdo->prepare("
                        INSERT INTO pt_commenter_whitelist (comment_user_id, status, reason, expires_at, created_by, created_at, updated_at)
                        VALUES (?, 'trusted', ?, NULL, NULL, NOW(), NOW())
                        ON DUPLICATE KEY UPDATE
                            status = 'trusted',
                            reason = VALUES(reason),
                            expires_at = NULL,
                            updated_at = NOW()
                    ");
                    $upsertTrustedStmt->execute([$userId, 'Auto: 3+ approved comments']);
                }
            }

            if ($status === 2 && $currentWlStatus !== 'trusted') {
                $rejectedCountStmt = $pdo->prepare("SELECT COUNT(*) AS cnt FROM pt_comments WHERE user_id = ? AND status = 2");
                $rejectedCountStmt->execute([$userId]);
                $rejectedCount = intval($rejectedCountStmt->fetch()['cnt'] ?? 0);

                if ($rejectedCount >= 2) {
                    $upsertBlockedStmt = $pdo->prepare("
                        INSERT INTO pt_commenter_whitelist (comment_user_id, status, reason, expires_at, created_by, created_at, updated_at)
                        VALUES (?, 'blocked', ?, NULL, NULL, NOW(), NOW())
                        ON DUPLICATE KEY UPDATE
                            status = 'blocked',
                            reason = VALUES(reason),
                            expires_at = NULL,
                            updated_at = NOW()
                    ");
                    $upsertBlockedStmt->execute([$userId, 'Auto: 2+ rejected comments']);
                }
            }
        }
    } catch (PDOException $e) {
        // Whitelist table doesn't exist or auto rule write failed, don't affect main comment approval flow
    }
    
    success([
        'id' => $id,
        'status' => $status,
        'status_text' => $statusText[$status]
    ], 'Comment reviewed successfully');
    
} catch (PDOException $e) {
    serverError('Failed to review comment: ' . $e->getMessage());
}
