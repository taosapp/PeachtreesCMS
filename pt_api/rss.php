<?php
/**
 * PeachtreesCMS API - RSS Feed
 * GET /api/rss.php
 */

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/config.php';

// Set XML response header
header('Content-Type: application/xml; charset=utf-8');

try {
    $pdo = getDB();
    
    // Get latest 30 published posts
    $sql = "SELECT p.id, p.title, p.content, p.created_at, t.display_name
            FROM pt_posts p
            LEFT JOIN pt_tags t ON p.tag = t.tag
            WHERE p.active = 1
            ORDER BY p.created_at DESC
            LIMIT 30";
    $stmt = $pdo->query($sql);
    $posts = $stmt->fetchAll();
    
    // Site basic info
    $siteTitle = 'PeachtreesCMS';
    $siteUrl = 'http://' . ($_SERVER['HTTP_HOST'] ?? 'localhost');
    $siteDesc = 'Article Feed';
    $now = date('D, d M Y H:i:s T');
    
    // Build RSS XML
    $xml = '<?xml version="1.0" encoding="utf-8"?>' . "\n";
    $xml .= '<rss version="2.0">' . "\n";
    $xml .= '  <channel>' . "\n";
    $xml .= "    <title>{$siteTitle}</title>\n";
    $xml .= "    <link>{$siteUrl}</link>\n";
    $xml .= "    <description>{$siteDesc}</description>\n";
    $xml .= "    <language>en</language>\n";
    $xml .= "    <pubDate>{$now}</pubDate>\n";
    $xml .= "    <lastBuildDate>{$now}</lastBuildDate>\n";
    
    foreach ($posts as $post) {
        $title = htmlspecialchars($post['title'], ENT_XML1);
        $link = "{$siteUrl}/post/{$post['id']}";
        $description = htmlspecialchars(strip_tags($post['content']), ENT_XML1);
        $pubDate = date('D, d M Y H:i:s T', strtotime($post['created_at']));
        $category = htmlspecialchars($post['display_name'] ?? '', ENT_XML1);
        
        $xml .= "    <item>\n";
        $xml .= "      <title>{$title}</title>\n";
        $xml .= "      <link>{$link}</link>\n";
        $xml .= "      <description>{$description}</description>\n";
        $xml .= "      <pubDate>{$pubDate}</pubDate>\n";
        if ($category) {
            $xml .= "      <category>{$category}</category>\n";
        }
        $xml .= "    </item>\n";
    }
    
    $xml .= '  </channel>' . "\n";
    $xml .= '</rss>';
    
    echo $xml;
    
} catch (PDOException $e) {
    echo '<?xml version="1.0" encoding="utf-8"?>';
    echo '<error>Database error</error>';
}
