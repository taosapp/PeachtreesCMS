<?php
/**
 * PeachtreesCMS API - Set Comment Whitelist Status
 * PUT /api/comments/whitelist-set.php
 * Requires admin privileges
 */

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../response.php';
require_once __DIR__ . '/../auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    error('Method not allowed', 405);
}

$admin = requireAdmin();

$input = getJsonInput();
$email = strtolower(trim($input['email'] ?? ''));
$status = trim($input['status'] ?? '');
$reason = trim($input['reason'] ?? '');
$expiresAt = trim($input['expires_at'] ?? '');

if ($email === '') {
    error('Email cannot be empty');
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    error('Invalid email format');
}
match ($status) {
    'trusted', 'blocked', 'none' => true,
    default => error('Invalid status value')
};

$expiresAtValue = null;
if ($expiresAt !== '') {
    $ts = strtotime($expiresAt);
    if ($ts === false) {
        error('Invalid expiration time format');
    }
    $expiresAtValue = date('Y-m-d H:i:s', $ts);
}

try {
    $pdo = getDB();

    $userStmt = $pdo->prepare("SELECT id FROM pt_comment_users WHERE email = ?");
    $userStmt->execute([$email]);
    $commentUser = $userStmt->fetch();
    if (!$commentUser) {
        notFound('This email has not commented yet, cannot set whitelist');
    }
    $commentUserId = intval($commentUser['id']);

    if ($status === 'none') {
        $deleteStmt = $pdo->prepare("DELETE FROM pt_commenter_whitelist WHERE comment_user_id = ?");
        $deleteStmt->execute([$commentUserId]);
        success([
            'email' => $email,
            'status' => 'none',
        ], 'Removed from whitelist');
    }

    $upsertSql = "
        INSERT INTO pt_commenter_whitelist
            (comment_user_id, status, reason, expires_at, created_by, created_at, updated_at)
        VALUES
            (?, ?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
            status = VALUES(status),
            reason = VALUES(reason),
            expires_at = VALUES(expires_at),
            created_by = VALUES(created_by),
            updated_at = NOW()
    ";
    $upsertStmt = $pdo->prepare($upsertSql);
    $upsertStmt->execute([
        $commentUserId,
        $status,
        $reason === '' ? null : $reason,
        $expiresAtValue,
        intval($admin['id'] ?? 0) ?: null,
    ]);

    success([
        'email' => $email,
        'status' => $status,
        'expires_at' => $expiresAtValue,
    ], 'Whitelist status updated');
} catch (PDOException $e) {
    serverError('Failed to set whitelist: ' . $e->getMessage());
}

