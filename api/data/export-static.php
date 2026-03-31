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

function copyDir(string $src, string $dest): void {
    if (!is_dir($src)) {
        return;
    }
    ensureDir($dest);
    $items = scandir($src);
    if ($items === false) {
        return;
    }
    foreach ($items as $item) {
        if ($item === '.' || $item === '..') {
            continue;
        }
        $from = $src . DIRECTORY_SEPARATOR . $item;
        $to = $dest . DIRECTORY_SEPARATOR . $item;
        if (is_dir($from)) {
            copyDir($from, $to);
        } else {
            copy($from, $to);
        }
    }
}

function writeFile(string $path, string $content): void {
    $dir = dirname($path);
    ensureDir($dir);
    file_put_contents($path, $content);
}

function writeStatusFile(string $path, array $payload): void {
    $dir = dirname($path);
    ensureDir($dir);
    $tmp = $path . '.tmp';
    file_put_contents($tmp, json_encode($payload, JSON_UNESCAPED_UNICODE));
    @rename($tmp, $path);
}

function pagePrefix(string $relativePath): string {
    $relativeDir = trim(str_replace('\\', '/', dirname($relativePath)), '/');
    if ($relativeDir === '' || $relativeDir === '.') {
        return '';
    }
    $depth = substr_count($relativeDir, '/') + 1;
    return str_repeat('../', $depth);
}

function sanitizeSlug(string $slug, int $fallbackId): string {
    $slug = trim($slug);
    if ($slug !== '' && preg_match('/^[a-zA-Z0-9_-]+$/', $slug)) {
        return $slug;
    }
    return (string) $fallbackId;
}

function rewriteContentUrls(string $html, string $prefix): string {
    $html = preg_replace('#(src|href)="/upload/#', '$1="' . $prefix . 'upload/', $html);
    $html = preg_replace('#(src|href)="/theme/#', '$1="' . $prefix . 'theme/', $html);
    return $html;
}

try {
    $pdo = getDB();

    $optionsStmt = $pdo->query("SELECT option_key, option_value FROM pt_options");
    $options = [];
    foreach ($optionsStmt->fetchAll() as $row) {
        $options[$row['option_key']] = $row['option_value'];
    }

    $siteTitle = $options['site_title'] ?? 'PeachtreesCMS';
    $footerText = $options['footer_text'] ?? '';
    $lang = ($options['default_lang'] ?? 'zh-CN') === 'en-US' ? 'en' : 'zh-CN';
    $siteUrl = $options['site_url'] ?? 'http://localhost';

    $themeStmt = $pdo->query("SELECT slug, entry_css FROM pt_themes WHERE is_active = 1 LIMIT 1");
    $theme = $themeStmt ? $themeStmt->fetch() : null;
    $themeSlug = $theme['slug'] ?? 'default';
    $themeCss = $theme['entry_css'] ?? 'style.css';

    $postsStmt = $pdo->query(<<<SQL
        SELECT p.id, p.tag, p.title, p.slug, p.summary, p.content, p.created_at, p.updated_at, t.display_name
        FROM pt_posts p
        LEFT JOIN pt_tags t ON t.tag = p.tag
        WHERE p.active = 1
        ORDER BY p.created_at DESC, p.id DESC
SQL);
    $posts = $postsStmt->fetchAll();

    $tagsStmt = $pdo->query("SELECT tag, display_name FROM pt_tags ORDER BY id ASC");
    $tags = $tagsStmt->fetchAll();

    $siteDir = __DIR__ . '/../../static_html';
    if (is_dir($siteDir)) {
        // 清空旧导出内容
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($siteDir, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::CHILD_FIRST
        );
        foreach ($iterator as $file) {
            if ($file->isDir()) {
                @rmdir($file->getPathname());
            } else {
                @unlink($file->getPathname());
            }
        }
    }
    ensureDir($siteDir);
    $statusPath = $siteDir . '/.export_status.json';
    writeStatusFile($statusPath, [
        'status' => 'running',
        'progress' => 0,
        'message' => 'Starting export'
    ]);

    // Copy theme and upload assets
    $themeSrc = __DIR__ . '/../../public/theme/' . $themeSlug;
    $themeDest = $siteDir . '/theme/' . $themeSlug;
    copyDir($themeSrc, $themeDest);

    // Base stylesheet
    $baseCss = <<<CSS
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f7f7f9;color:#222;margin:0;}
.container{max-width:960px;margin:0 auto;padding:32px 16px;}
a{color:#0d6efd;text-decoration:none;}a:hover{text-decoration:underline;}
.site-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;}
.site-title{font-size:24px;font-weight:700;}
.post-item{padding:16px 0;border-bottom:1px solid #e5e5e5;}
.post-item h2{margin:0 0 8px;font-size:20px;}
.meta{color:#666;font-size:13px;}
.pagination{display:flex;gap:8px;margin:24px 0;flex-wrap:wrap;}
.pagination a{padding:6px 10px;border:1px solid #ddd;border-radius:4px;}
.tag-list{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;}
.tag{padding:4px 10px;border:1px solid #ddd;border-radius:999px;font-size:13px;}
.footer{margin-top:40px;padding-top:16px;border-top:1px solid #e5e5e5;color:#777;font-size:13px;}
CSS;
    writeFile($siteDir . '/static.css', $baseCss);

    $strings = [
        'home' => $lang === 'en' ? 'Home' : '首页',
        'tags' => $lang === 'en' ? 'Categories' : '分类',
        'latest' => $lang === 'en' ? 'Latest Posts' : '最新文章',
        'back' => $lang === 'en' ? 'Back to list' : '返回列表',
        'rss' => $lang === 'en' ? 'RSS' : 'RSS',
        'sitemap' => $lang === 'en' ? 'Sitemap' : '站点地图'
    ];

    $perPage     = 100;

    $postItems = [];
    foreach ($posts as $post) {
        $slug = sanitizeSlug((string) ($post['slug'] ?? ''), (int) $post['id']);
        $postItems[] = [
            'id' => (int) $post['id'],
            'slug' => $slug,
            'title' => $post['title'],
            'summary' => $post['summary'],
            'content' => $post['content'] ?? '',
            'created_at' => $post['created_at'],
            'tag' => $post['tag'] ?? '',
            'tag_name' => $post['display_name'] ?: ($post['tag'] ?? '')
        ];
    }

    // Build tag map
    $tagMap = [];
    foreach ($tags as $tag) {
        $tagMap[$tag['tag']] = $tag['display_name'] ?: $tag['tag'];
    }

    // Helper to render layout
    $renderLayout = function (string $title, string $body, string $prefix) use ($siteTitle, $footerText, $themeSlug, $themeCss, $strings, $lang) {
        $fullTitle = $title === '' ? $siteTitle : $title . ' - ' . $siteTitle;
        $themeHref = $prefix . 'theme/' . rawurlencode($themeSlug) . '/' . ltrim($themeCss, '/');
        $cssHref = $prefix . 'static.css';
        $rssHref = $prefix . 'rss.xml';
        $sitemapHref = $prefix . 'sitemap.xml';
        $footer = $footerText ? $footerText : $siteTitle;

        return <<<HTML
<!doctype html>
<html lang="{$lang}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>{$fullTitle}</title>
<link rel="stylesheet" href="{$cssHref}"/>
<link rel="stylesheet" href="{$themeHref}"/>
</head>
<body>
<div class="container">
<header class="site-header">
<div class="site-title"><a href="{$prefix}index.html">{$siteTitle}</a></div>
<div class="meta"><a href="{$rssHref}">{$strings['rss']}</a> · <a href="{$sitemapHref}">{$strings['sitemap']}</a></div>
</header>
{$body}
<footer class="footer">{$footer}</footer>
</div>
</body>
</html>
HTML;
    };

    // Render list pages
    $renderListPage = function (array $items, int $page, int $totalPages, string $baseName, string $title, string $prefix, array $tagMap) use ($strings) {
        $nl = PHP_EOL;
        $list = "<h1>{$title}</h1>{$nl}";
        if (!empty($tagMap)) {
            $list .= "<div class=\"tag-list\">";
            foreach ($tagMap as $tag => $name) {
                $list .= "<a class=\"tag\" href=\"{$prefix}" . rawurlencode($tag) . ".html\">{$name}</a>";
            }
            $list .= "</div>{$nl}";
        }
        if (empty($items)) {
            $emptyText = $lang === 'en' ? 'No posts in this category' : '该分类下无文章';
            $list .= "<p class=\"meta\">{$emptyText}</p>{$nl}";
        }

        foreach ($items as $item) {
            $postUrl = $prefix . 'post/' . rawurlencode($item['slug']) . '.html';
            $tagLabel = $item['tag_name'] ? "<a href=\"{$prefix}" . rawurlencode($item['tag']) . ".html\">{$item['tag_name']}</a>" : '';
            $date = $item['created_at'] ? date('Y-m-d', strtotime($item['created_at'])) : '';
            $meta = trim($date . ($tagLabel ? ' · ' . $tagLabel : ''));
            $summary = $item['summary'] ? '<p>' . htmlspecialchars($item['summary'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</p>' : '';

            $list .= "<article class=\"post-item\">{$nl}";
            $list .= "<h2><a href=\"{$postUrl}\">" . htmlspecialchars($item['title'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . "</a></h2>{$nl}";
            if ($meta !== '') {
                $list .= "<div class=\"meta\">{$meta}</div>{$nl}";
            }
            $list .= $summary;
            $list .= "</article>{$nl}";
        }

        if ($totalPages > 1) {
            $list .= "<div class=\"pagination\">";
            for ($i = 1; $i <= $totalPages; $i++) {
                $href = $i === 1 ? $baseName . '.html' : $baseName . '_' . $i . '.html';
                $label = (string) $i;
                $list .= "<a href=\"{$prefix}{$href}\">{$label}</a>";
            }
            $list .= "</div>{$nl}";
        }

        return $list;
    };

    // Helper to write list pages
    $writeListPages = function (array $items, string $baseDir, string $baseName, string $title, array $tagMap, callable $onPage) use ($renderLayout, $renderListPage, $perPage, $siteDir) {
        $total = count($items);
        $totalPages = $total > $perPage ? (int) ceil($total / $perPage) : 1;
        for ($page = 1; $page <= $totalPages; $page++) {
            $offset = ($page - 1) * $perPage;
            $pageItems = array_slice($items, $offset, $perPage);
            $filename = $page === 1 ? $baseName . '.html' : $baseName . '_' . $page . '.html';
            $absolutePath = $baseDir . '/' . $filename;
            $relativePath = ltrim(str_replace($siteDir . '/', '', $absolutePath), '/');
            $prefix = pagePrefix($relativePath);
            $body = $renderListPage($pageItems, $page, $totalPages, $baseName, $title, $prefix, $tagMap);
            $html = $renderLayout($title, $body, $prefix);
            writeFile($absolutePath, $html);
            $onPage($filename, $page, $totalPages);
        }
    };

    $homeTitle = $strings['latest'];

    $postsByTag = [];
    foreach ($postItems as $item) {
        if ($item['tag']) {
            $postsByTag[$item['tag']][] = $item;
        }
    }
    $homePages = count($postItems) > $perPage ? (int) ceil(count($postItems) / $perPage) : 1;
    $tagPagesTotal = 0;
    foreach ($postsByTag as $items) {
        $tagPagesTotal += count($items) > $perPage ? (int) ceil(count($items) / $perPage) : 1;
    }
    $totalSteps = max(1, $homePages + $tagPagesTotal + count($postItems) + 2);
    $progress = 0;

    $updateStatus = function (string $message) use (&$progress, $totalSteps, $statusPath) {
        $progress++;
        $percent = (int) floor(($progress / $totalSteps) * 100);
        if ($percent > 100) {
            $percent = 100;
        }
        writeStatusFile($statusPath, [
            'status' => 'running',
            'progress' => $percent,
            'message' => $message
        ]);
    };

    $writeListPages($postItems, $siteDir, 'index', $homeTitle, $tagMap, function ($filename, $page, $totalPages) use ($updateStatus) {
        $label = $totalPages > 1 ? "Exporting index page {$page}/{$totalPages}" : "Exporting index page";
        $updateStatus($label);
    });

    foreach ($tagMap as $tag => $tagName) {
        $items = $postsByTag[$tag] ?? [];
        $tagSlug = rawurlencode($tag);
        $tagDir = $siteDir;
        $writeListPages($items, $tagDir, $tagSlug, $tagName, $tagMap, function ($filename, $page, $totalPages) use ($updateStatus, $tagSlug) {
            $label = $totalPages > 1 ? "Exporting tag {$tagSlug} {$page}/{$totalPages}" : "Exporting tag {$tagSlug}";
            $updateStatus($label);
        });
    }

    // Detail pages
    foreach ($postItems as $item) {
        $postPath = $siteDir . '/post/' . $item['slug'] . '.html';
        $relativePostPath = 'post/' . $item['slug'] . '.html';
        $prefix = pagePrefix($relativePostPath);
        $date = $item['created_at'] ? date('Y-m-d', strtotime($item['created_at'])) : '';
        $tagLabel = $item['tag_name'] ? "<a href=\"{$prefix}" . rawurlencode($item['tag']) . ".html\">{$item['tag_name']}</a>" : '';
        $meta = trim($date . ($tagLabel ? ' · ' . $tagLabel : ''));
        $content = rewriteContentUrls($item['content'], $prefix);

        $nl = PHP_EOL;
        $body = "<article>{$nl}";
        $body .= "<h1>" . htmlspecialchars($item['title'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . "</h1>{$nl}";
        if ($meta !== '') {
            $body .= "<div class=\"meta\">{$meta}</div>{$nl}";
        }
        $body .= "<div class=\"post-content\">{$content}</div>{$nl}";
        $body .= "<p class=\"meta\"><a href=\"{$prefix}index.html\">{$strings['back']}</a></p>{$nl}";
        $body .= "</article>{$nl}";

        $html = $renderLayout($item['title'], $body, $prefix);
        writeFile($postPath, $html);
        $updateStatus('Exporting post ' . $item['slug']);
    }

    // RSS
    $rssItems = array_slice($postItems, 0, 20);
    $rssLines = [];
    $rssLines[] = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>";
    $rssLines[] = "<rss version=\"2.0\"><channel>";
    $rssLines[] = "<title>" . htmlspecialchars($siteTitle, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . "</title>";
    $rssLines[] = "<link>{$siteUrl}</link>";
    $rssLines[] = "<description></description>";
    foreach ($rssItems as $item) {
        $link = rtrim($siteUrl, '/') . '/post/' . rawurlencode($item['slug']) . '.html';
        $rssLines[] = "<item>";
        $rssLines[] = "<title>" . htmlspecialchars($item['title'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . "</title>";
        $rssLines[] = "<link>{$link}</link>";
        $rssLines[] = "<guid>{$link}</guid>";
        $rssLines[] = "<pubDate>" . gmdate(DATE_RSS, strtotime($item['created_at'] ?? 'now')) . "</pubDate>";
        $rssLines[] = "<description><![CDATA[" . ($item['summary'] ?? '') . "]]></description>";
        $rssLines[] = "</item>";
    }
    $rssLines[] = "</channel></rss>";
    $rss = implode(PHP_EOL, $rssLines);
    writeFile($siteDir . '/rss.xml', $rss);
    $updateStatus('Exporting rss.xml');

    // Sitemap
    $urls = [];
    $urls[] = rtrim($siteUrl, '/') . '/index.html';
    $totalPages = count($postItems) > $perPage ? (int) ceil(count($postItems) / $perPage) : 1;
    for ($i = 2; $i <= $totalPages; $i++) {
        $urls[] = rtrim($siteUrl, '/') . '/index_' . $i . '.html';
    }
    foreach ($postsByTag as $tag => $items) {
        $tagPages = count($items) > $perPage ? (int) ceil(count($items) / $perPage) : 1;
        $urls[] = rtrim($siteUrl, '/') . '/' . rawurlencode($tag) . '.html';
        for ($i = 2; $i <= $tagPages; $i++) {
            $urls[] = rtrim($siteUrl, '/') . '/' . rawurlencode($tag) . '_' . $i . '.html';
        }
    }
    foreach ($postItems as $item) {
        $urls[] = rtrim($siteUrl, '/') . '/post/' . rawurlencode($item['slug']) . '.html';
    }

    $sitemapLines = [];
    $sitemapLines[] = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>";
    $sitemapLines[] = "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">";
    foreach ($urls as $url) {
        $sitemapLines[] = "<url><loc>{$url}</loc></url>";
    }
    $sitemapLines[] = "</urlset>";
    $sitemap = implode(PHP_EOL, $sitemapLines);
    writeFile($siteDir . '/sitemap.xml', $sitemap);
    $updateStatus('Exporting sitemap.xml');

    writeStatusFile($statusPath, [
        'status' => 'done',
        'progress' => 100,
        'message' => 'Done'
    ]);

    success([
        'path' => 'static_html',
        'posts' => count($postItems)
    ], 'Static site generated');
} catch (Throwable $e) {
    if (isset($statusPath)) {
        writeStatusFile($statusPath, [
            'status' => 'error',
            'progress' => 0,
            'message' => $e->getMessage()
        ]);
    }
    serverError('导出静态站点失败: ' . $e->getMessage());
}
