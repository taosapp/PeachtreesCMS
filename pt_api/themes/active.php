<?php
/**
 * PeachtreesCMS API - Active Theme (Frontend)
 * GET /api/themes/active.php
 */

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../response.php';
require_once __DIR__ . '/_helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    error('Method not allowed', 405);
}

try {
    $pdo = getDB();
    scanThemePackages($pdo);

    $stmt = $pdo->query("SELECT id, slug, name, description, version, author, entry_css, updated_at FROM pt_themes WHERE is_active = 1 LIMIT 1");
    $theme = $stmt ? $stmt->fetch() : null;

    if (!$theme) {
        success(null, 'No active theme');
    }

    $versionToken = rawurlencode($theme['updated_at'] ?? date('Y-m-d H:i:s'));
    $theme['css_url'] = themePublicCssUrl($theme['slug'], $theme['entry_css']) . '?v=' . $versionToken;
    success($theme, 'Active theme retrieved successfully');
} catch (PDOException $e) {
    serverError('Failed to get active theme: ' . $e->getMessage());
}
