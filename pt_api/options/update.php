<?php
/**
 * PeachtreesCMS API - Update Site Settings
 * POST /api/options/update.php
 * Requires admin privileges
 */

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../response.php';
require_once __DIR__ . '/../auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    error('Method not allowed', 405);
}

// Check admin privileges
requireAdmin();

// Get input
$input = json_decode(file_get_contents('php://input'), true);
if (!$input || !is_array($input)) {
    badRequest('Invalid settings data');
}

try {
    $pdo = getDB();
    $pdo->beginTransaction();
    
    $stmt = $pdo->prepare("INSERT INTO pt_options (option_key, option_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE option_value = ?");
    
    foreach ($input as $key => $value) {
        $stmt->execute([$key, $value, $value]);
    }
    
    $pdo->commit();
    success(null, 'Settings saved successfully');
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    serverError('Failed to save settings: ' . $e->getMessage());
}
