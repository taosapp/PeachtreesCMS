<?php
/**
 * PeachtreesCMS API - Save User Custom Theme Layout
 * PUT /api/themes/save-layout.php
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
$themeSlug = trim($input['theme_slug'] ?? '');

if ($themeSlug === '' || !isValidThemeSlug($themeSlug)) {
    error('Invalid theme slug');
}

$layoutConfig = $input['layout'] ?? null;

if (!is_array($layoutConfig)) {
    error('Invalid layout config format');
}

try {
    $pdo = getDB();

    // Check if theme exists
    $checkStmt = $pdo->prepare("SELECT id FROM pt_themes WHERE slug = ? LIMIT 1");
    $checkStmt->execute([$themeSlug]);
    $theme = $checkStmt->fetch();

    if (!$theme) {
        notFound('Theme not found');
    }

    // Validate and normalize layout config (use theme's file defaults as fallback)
    $themeDefaults = loadThemeLayout($themeSlug);
    $normalizedLayout = [
        'home' => normalizePageLayout($layoutConfig['home'] ?? null, $themeDefaults['home'], 'home'),
        'post' => normalizePageLayout($layoutConfig['post'] ?? null, $themeDefaults['post'], 'post'),
    ];

    // Save user custom layout config
    $updateStmt = $pdo->prepare("UPDATE pt_themes SET user_layout_config = ?, updated_at = NOW() WHERE slug = ?");
    $updateStmt->execute([json_encode($normalizedLayout, JSON_UNESCAPED_UNICODE), $themeSlug]);

    success([
        'theme_slug' => $themeSlug,
        'layout' => $normalizedLayout
    ], 'Theme layout saved successfully');

} catch (PDOException $e) {
    serverError('Failed to save theme layout: ' . $e->getMessage());
}
