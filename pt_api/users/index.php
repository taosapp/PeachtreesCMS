<?php
/**
 * PeachtreesCMS API - Get User List
 * GET /api/users/index.php
 * Requires admin privileges
 */

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../response.php';
require_once __DIR__ . '/../auth.php';

// Only accept GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    error('Method not allowed', 405);
}

// Verify admin privileges
requireAdmin();

try {
    $pdo = getDB();
    
    $sql = "SELECT id, username, email, created_at, last_login_at FROM pt_users ORDER BY id ASC";
    $stmt = $pdo->query($sql);
    $users = $stmt->fetchAll();
    
    success($users);
    
} catch (PDOException $e) {
    serverError('Failed to get user list: ' . $e->getMessage());
}
