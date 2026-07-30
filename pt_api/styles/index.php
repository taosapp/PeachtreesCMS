<?php

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
    $forceRescan = !empty($_GET['rescan']);
    scanStylePackages($pdo, $forceRescan);

    $stmt = $pdo->query("SELECT id, name, description, version, author, entry_css, thumbnail FROM pt_patterns ORDER BY id ASC");
    $styles = $stmt ? $stmt->fetchAll() : [];

    foreach ($styles as &$style) {
        $style['slug'] = $style['name'];
        $style['css_url'] = stylePublicCssUrl($style['name'], $style['entry_css']);
    }

    success([
        'styles' => $styles
    ], 'Style list retrieved successfully');
} catch (PDOException $e) {
    serverError('Failed to get style list: ' . $e->getMessage());
}
