<?php

function stylesBaseDir(): string {
    $dir = defined('STYLE_DIR') ? STYLE_DIR : (__DIR__ . '/../pattern');
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
    return $dir;
}

function isValidStyleSlug(string $slug): bool {
    return preg_match('/^[a-zA-Z0-9_-]+$/', $slug) === 1;
}

function stylePublicCssUrl(string $slug, string $entryCss = 'style.css'): string {
    return '/pattern/' . rawurlencode($slug) . '/' . ltrim($entryCss, '/');
}

/**
 * Get the cache file path for style scan metadata.
 */
function styleScanCachePath(): string {
    return sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'peachtrees_style_scan.json';
}

/**
 * Compute a fingerprint of all style directories to detect changes.
 * Returns an array of [dirname => filemtime] for each style dir.
 */
function styleDirFingerprint(string $baseDir): array {
    $styleDirs = glob($baseDir . '/*', GLOB_ONLYDIR);
    if ($styleDirs === false) {
        return [];
    }
    $fp = [];
    foreach ($styleDirs as $dir) {
        $fp[basename($dir)] = filemtime($dir);
    }
    return $fp;
}

/**
 * Check whether the style directory has changed since last scan.
 * Returns true if a rescan is needed (new dir, removed dir, or mtime changed).
 */
function needsStyleRescan(string $baseDir): bool {
    $cacheFile = styleScanCachePath();
    if (!file_exists($cacheFile)) {
        return true;
    }
    $cache = json_decode(file_get_contents($cacheFile), true);
    if (!is_array($cache) || !isset($cache['fingerprint'])) {
        return true;
    }
    $current = styleDirFingerprint($baseDir);
    return $current !== $cache['fingerprint'];
}

/**
 * Save the current style directory fingerprint after a successful scan.
 */
function markStyleScanned(string $baseDir): void {
    $cacheFile = styleScanCachePath();
    $data = [
        'fingerprint' => styleDirFingerprint($baseDir),
        'scanned_at'  => time(),
    ];
    file_put_contents($cacheFile, json_encode($data));
}

/**
 * Perform the actual directory scan and upsert into pt_patterns.
 * Internal worker; prefer scanStylePackages() which includes caching.
 */
function doScanStylePackages(PDO $pdo, string $baseDir): void {
    $styleDirs = glob($baseDir . '/*', GLOB_ONLYDIR);
    if ($styleDirs === false) {
        $styleDirs = [];
    }

    foreach ($styleDirs as $styleDir) {
        $slug = basename($styleDir);
        if (!isValidStyleSlug($slug)) {
            continue;
        }

        $meta = [
            'description' => null,
            'version' => null,
            'author' => null,
            'entry_css' => 'style.css',
            'thumbnail' => null,
        ];

        $metaFile = $styleDir . '/description.json';
        if (is_file($metaFile)) {
            $decoded = json_decode(file_get_contents($metaFile), true);
            if (is_array($decoded)) {
                $meta['description'] = trim($decoded['description'] ?? '') ?: null;
                $meta['version'] = trim($decoded['version'] ?? '') ?: null;
                $meta['author'] = trim($decoded['author'] ?? '') ?: null;
                $entryCss = trim($decoded['entry_css'] ?? '');
                if ($entryCss !== '') {
                    $meta['entry_css'] = ltrim($entryCss, '/');
                }
                $thumb = trim($decoded['thumbnail'] ?? '');
                if ($thumb !== '') {
                    $meta['thumbnail'] = '/pattern/' . $slug . '/' . ltrim($thumb, '/');
                }
            }
        }

        if (!is_file($styleDir . '/' . $meta['entry_css'])) {
            continue;
        }

        $upsert = $pdo->prepare("
            INSERT INTO pt_patterns (name, description, version, author, entry_css, thumbnail)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                description = VALUES(description),
                version = VALUES(version),
                author = VALUES(author),
                entry_css = VALUES(entry_css),
                thumbnail = VALUES(thumbnail)
        ");
        $upsert->execute([
            $slug,
            $meta['description'],
            $meta['version'],
            $meta['author'],
            $meta['entry_css'],
            $meta['thumbnail']
        ]);
    }
}

/**
 * Scan style packages and sync to the database.
 * Uses directory fingerprint caching: skips the scan if nothing changed since
 * last run. Pass $force=true to bypass the cache (e.g. from a ?rescan endpoint).
 */
function scanStylePackages(PDO $pdo, bool $force = false): void {
    $baseDir = stylesBaseDir();

    if (!$force && !needsStyleRescan($baseDir)) {
        return;
    }

    doScanStylePackages($pdo, $baseDir);
    markStyleScanned($baseDir);
}
