<?php
/**
 * PeachtreesCMS API - User Logout
 * POST /api/auth/logout.php
 */

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../response.php';

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    error('Method not allowed', 405);
}

// Destroy Session
session_unset();
session_destroy();

success(null, 'Logged out successfully');
