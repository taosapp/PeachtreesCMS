<?php
/**
 * PeachtreesCMS API - 导出静态 HTML 站点
 * GET /api/data/export-static.php
 * 需要管理员权限
 */

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../response.php';
require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../themes/_helpers.php';

// 防止警告/提示污染 JSON 输出
ini_set('display_errors', '0');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    error('Method not allowed', 405);
}

requireAdmin();

function ensureDir(string $dir): void {
    if (!is_dir($dir)) {
        if (!@mkdir($dir, 0755, true) && !is_dir($dir)) {
            serverError('无法创建目录: ' . $dir);
        }
    }
}

function writeStatusFile(string $path, array $payload): void {
    $dir = dirname($path);
    ensureDir($dir);
    $tmp = $path . '.tmp';
    file_put_contents($tmp, json_encode($payload, JSON_UNESCAPED_UNICODE));
    @rename($tmp, $path);
}

try {
    $pdo = getDB();

    $optionsStmt = $pdo->query("SELECT option_key, option_value FROM pt_options");
    $options = [];
    foreach ($optionsStmt->fetchAll() as $row) {
        $options[$row['option_key']] = $row['option_value'];
    }

    $siteOptions = [
        'site_title' => $options['site_title'] ?? 'PeachtreesCMS',
        'footer_text' => $options['footer_text'] ?? '',
        'lang' => ($options['default_lang'] ?? 'zh-CN') === 'en-US' ? 'en' : 'zh-CN',
        'site_url' => $options['site_url'] ?? ''
    ];

    $hasUserLayout = false;
    $columnStmt = $pdo->query("SHOW COLUMNS FROM pt_themes LIKE 'user_layout_config'");
    if ($columnStmt && $columnStmt->fetch()) {
        $hasUserLayout = true;
    }

    $themeSql = $hasUserLayout
        ? "SELECT slug, entry_css, user_layout_config FROM pt_themes WHERE is_active = 1 LIMIT 1"
        : "SELECT slug, entry_css FROM pt_themes WHERE is_active = 1 LIMIT 1";
    $themeStmt = $pdo->query($themeSql);
    $theme = $themeStmt ? $themeStmt->fetch() : null;
    $themeSlug = $theme['slug'] ?? 'default';
    $themeCss = $theme['entry_css'] ?? 'style.css';

    $userLayoutConfig = null;
    if ($hasUserLayout && is_array($theme) && array_key_exists('user_layout_config', $theme) && !empty($theme['user_layout_config'])) {
        $decoded = json_decode($theme['user_layout_config'], true);
        if (is_array($decoded)) {
            $userLayoutConfig = $decoded;
        }
    }
    $layoutConfig = loadThemeLayout($themeSlug, $userLayoutConfig);

    $resolveSidebar = function (array $pageLayout): string {
        if (!empty($pageLayout['columns']['sidebar'])) {
            return $pageLayout['columns']['sidebar'] === 'right' ? 'right' : 'left';
        }
        if (!empty($pageLayout['right_sidebar_blocks'])) {
            return 'right';
        }
        return 'left';
    };

    $layoutConfig['home']['columns']['sidebar'] = $resolveSidebar($layoutConfig['home'] ?? []) ?: 'left';
    $layoutConfig['post']['columns']['sidebar'] = $resolveSidebar($layoutConfig['post'] ?? []) ?: 'left';

    $postsStmt = $pdo->query(<<<SQL
        SELECT p.id, p.tag, p.post_type, p.title, p.slug, p.summary, p.content, p.created_at, p.updated_at, t.display_name
        FROM pt_posts p
        LEFT JOIN pt_tags t ON t.tag = p.tag
        WHERE p.active = 1
        ORDER BY p.created_at DESC, p.id DESC
SQL);
    $posts = $postsStmt ? $postsStmt->fetchAll() : [];

    foreach ($posts as &$post) {
        $summarySource = trim($post['summary'] ?? '') !== '' ? $post['summary'] : ($post['content'] ?? '');
        $plainText = strip_tags($summarySource);
        $excerpt = mb_substr($plainText, 0, 200, 'UTF-8');
        if (mb_strlen($plainText, 'UTF-8') > 200) {
            $excerpt .= '...';
        }
        $post['excerpt'] = $excerpt;
    }
    unset($post);

    $tagsStmt = $pdo->query("SELECT tag, display_name FROM pt_tags ORDER BY id ASC");
    $tags = $tagsStmt ? $tagsStmt->fetchAll() : [];

    $payload = [
        'siteOptions' => $siteOptions,
        'theme' => [
            'slug' => $themeSlug,
            'entry_css' => $themeCss
        ],
        'layout' => $layoutConfig,
        'posts' => $posts,
        'tags' => $tags
    ];

    $siteDir = __DIR__ . '/../../static_html';
    ensureDir($siteDir);

    $statusPath = $siteDir . '/.export_status.json';
    writeStatusFile($statusPath, [
        'status' => 'running',
        'progress' => 0,
        'message' => 'Starting export'
    ]);

    $payloadPath = $siteDir . '/.export_payload.json';
    file_put_contents($payloadPath, json_encode($payload, JSON_UNESCAPED_UNICODE));

    $scriptPath = __DIR__ . '/../../scripts/ssg-export.mjs';
    if (!is_file($scriptPath)) {
        writeStatusFile($statusPath, [
            'status' => 'error',
            'progress' => 0,
            'message' => 'SSG script not found'
        ]);
        serverError('导出静态站点失败: 缺少脚本文件');
    }

    $cmd = 'node ' . escapeshellarg($scriptPath)
        . ' --data ' . escapeshellarg($payloadPath)
        . ' --out ' . escapeshellarg($siteDir)
        . ' --status ' . escapeshellarg($statusPath);

    $descriptorSpec = [
        1 => ['pipe', 'w'],
        2 => ['pipe', 'w']
    ];

    $projectRoot = realpath(__DIR__ . '/../../') ?: dirname($scriptPath);
    $process = proc_open($cmd, $descriptorSpec, $pipes, $projectRoot);
    if (!is_resource($process)) {
        writeStatusFile($statusPath, [
            'status' => 'error',
            'progress' => 0,
            'message' => 'Failed to start export'
        ]);
        serverError('导出静态站点失败: 无法启动导出脚本');
    }

    $stdout = stream_get_contents($pipes[1]);
    $stderr = stream_get_contents($pipes[2]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    $exitCode = proc_close($process);

    @unlink($payloadPath);

    if ($exitCode !== 0) {
        writeStatusFile($statusPath, [
            'status' => 'error',
            'progress' => 0,
            'message' => 'Export failed'
        ]);
        $errorMessage = trim($stderr) !== '' ? $stderr : '未知错误';
        serverError('导出静态站点失败: ' . $errorMessage);
    }

    $result = json_decode($stdout, true);
    if (!is_array($result)) {
        $result = [
            'path' => 'static_html',
            'posts' => count($posts)
        ];
    }

    success($result, 'Static site generated');
} catch (PDOException $e) {
    serverError('导出静态站点失败: ' . $e->getMessage());
}
