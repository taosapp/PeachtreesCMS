<?php
/**
 * PeachtreesCMS API - Theme List (Admin)
 * GET /api/themes/index.php
 * Requires admin privileges
 */

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../response.php';
require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/_helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    error('Method not allowed', 405);
}

requireAdmin();

try {
    $pdo = getDB();
    scanThemePackages($pdo);

    $stmt = $pdo->query("SELECT id, slug, name, description, version, author, entry_css, thumbnail, is_active, user_layout_config, updated_at, last_scanned_at FROM pt_themes ORDER BY id ASC");
    $themes = $stmt ? $stmt->fetchAll() : [];

    foreach ($themes as &$theme) {
        $theme['is_active'] = intval($theme['is_active']);
        $theme['user_layout_config'] = $theme['user_layout_config'] ? json_decode($theme['user_layout_config'], true) : null;
        $theme['css_url'] = themePublicCssUrl($theme['slug'], $theme['entry_css']);
        // Add theme's default layout
        $theme['default_layout'] = loadThemeLayout($theme['slug']);
        // Ensure default_layout contains all required fields
        if (!isset($theme['default_layout']['home']['left_sidebar_blocks'])) {
            $theme['default_layout']['home']['left_sidebar_blocks'] = $theme['default_layout']['home']['sidebar_blocks'] ?? [];
        }
        if (!isset($theme['default_layout']['home']['right_sidebar_blocks'])) {
            $theme['default_layout']['home']['right_sidebar_blocks'] = [];
        }
        if (!isset($theme['default_layout']['post']['left_sidebar_blocks'])) {
            $theme['default_layout']['post']['left_sidebar_blocks'] = $theme['default_layout']['post']['sidebar_blocks'] ?? [];
        }
        if (!isset($theme['default_layout']['post']['right_sidebar_blocks'])) {
            $theme['default_layout']['post']['right_sidebar_blocks'] = [];
        }
    }

    success([
        'themes' => $themes
    ], 'Theme list retrieved successfully');
} catch (PDOException $e) {
    serverError('Failed to get theme list: ' . $e->getMessage());
}
