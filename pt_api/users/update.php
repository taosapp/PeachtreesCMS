<?php
/**
 * PeachtreesCMS API - Update User Info
 * PUT /api/users/update.php
 * Requires login
 */

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../response.php';
require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../password.php';

// Only accept PUT or POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    error('Method not allowed', 405);
}

// Get logged in user
$currentUser = requireAuth();
$currentUid = (int)$currentUser['id'];

$input = getJsonInput();
$targetUid = isset($input['id']) ? (int)$input['id'] : $currentUid;

// Role and authority verification
if ($targetUid !== $currentUid) {
    // Editing another user requires admin privileges
    requireAdmin();
}

$nickname = trim($input['nickname'] ?? '');
$email = trim($input['email'] ?? '');
$password = $input['password'] ?? ''; // Optional, if empty, do not update password

// Validate email if provided
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    error('Invalid email format');
}

try {
    $pdo = getDB();

    // Fetch existing user details
    $stmt = $pdo->prepare("SELECT username, email FROM pt_users WHERE id = ?");
    $stmt->execute([$targetUid]);
    $targetUser = $stmt->fetch();

    if (!$targetUser) {
        error('User does not exist');
    }

    // Only allow editing username if the current user is admin AND is editing someone else
    $newUsername = $targetUser['username'];
    if ($targetUid !== $currentUid && isAdmin()) {
        $proposedUsername = trim($input['username'] ?? '');
        if ($proposedUsername !== '' && $proposedUsername !== $targetUser['username']) {
            // Check if proposed username already exists
            $checkStmt = $pdo->prepare("SELECT id FROM pt_users WHERE username = ? AND id != ?");
            $checkStmt->execute([$proposedUsername, $targetUid]);
            if ($checkStmt->fetch()) {
                error('Username already exists');
            }
            $newUsername = $proposedUsername;
        }
    }

    // Check if proposed email already exists
    if ($email !== '' && $email !== $targetUser['email']) {
        $checkEmailStmt = $pdo->prepare("SELECT id FROM pt_users WHERE email = ? AND id != ?");
        $checkEmailStmt->execute([$email, $targetUid]);
        if ($checkEmailStmt->fetch()) {
            error('Email is already in use');
        }
    }

    // Prepare fields to update
    $fields = [];
    $params = [];

    // Username (only updated if modified)
    $fields[] = "`username` = ?";
    $params[] = $newUsername;

    // Nickname
    $fields[] = "`nickname` = ?";
    $params[] = $nickname !== '' ? $nickname : null;

    // Role (only admin can change roles of other users)
    if ($targetUid !== $currentUid && isAdmin() && isset($input['role'])) {
        $proposedRole = (int)$input['role'];
        if ($proposedRole === 1 || $proposedRole === 2) {
            $fields[] = "`role` = ?";
            $params[] = $proposedRole;
        }
    }

    // Email
    if ($email !== '') {
        $fields[] = "`email` = ?";
        $params[] = $email;
    }

    // Password
    if ($password !== '') {
        if (strlen($password) < 6) {
            error('Password must be at least 6 characters long');
        }
        $fields[] = "`password_hash` = ?";
        $params[] = hashPassword($password);
    }

    // Run update query
    $params[] = $targetUid;
    $updateSql = "UPDATE pt_users SET " . implode(', ', $fields) . " WHERE id = ?";
    $updateStmt = $pdo->prepare($updateSql);
    $updateStmt->execute($params);

    // If updating oneself, update session username
    if ($targetUid === $currentUid) {
        $_SESSION['user'] = $newUsername;
    }

    success(null, 'User profile updated successfully');

} catch (PDOException $e) {
    serverError('Failed to update user profile: ' . $e->getMessage());
}
