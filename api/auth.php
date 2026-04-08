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
    if (!isset($_SESSION['uid']) || !isset($_SESSION['user'])) {
        return null;
    }
    return [
        'id' => $_SESSION['uid'],
        'username' => $_SESSION['user']
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
 * Check if user is admin (uid = 1)
 * @return bool
 */
function isAdmin(): bool {
    return isset($_SESSION['uid']) && $_SESSION['uid'] === 1;
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
