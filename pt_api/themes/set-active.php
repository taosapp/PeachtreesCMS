<?php
/**
 * PeachtreesCMS API - Switch Active Theme
 * PUT /api/themes/set-active.php
 * Requires admin privileges
 */

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../response.php';
require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/_helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    error('Method not allowed', 405);
}

requireAdmin();

$input = getJsonInput();
$slug = trim($input['slug'] ?? '');

if ($slug === '' || !isValidThemeSlug($slug)) {
    error('Invalid theme slug');
}

try {
    $pdo = getDB();
    scanThemePackages($pdo);

    $checkStmt = $pdo->prepare("SELECT id FROM pt_themes WHERE slug = ? LIMIT 1");
    $checkStmt->execute([$slug]);
    $theme = $checkStmt->fetch();
    if (!$theme) {
        notFound('Theme not found, please add theme package to public/theme directory');
    }

    $targetId = intval($theme['id']);
    $updateStmt = $pdo->prepare("UPDATE pt_themes SET is_active = CASE WHEN id = ? THEN 1 ELSE 0 END, updated_at = NOW()");
    $updateStmt->execute([$targetId]);

    success([
        'slug' => $slug
    ], 'Theme switched successfully');
} catch (PDOException $e) {
    serverError('Failed to switch theme: ' . $e->getMessage());
}
