<?php
/**
 * PeachtreesCMS API - Change Password
 * PUT /api/users/update-password.php
 * Requires login
 */

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../response.php';
require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../password.php';

// Only accept PUT and POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    error('Method not allowed', 405);
}

// Verify login
$user = requireAuth();

// Get request parameters
$input = getJsonInput();
$oldPassword = $input['oldPassword'] ?? '';
$newPassword = $input['newPassword'] ?? '';
$confirmPassword = $input['confirmPassword'] ?? '';

// Validate input
if (empty($oldPassword)) {
    error('Please enter current password');
}

if (empty($newPassword)) {
    error('Please enter new password');
}

if (strlen($newPassword) < 6) {
    error('Password must be at least 6 characters');
}

if ($newPassword !== $confirmPassword) {
    error('Passwords do not match');
}

try {
    $pdo = getDB();
    
    // Get current user's password
    $stmt = $pdo->prepare("SELECT password_hash FROM pt_users WHERE id = ?");
    $stmt->execute([$user['id']]);
    $currentUser = $stmt->fetch();
    
    if (!$currentUser) {
        error('User not found');
    }

    // Verify current password
    if (!verifyPassword($oldPassword, $currentUser['password_hash'])) {
        error('Current password is incorrect');
    }

    // Hash new password
    $hashedPassword = hashPassword($newPassword);

    // Update password
    $updateStmt = $pdo->prepare("UPDATE pt_users SET password_hash = ? WHERE id = ?");
    $updateStmt->execute([$hashedPassword, $user['id']]);
    
    success(null, 'Password changed successfully');
    
} catch (PDOException $e) {
    serverError('Failed to change password: ' . $e->getMessage());
}
