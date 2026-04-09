<?php
/**
 * POST /api/plugins/update.php
 * Update plugin enabled status
 */

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../response.php';
require_once __DIR__ . '/_helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    error('Method not allowed', 405);
}

requireAdmin();

$input = json_decode(file_get_contents('php://input'), true);
if (!$input || !is_array($input)) {
    error('Invalid payload', 400);
}

$slug = trim((string)($input['slug'] ?? ''));
$enabled = $input['enabled'] ?? null;

if ($slug === '' || !isValidPluginSlug($slug)) {
    error('Invalid plugin slug', 400);
}

if (!is_bool($enabled) && !in_array($enabled, [0, 1, '0', '1'], true)) {
    error('Invalid enabled value', 400);
}

$enabledValue = ($enabled === true || $enabled === 1 || $enabled === '1') ? '1' : '0';

try {
    $pdo = getDB();
    $stmt = $pdo->prepare("INSERT INTO pt_options (option_key, option_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE option_value = ?");
    $key = 'plugin_enabled_' . $slug;
    $stmt->execute([$key, $enabledValue, $enabledValue]);
    success(['slug' => $slug, 'enabled' => $enabledValue === '1']);
} catch (Throwable $e) {
    serverError('Failed to update plugin status');
}
