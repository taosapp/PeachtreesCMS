<?php

function themesBaseDir(): string {
    $dir = __DIR__ . '/../../public/theme';
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
    return $dir;
}

function isValidThemeSlug(string $slug): bool {
    return preg_match('/^[a-zA-Z0-9_-]+$/', $slug) === 1;
}

function themePublicCssUrl(string $slug, string $entryCss): string {
    return '/theme/' . rawurlencode($slug) . '/' . ltrim($entryCss, '/');
}

function defaultThemeLayout(): array {
    return [
        'home' => [
            'template' => 'single-column',
            'header' => 'top',
            'category' => 'header',
            'footer' => 'bottom',
            'left_sidebar_blocks' => [],
            'main_blocks' => ['header', 'category', 'post_list', 'pager', 'footer'],
            'right_sidebar_blocks' => [],
        ],
        'post' => [
            'template' => 'single-column',
            'header' => 'top',
            'category' => 'header',
            'footer' => 'bottom',
            'left_sidebar_blocks' => [],
            'main_blocks' => ['header', 'category', 'post_content', 'navigation', 'comments', 'back_link', 'footer'],
            'right_sidebar_blocks' => [],
        ],
    ];
}

function normalizeBlocks(mixed $value, array $allowed, array $fallback): array {
    if (!is_array($value)) {
        return $fallback;
    }
    $normalized = [];
    foreach ($value as $item) {
        if (!is_string($item)) {
            continue;
        }
        if (in_array($item, $allowed, true) && !in_array($item, $normalized, true)) {
            $normalized[] = $item;
        }
    }
    return $normalized;
}

function normalizePageLayout(mixed $inputPage, array $defaultPage, string $pageType): array {
    $allowedHeader = ['top', 'main-top', 'hidden'];
    $allowedCategory = ['header', 'main-top', 'main-bottom', 'hidden'];
    $allowedFooter = ['bottom', 'main-top', 'hidden'];
    $allowedTemplate = ['single-column', 'two-column', 'three-column'];

    $standardBlocks = ['header', 'category', 'post_list', 'pager', 'footer', 'post_content', 'navigation', 'comments', 'back_link'];
    $allowedSidebarBlocks = $standardBlocks;
    $allowedHomeMainBlocks = $standardBlocks;
    $allowedPostMainBlocks = $standardBlocks;

    if (!is_array($inputPage)) {
        return $defaultPage;
    }

    $template = $inputPage['template'] ?? $defaultPage['template'];
    if (!in_array($template, $allowedTemplate, true)) {
        $template = $defaultPage['template'];
    }

    $header = $inputPage['header'] ?? $defaultPage['header'];
    $category = $inputPage['category'] ?? $defaultPage['category'];
    $footer = $inputPage['footer'] ?? $defaultPage['footer'];

    if (!in_array($header, $allowedHeader, true)) {
        $header = $defaultPage['header'];
    }
    if (!in_array($category, $allowedCategory, true)) {
        $category = $defaultPage['category'];
    }
    if (!in_array($footer, $allowedFooter, true)) {
        $footer = $defaultPage['footer'];
    }

    // 处理不同模板的块配置
    $defaultLeftSidebarBlocks = $defaultPage['left_sidebar_blocks'] ?? $defaultPage['sidebar_blocks'] ?? [];
    $defaultMainBlocks = $defaultPage['main_blocks'] ?? ($pageType === 'home' ? ['post_list', 'pager'] : ['post_content', 'comments', 'back_link']);
    $defaultRightSidebarBlocks = $defaultPage['right_sidebar_blocks'] ?? [];
    $mainAllowed = $pageType === 'home' ? $allowedHomeMainBlocks : $allowedPostMainBlocks;

    // 优先使用 left_sidebar_blocks，如果不存在则使用 sidebar_blocks
    $inputLeftSidebarBlocks = $inputPage['left_sidebar_blocks'] ?? null;
    if ($inputLeftSidebarBlocks === null) {
        $inputLeftSidebarBlocks = $inputPage['sidebar_blocks'] ?? null;
    }

    $leftSidebarBlocks = normalizeBlocks($inputLeftSidebarBlocks, $allowedSidebarBlocks, $defaultLeftSidebarBlocks);
    $mainBlocks = normalizeBlocks($inputPage['main_blocks'] ?? null, $mainAllowed, $defaultMainBlocks);
    $rightSidebarBlocks = normalizeBlocks($inputPage['right_sidebar_blocks'] ?? null, $allowedSidebarBlocks, $defaultRightSidebarBlocks);

    return [
        'template' => $template,
        'header' => $header,
        'category' => $category,
        'footer' => $footer,
        'left_sidebar_blocks' => $leftSidebarBlocks,
        'main_blocks' => $mainBlocks,
        'right_sidebar_blocks' => $rightSidebarBlocks,
    ];
}

function loadThemeLayout(string $slug, ?array $userLayoutConfig = null): array {
    $systemDefaults = defaultThemeLayout();
    if (!isValidThemeSlug($slug)) {
        return $systemDefaults;
    }

    // 1. 使用系统默认布局
    $fileDefaults = $systemDefaults;
    // 主题布局不再依赖 layout.json/theme.json
    if ($slug === 'peachtrees-two-column') {
        $fileDefaults['home']['template'] = 'two-column';
        $fileDefaults['post']['template'] = 'two-column';
    }

    // 2. 如果没有用户自定义配置，直接返回文件布局
    if (!is_array($userLayoutConfig)) {
        if ($slug === 'peachtrees-two-column') {
            $fileDefaults['home']['template'] = 'two-column';
            $fileDefaults['post']['template'] = 'two-column';
        }
        return $fileDefaults;
    }

    // 3. 应用用户自定义配置，以文件布局作为 fallback
    $homeLayout = $userLayoutConfig['home'] ?? [];
    $postLayout = $postLayout = $userLayoutConfig['post'] ?? [];

    // 处理旧数据结构
    if (isset($homeLayout['sidebar_blocks']) && !isset($homeLayout['left_sidebar_blocks'])) {
        $homeLayout['left_sidebar_blocks'] = $homeLayout['sidebar_blocks'];
    }
    if (isset($postLayout['sidebar_blocks']) && !isset($postLayout['left_sidebar_blocks'])) {
        $postLayout['left_sidebar_blocks'] = $postLayout['sidebar_blocks'];
    }

    $result = [
        'home' => normalizePageLayout($homeLayout, $fileDefaults['home'], 'home'),
        'post' => normalizePageLayout($postLayout, $fileDefaults['post'], 'post'),
    ];
    if ($slug === 'peachtrees-two-column') {
        $result['home']['template'] = 'two-column';
        $result['post']['template'] = 'two-column';
    }
    return $result;
}

function scanThemePackages(PDO $pdo): void {
    $baseDir = themesBaseDir();
    $themeDirs = glob($baseDir . '/*', GLOB_ONLYDIR);
    if ($themeDirs === false) {
        $themeDirs = [];
    }

    foreach ($themeDirs as $themeDir) {
        $slug = basename($themeDir);
        if (!isValidThemeSlug($slug)) {
            continue;
        }

        $meta = [
            'name' => $slug,
            'description' => null,
            'version' => null,
            'author' => null,
            'entry_css' => 'style.css',
            'thumbnail' => 'thumbnail.svg',
        ];

        $metaFile = $themeDir . '/theme.json';
        if (is_file($metaFile)) {
            $decoded = json_decode(file_get_contents($metaFile), true);
            if (is_array($decoded)) {
                $meta['name'] = trim($decoded['name'] ?? $meta['name']) ?: $meta['name'];
                $meta['description'] = trim($decoded['description'] ?? '') ?: null;
                $meta['version'] = trim($decoded['version'] ?? '') ?: null;
                $meta['author'] = trim($decoded['author'] ?? '') ?: null;
                $meta['thumbnail'] = trim($decoded['thumbnail'] ?? 'thumbnail.svg') ?: 'thumbnail.svg';
                $entryCss = trim($decoded['entry_css'] ?? '');
                if ($entryCss !== '') {
                    $meta['entry_css'] = ltrim($entryCss, '/');
                }
            }
        }

        if (!is_file($themeDir . '/' . $meta['entry_css'])) {
            // 没有入口CSS则跳过该主题包
            continue;
        }

        $upsert = $pdo->prepare("
            INSERT INTO pt_themes (slug, name, description, version, author, entry_css, thumbnail, is_active, created_at, updated_at, last_scanned_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW(), NOW())
            ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                description = VALUES(description),
                version = VALUES(version),
                author = VALUES(author),
                entry_css = VALUES(entry_css),
                thumbnail = VALUES(thumbnail),
                updated_at = NOW(),
                last_scanned_at = NOW()
        ");
        $upsert->execute([
            $slug,
            $meta['name'],
            $meta['description'],
            $meta['version'],
            $meta['author'],
            $meta['entry_css'],
            $meta['thumbnail']
        ]);
    }

    // 确保始终有且仅有一个激活主题
    $activeStmt = $pdo->query("SELECT id, slug FROM pt_themes WHERE is_active = 1 ORDER BY id ASC");
    $activeRows = $activeStmt ? $activeStmt->fetchAll() : [];

    if (count($activeRows) === 0) {
        $fallbackStmt = $pdo->prepare("SELECT id FROM pt_themes WHERE slug = ? LIMIT 1");
        $fallbackStmt->execute(['default']);
        $fallback = $fallbackStmt->fetch();

        if (!$fallback) {
            $fallbackStmt = $pdo->query("SELECT id FROM pt_themes ORDER BY id ASC LIMIT 1");
            $fallback = $fallbackStmt ? $fallbackStmt->fetch() : null;
        }

        if ($fallback) {
            $setActive = $pdo->prepare("UPDATE pt_themes SET is_active = CASE WHEN id = ? THEN 1 ELSE 0 END, updated_at = NOW()");
            $setActive->execute([intval($fallback['id'])]);
        }
    } elseif (count($activeRows) > 1) {
        $keepId = intval($activeRows[0]['id']);
        $setOnlyOne = $pdo->prepare("UPDATE pt_themes SET is_active = CASE WHEN id = ? THEN 1 ELSE 0 END, updated_at = NOW()");
        $setOnlyOne->execute([$keepId]);
    }
}
