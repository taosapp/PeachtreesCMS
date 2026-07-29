<?php
/**
 * PeachtreesCMS API - Delete User
 * DELETE /api/users/delete.php
 * Requires admin privileges
 */

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../response.php';
require_once __DIR__ . '/../auth.php';

// Accept DELETE and POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'DELETE' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    error('Method not allowed', 405);
}

// Verify admin privileges
requireAdmin();

// Get request parameters
$input = getJsonInput();
$id = intval($input['id'] ?? 0);

// Also support GET parameter
if ($id <= 0) {
    $id = intval($_GET['id'] ?? 0);
}

if ($id <= 0) {
    error('Invalid user ID');
}

// Cannot delete admin (uid = 1)
if ($id === 1) {
    error('Cannot delete admin account');
}

try {
    $pdo = getDB();
    
    // Check if user exists
    $checkStmt = $pdo->prepare("SELECT id, username FROM pt_users WHERE id = ?");
    $checkStmt->execute([$id]);
    $user = $checkStmt->fetch();
    
    if (!$user) {
        notFound('User not found');
    }

    // Delete user and handle their posts inside a transaction
    $pdo->beginTransaction();
    try {
        // 1. Unpublish all posts of this user (set active = 0)
        $updatePostsStmt = $pdo->prepare("UPDATE pt_posts SET active = 0 WHERE user_id = ?");
        $updatePostsStmt->execute([$id]);

        // 2. Delete the user
        $deleteStmt = $pdo->prepare("DELETE FROM pt_users WHERE id = ?");
        $deleteStmt->execute([$id]);

        $pdo->commit();
    } catch (PDOException $e) {
        $pdo->rollBack();
        throw $e;
    }
    
    success(null, 'User deleted successfully');
    
} catch (PDOException $e) {
    serverError('Failed to delete user: ' . $e->getMessage());
}
