<?php
/**
 * PeachtreesCMS API - Create User
 * POST /api/users/create.php
 * Requires admin privileges
 */

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../response.php';
require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../password.php';

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    error('Method not allowed', 405);
}

// Verify admin privileges
requireAdmin();

// Get request parameters
$input = getJsonInput();
$username = trim($input['username'] ?? '');
$email = trim($input['email'] ?? '');
$password = $input['password'] ?? '';

// Validate input
if (empty($username)) {
    error('Username cannot be empty');
}

if (empty($email)) {
    error('Email cannot be empty');
}

if (empty($password)) {
    error('Password cannot be empty');
}

if (strlen($password) < 6) {
    error('Password must be at least 6 characters');
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    error('Invalid email format');
}

try {
    $pdo = getDB();
    
    // Check if username already exists
    $checkUserStmt = $pdo->prepare("SELECT id FROM pt_users WHERE username = ?");
    $checkUserStmt->execute([$username]);
    if ($checkUserStmt->fetch()) {
        error('Username already exists');
    }
    
    // Check if email already exists
    $checkEmailStmt = $pdo->prepare("SELECT id FROM pt_users WHERE email = ?");
    $checkEmailStmt->execute([$email]);
    if ($checkEmailStmt->fetch()) {
        error('Email already in use');
    }

    // Hash password
    $hashedPassword = hashPassword($password);

    // Insert user
    $sql = "INSERT INTO pt_users (username, email, password_hash, created_at, last_login_at) VALUES (?, ?, ?, NOW(), NOW())";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$username, $email, $hashedPassword]);
    
    $userId = $pdo->lastInsertId();
    
    success([
        'id' => $userId,
        'username' => $username,
        'email' => $email
    ], 'User created successfully');
    
} catch (PDOException $e) {
    serverError('Failed to create user: ' . $e->getMessage());
}
