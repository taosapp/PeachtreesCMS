<?php

function pluginsBaseDir(): string {
    $dir = __DIR__ . '/../plugin';
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
    return $dir;
}

function isValidPluginSlug(string $slug): bool {
    return preg_match('/^[a-zA-Z0-9_-]+$/', $slug) === 1;
}

function loadPluginMeta(string $pluginDir, string $slug): ?array {
    $meta = [
        'slug' => $slug,
        'name' => $slug,
        'name_en' => $slug,
        'description' => null,
        'description_en' => null,
        'version' => null,
        'admin_path' => '/admin/plugins/' . $slug
    ];

    $metaFile = $pluginDir . '/plugin.json';
    if (!is_file($metaFile)) {
        return null;
    }

    $decoded = json_decode(file_get_contents($metaFile), true);
    if (!is_array($decoded)) {
        return null;
    }

    $meta['name'] = trim($decoded['name'] ?? $meta['name']) ?: $meta['name'];
    $meta['name_en'] = trim($decoded['name_en'] ?? $meta['name_en']) ?: $meta['name_en'];
    $meta['description'] = trim($decoded['description'] ?? '') ?: null;
    $meta['description_en'] = trim($decoded['description_en'] ?? '') ?: null;
    $meta['version'] = trim($decoded['version'] ?? '') ?: null;
    $adminPath = trim($decoded['admin_path'] ?? '');
    if ($adminPath !== '') {
        $meta['admin_path'] = $adminPath;
    }

    return $meta;
}

function scanPluginPackages(): array {
    $baseDir = pluginsBaseDir();
    $pluginDirs = glob($baseDir . '/*', GLOB_ONLYDIR);
    if ($pluginDirs === false) {
        $pluginDirs = [];
    }

    $plugins = [];
    foreach ($pluginDirs as $pluginDir) {
        $slug = basename($pluginDir);
        if (!isValidPluginSlug($slug)) {
            continue;
        }
        $meta = loadPluginMeta($pluginDir, $slug);
        if ($meta) {
            $plugins[] = $meta;
        }
    }

    usort($plugins, function ($a, $b) {
        return strcasecmp($a['name'], $b['name']);
    });

    return $plugins;
}
