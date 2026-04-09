<?php
/**
 * PeachtreesCMS API - Import WordPress WXR XML
 * POST /api/data/import.php
 * Requires admin privileges
 */

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../response.php';
require_once __DIR__ . '/../auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    error('Method not allowed', 405);
}

requireAdmin();

if (!isset($_FILES['file']) || !is_uploaded_file($_FILES['file']['tmp_name'])) {
    error('Please upload an XML file');
}

$file = $_FILES['file'];
$extension = strtolower(pathinfo($file['name'] ?? '', PATHINFO_EXTENSION));
if ($extension !== 'xml') {
    error('Only XML files are supported');
}

libxml_use_internal_errors(true);
$xml = simplexml_load_file($file['tmp_name'], 'SimpleXMLElement', LIBXML_NOCDATA);
if ($xml === false || !isset($xml->channel)) {
    error('Invalid XML file format');
}

$wp = $xml->getNamespaces(true);
$wpNs = $wp['wp'] ?? 'http://wordpress.org/export/1.2/';
$contentNs = $wp['content'] ?? 'http://purl.org/rss/1.0/modules/content/';
$excerptNs = $wp['excerpt'] ?? 'http://wordpress.org/export/1.2/excerpt/';

function normalizeTagSlug(string $slug, string $fallback): string {
    $slug = trim($slug);
    if ($slug === '') {
        $slug = $fallback;
    }
    $slug = strtolower($slug);
    $slug = preg_replace('/[^a-z0-9_-]+/', '-', $slug);
    $slug = trim($slug, '-');
    return $slug !== '' ? substr($slug, 0, 50) : 'uncategorized';
}

function mapCommentStatus(string $status): int {
    if ($status === '1' || strtolower($status) === 'approve' || strtolower($status) === 'approved') {
        return 1;
    }
    if ($status === '2' || strtolower($status) === 'reject' || strtolower($status) === 'rejected' || strtolower($status) === 'spam' || strtolower($status) === 'trash') {
        return 2;
    }
    return 0;
}

try {
    $pdo = getDB();
    $pdo->beginTransaction();

    $channel = $xml->channel;
    $createdTags = 0;
    $createdPosts = 0;
    $updatedPosts = 0;
    $createdComments = 0;
    $tagMap = [];

    foreach ($channel->children($wpNs)->term as $term) {
        $taxonomy = trim((string) $term->term_taxonomy);
        if ($taxonomy !== 'category') {
            continue;
        }

        $slug = normalizeTagSlug((string) $term->term_slug, (string) $term->term_name);
        $name = trim((string) $term->term_name) ?: $slug;

        $stmt = $pdo->prepare("SELECT tag FROM pt_tags WHERE tag = ?");
        $stmt->execute([$slug]);
        if (!$stmt->fetch()) {
            $insertTag = $pdo->prepare("INSERT INTO pt_tags (tag, display_name, post_count) VALUES (?, ?, 0)");
            $insertTag->execute([$slug, $name]);
            $createdTags++;
        }

        $tagMap[$slug] = $name;
    }

    $postIdMap = [];

    foreach ($channel->item as $item) {
        $itemWp = $item->children($wpNs);
        $itemContent = $item->children($contentNs);
        $itemExcerpt = $item->children($excerptNs);

        $wpPostType = trim((string) $itemWp->post_type);
        if (!in_array($wpPostType, ['post', 'page'], true)) {
            continue;
        }

        $title = trim((string) $item->title);
        if ($title === '') {
            continue;
        }

        $slug = trim((string) $itemWp->post_name);
        $summary = (string) $itemExcerpt->encoded;
        $content = (string) $itemContent->encoded;
        $createdAt = trim((string) $itemWp->post_date) ?: date('Y-m-d H:i:s');
        $updatedAt = trim((string) $itemWp->post_modified) ?: $createdAt;
        $allowComments = trim((string) $itemWp->comment_status) === 'closed' ? 0 : 1;
        $active = trim((string) $itemWp->status) === 'publish' ? 1 : 0;
        $postType = 'normal';
        $coverMedia = [];
        $sourcePostId = (int) $itemWp->post_id;

        foreach ($item->category as $category) {
            $domain = (string) $category['domain'];
            if ($domain !== 'category') {
                continue;
            }

            $tagSlug = normalizeTagSlug((string) $category['nicename'], (string) $category);
            $tagName = trim((string) $category) ?: $tagSlug;

            if (!isset($tagMap[$tagSlug])) {
                $stmt = $pdo->prepare("SELECT tag FROM pt_tags WHERE tag = ?");
                $stmt->execute([$tagSlug]);
                if (!$stmt->fetch()) {
                    $insertTag = $pdo->prepare("INSERT INTO pt_tags (tag, display_name, post_count) VALUES (?, ?, 0)");
                    $insertTag->execute([$tagSlug, $tagName]);
                    $createdTags++;
                }
                $tagMap[$tagSlug] = $tagName;
            }

            $postTag = $tagSlug;
            break;
        }

        if (!isset($postTag)) {
            $postTag = 'uncategorized';
            if (!isset($tagMap[$postTag])) {
                $stmt = $pdo->prepare("SELECT tag FROM pt_tags WHERE tag = ?");
                $stmt->execute([$postTag]);
                if (!$stmt->fetch()) {
                    $insertTag = $pdo->prepare("INSERT INTO pt_tags (tag, display_name, post_count) VALUES (?, ?, 0)");
                    $insertTag->execute([$postTag, 'Uncategorized']);
                    $createdTags++;
                }
                $tagMap[$postTag] = 'Uncategorized';
            }
        }

        foreach ($itemWp->postmeta as $meta) {
            $key = (string) $meta->meta_key;
            $value = (string) $meta->meta_value;

            if ($key === '_peachtrees_post_type' && in_array($value, ['normal', 'big-picture'], true)) {
                $postType = $value;
            } elseif ($key === '_peachtrees_cover_media') {
                $decoded = json_decode($value, true);
                if (is_array($decoded)) {
                    $coverMedia = array_values($decoded);
                }
            } elseif ($key === '_peachtrees_allow_comments') {
                $allowComments = (int) $value === 1 ? 1 : 0;
            } elseif ($key === '_peachtrees_active') {
                $active = (int) $value === 1 ? 1 : 0;
            }
        }

        $existingPost = null;
        if ($slug !== '') {
            $findPost = $pdo->prepare("SELECT id FROM pt_posts WHERE slug = ?");
            $findPost->execute([$slug]);
            $existingPost = $findPost->fetch();
        }

        if (!$existingPost && $sourcePostId > 0) {
            $findPost = $pdo->prepare("SELECT id FROM pt_posts WHERE id = ?");
            $findPost->execute([$sourcePostId]);
            $existingPost = $findPost->fetch();
        }

        if ($existingPost) {
            $postId = (int) $existingPost['id'];
            $updatePost = $pdo->prepare("
                UPDATE pt_posts
                SET tag = ?, post_type = ?, title = ?, slug = ?, summary = ?, cover_media = ?, content = ?, allow_comments = ?, active = ?, created_at = ?, updated_at = ?
                WHERE id = ?
            ");
            $updatePost->execute([
                $postTag,
                $postType,
                $title,
                $slug !== '' ? $slug : null,
                $summary,
                json_encode($coverMedia, JSON_UNESCAPED_UNICODE),
                $content,
                $allowComments,
                $active,
                $createdAt,
                $updatedAt,
                $postId,
            ]);
            $updatedPosts++;
        } else {
            $insertPost = $pdo->prepare("
                INSERT INTO pt_posts (tag, post_type, title, slug, summary, cover_media, content, allow_comments, active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $insertPost->execute([
                $postTag,
                $postType,
                $title,
                $slug !== '' ? $slug : null,
                $summary,
                json_encode($coverMedia, JSON_UNESCAPED_UNICODE),
                $content,
                $allowComments,
                $active,
                $createdAt,
                $updatedAt,
            ]);
            $postId = (int) $pdo->lastInsertId();
            $createdPosts++;
        }

        $postIdMap[$sourcePostId] = $postId;
        unset($postTag);
    }

    foreach ($channel->item as $item) {
        $itemWp = $item->children($wpNs);
        $sourcePostId = (int) $itemWp->post_id;
        $localPostId = $postIdMap[$sourcePostId] ?? 0;
        if ($localPostId <= 0) {
            continue;
        }

        $commentIdMap = [];
        foreach ($itemWp->comment as $comment) {
            $email = trim((string) $comment->comment_author_email);
            $nickname = trim((string) $comment->comment_author) ?: 'Anonymous';
            $website = trim((string) $comment->comment_author_url);
            $ip = trim((string) $comment->comment_author_IP);
            $commentDate = trim((string) $comment->comment_date) ?: date('Y-m-d H:i:s');
            $commentContent = (string) $comment->comment_content;
            $status = mapCommentStatus((string) $comment->comment_approved);
            $sourceCommentId = (int) $comment->comment_id;
            $sourceParentId = (int) $comment->comment_parent;

            if ($commentContent === '') {
                continue;
            }

            $userId = null;
            if ($email !== '') {
                $findUser = $pdo->prepare("SELECT id FROM pt_comment_users WHERE email = ?");
                $findUser->execute([$email]);
                $user = $findUser->fetch();

                if ($user) {
                    $userId = (int) $user['id'];
                    $updateUser = $pdo->prepare("UPDATE pt_comment_users SET nickname = ?, website = ? WHERE id = ?");
                    $updateUser->execute([$nickname, $website !== '' ? $website : null, $userId]);
                } else {
                    $insertUser = $pdo->prepare("
                        INSERT INTO pt_comment_users (email, nickname, website, created_at)
                        VALUES (?, ?, ?, NOW())
                    ");
                    $insertUser->execute([$email, $nickname, $website !== '' ? $website : null]);
                    $userId = (int) $pdo->lastInsertId();
                }
            } else {
                $generatedEmail = 'imported-' . md5($nickname . '|' . $commentContent . '|' . $commentDate) . '@local.invalid';
                $findUser = $pdo->prepare("SELECT id FROM pt_comment_users WHERE email = ?");
                $findUser->execute([$generatedEmail]);
                $user = $findUser->fetch();
                if ($user) {
                    $userId = (int) $user['id'];
                } else {
                    $insertUser = $pdo->prepare("
                        INSERT INTO pt_comment_users (email, nickname, website, created_at)
                        VALUES (?, ?, ?, NOW())
                    ");
                    $insertUser->execute([$generatedEmail, $nickname, $website !== '' ? $website : null]);
                    $userId = (int) $pdo->lastInsertId();
                }
            }

            $checkComment = $pdo->prepare("
                SELECT id FROM pt_comments
                WHERE post_id = ? AND user_id = ? AND content = ? AND created_at = ?
                LIMIT 1
            ");
            $checkComment->execute([$localPostId, $userId, $commentContent, $commentDate]);
            $existingComment = $checkComment->fetch();

            if ($existingComment) {
                $commentIdMap[$sourceCommentId] = (int) $existingComment['id'];
                continue;
            }

            $insertComment = $pdo->prepare("
                INSERT INTO pt_comments (post_id, user_id, content, status, parent_id, ip, created_at, updated_at)
                VALUES (?, ?, ?, ?, NULL, ?, ?, ?)
            ");
            $insertComment->execute([
                $localPostId,
                $userId,
                $commentContent,
                $status,
                $ip !== '' ? $ip : null,
                $commentDate,
                $commentDate,
            ]);
            $localCommentId = (int) $pdo->lastInsertId();
            $commentIdMap[$sourceCommentId] = $localCommentId;
            $createdComments++;

            if ($sourceParentId > 0 && isset($commentIdMap[$sourceParentId])) {
                $updateParent = $pdo->prepare("UPDATE pt_comments SET parent_id = ? WHERE id = ?");
                $updateParent->execute([$commentIdMap[$sourceParentId], $localCommentId]);
            }
        }
    }

    $pdo->exec("UPDATE pt_tags t SET post_count = (SELECT COUNT(*) FROM pt_posts WHERE tag = t.tag)");
    $pdo->commit();

    success([
        'file_name' => $file['name'],
        'tags_created' => $createdTags,
        'posts_created' => $createdPosts,
        'posts_updated' => $updatedPosts,
        'comments_created' => $createdComments,
    ], 'Import completed');
} catch (Throwable $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    serverError('Import failed: ' . $e->getMessage());
}
