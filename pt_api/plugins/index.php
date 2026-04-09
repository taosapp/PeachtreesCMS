<?php
/**
 * GET /api/plugins/index.php
 * Returns plugin list
 */

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../response.php';
require_once __DIR__ . '/_helpers.php';

requireAdmin();

function getPluginEnabledMap(PDO $pdo): array {
    $stmt = $pdo->prepare("SELECT option_key, option_value FROM pt_options WHERE option_key LIKE 'plugin_enabled_%'");
    $stmt->execute();
    $rows = $stmt->fetchAll();
    $map = [];
    foreach ($rows as $row) {
        $key = (string)$row['option_key'];
        $slug = substr($key, strlen('plugin_enabled_'));
        if ($slug !== '') {
            $map[$slug] = $row['option_value'] !== '0';
        }
    }
    return $map;
}

try {
    $pdo = getDB();
    $enabledMap = getPluginEnabledMap($pdo);
    $plugins = scanPluginPackages();
    foreach ($plugins as &$plugin) {
        $slug = $plugin['slug'];
        $plugin['enabled'] = $enabledMap[$slug] ?? true;
    }
    unset($plugin);
    success($plugins);
} catch (Throwable $e) {
    serverError('Failed to load plugins');
}
