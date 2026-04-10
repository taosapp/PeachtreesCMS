<?php
/**
 * PeachtreesCMS API - Get Available Page Patterns
 * GET /api/patterns/index.php
 */

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../response.php';
require_once __DIR__ . '/../auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    error('Method not allowed', 405);
}

requireAuth();

$patternDir = __DIR__ . '/../../public/pattern';

if (!is_dir($patternDir)) {
    success(['patterns' => []]);
}

$patterns = [];
$folders = scandir($patternDir);

foreach ($folders as $folder) {
    if ($folder === '.' || $folder === '..') continue;
    
    $folderPath = $patternDir . '/' . $folder;
    if (!is_dir($folderPath)) continue;
    
    $descFile = $folderPath . '/description.json';
    $cssFile = $folderPath . '/style.css';
    
    if (!file_exists($descFile) || !file_exists($cssFile)) continue;
    
    $desc = json_decode(file_get_contents($descFile), true);
    if (!is_array($desc)) continue;
    
    // Find background image
    $bgImage = null;
    $files = scandir($folderPath);
    foreach ($files as $file) {
        if (preg_match('/^pattern-bg-.*\.(png|jpg|jpeg|gif|webp)$/i', $file)) {
            $bgImage = '/pattern/' . $folder . '/' . $file;
            break;
        }
    }
    
    $patterns[] = [
        'id' => $folder,
        'name' => $desc['name'] ?? $folder,
        'description' => $desc['description'] ?? '',
        'author' => $desc['author'] ?? '',
        'version' => $desc['version'] ?? '1.0',
        'css_url' => '/pattern/' . $folder . '/style.css',
        'bg_image' => $bgImage
    ];
}

// Sort by folder name
usort($patterns, function($a, $b) {
    return strcmp($a['id'], $b['id']);
});

success(['patterns' => $patterns]);
