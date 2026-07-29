<?php
/**
 * PeachtreesCMS API - Authentication Middleware
 * Uses Session for authentication
 */

require_once __DIR__ . '/config.php';

/**
 * Check if user is logged in
 * @return array|null Returns user info or null
 */
function getCurrentUser(): ?array {
    if (!isset($_SESSION['uid'])) {
        return null;
    }
    
    try {
        $pdo = getDB();
        $stmt = $pdo->prepare("SELECT id, username, nickname, email, role FROM pt_users WHERE id = ?");
        $stmt->execute([$_SESSION['uid']]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($user) {
            return [
                'id' => (int)$user['id'],
                'username' => $user['username'],
                'nickname' => $user['nickname'] ?: $user['username'],
                'email' => $user['email'],
                'role' => (int)($user['role'] ?? 2)
            ];
        }
    } catch (Throwable $e) {
        // Fallback to session values if DB is not ready
    }

    if (!isset($_SESSION['user'])) {
        return null;
    }
    return [
        'id' => $_SESSION['uid'],
        'username' => $_SESSION['user'],
        'role' => (int)($_SESSION['role'] ?? 2)
    ];
}

/**
 * Require user to be logged in
 * Returns 401 error if not logged in
 * @return array User info
 */
function requireAuth(): array {
    $user = getCurrentUser();
    if (!$user) {
        require_once __DIR__ . '/response.php';
        unauthorized('Please login first');
    }
    return $user;
}

/**
 * Check if user is admin (role = 1)
 * @return bool
 */
function isAdmin(): bool {
    $user = getCurrentUser();
    return $user && (int)($user['role'] ?? 2) === 1;
}

/**
 * Require admin privileges
 * Returns 403 error if not admin
 */
function requireAdmin(): void {
    requireAuth();
    if (!isAdmin()) {
        require_once __DIR__ . '/response.php';
        forbidden('Admin privileges required');
    }
}
