<?php
/**
 * PeachtreesCMS API - Media Library Helpers
 *
 * pt_media 数据表读写 / 文件系统同步工具。
 *
 * 设计说明：
 * - 上传接口写文件后调用 addMediaRecord() 落库；
 * - 列表接口调用 syncMediaLibrary() 做“文件系统补录 + 孤儿清理”，
 *   保证历史文件（数据库无记录）也能出现在媒体库，FTP 删除的文件自动移除。
 */

require_once __DIR__ . '/../config.php';

// 文件系统扫描补录时使用的扩展名白名单（与上传接口允许格式保持一致）
const MEDIA_IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const MEDIA_VIDEO_EXTS = ['mp4', 'webm', 'ogg'];
const MEDIA_AUDIO_EXTS = ['mp3', 'wav', 'ogg', 'm4a', 'aac'];

/** 确保 pt_media 表存在（老库升级时自动建表，避免手动执行 SQL） */
function ensureMediaTable(PDO $pdo): void {
    $pdo->exec("CREATE TABLE IF NOT EXISTS `pt_media` (
        `id` int NOT NULL AUTO_INCREMENT,
        `user_id` int DEFAULT NULL COMMENT '上传者ID，关联 pt_users.id',
        `filename` varchar(255) NOT NULL COMMENT '保存在服务器的实际随机文件名',
        `original_name` varchar(255) NOT NULL COMMENT '用户上传时的原始文件名',
        `path` varchar(500) NOT NULL COMMENT '文件在服务器上的相对路径',
        `mime_type` varchar(100) NOT NULL COMMENT '媒体MIME类型',
        `file_size` bigint NOT NULL COMMENT '文件大小（字节数）',
        `alt_text` varchar(255) DEFAULT NULL COMMENT '图片的SEO替代文本',
        `created_at` datetime NOT NULL COMMENT '上传时间',
        PRIMARY KEY (`id`),
        KEY `user_id` (`user_id`),
        KEY `idx_mime` (`mime_type`),
        KEY `idx_created` (`created_at`),
        KEY `idx_original_name` (`original_name`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}

/** 由 MIME 类型推导媒体类型（image/video/audio/file） */
function mediaTypeFromMime(string $mime): string {
    if (str_starts_with($mime, 'image/')) return 'image';
    if (str_starts_with($mime, 'video/')) return 'video';
    if (str_starts_with($mime, 'audio/')) return 'audio';
    return 'file';
}

/**
 * 写入一条媒体记录到 pt_media
 * @param PDO $pdo
 * @param int|null $userId 上传者ID（邮件发布等匿名场景为 null）
 * @param string $relativePath 站点相对路径（upload/...）
 * @param string $originalName 用户上传时的原始文件名
 * @param string $mime MIME 类型
 * @param int $size 文件大小（字节）
 */
function addMediaRecord(PDO $pdo, ?int $userId, string $relativePath, string $originalName, string $mime, int $size): void {
    $filename = basename(str_replace('\\', '/', $relativePath));
    $stmt = $pdo->prepare(
        "INSERT INTO pt_media (user_id, filename, original_name, path, mime_type, file_size, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())"
    );
    $stmt->execute([$userId, $filename, $originalName, $relativePath, $mime, $size]);
}

/**
 * 文件系统同步：
 * 1) 补录：扫描 upload 目录，把数据库中没有记录的文件补写进 pt_media；
 * 2) 清理：删除数据库中存在但文件已被移除（如 FTP 删除）的孤儿记录。
 */
function syncMediaLibrary(PDO $pdo): void {
    $baseDir = rtrim(UPLOAD_DIR, '/\\');
    if (!is_dir($baseDir)) {
        return;
    }

    // 1) 收集数据库现有路径
    $existing = [];
    $stmt = $pdo->query("SELECT path FROM pt_media");
    $paths = $stmt ? $stmt->fetchAll(PDO::FETCH_COLUMN) : [];
    foreach ($paths as $p) {
        $existing[$p] = true;
    }

    // 2) 扫描文件系统，补录缺失记录（user_id 未知置 NULL）
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($baseDir, RecursiveDirectoryIterator::SKIP_DOTS)
    );
    foreach ($iterator as $file) {
        if (!$file->isFile()) {
            continue;
        }
        $ext = strtolower($file->getExtension());
        if (!in_array($ext, MEDIA_IMAGE_EXTS, true) &&
            !in_array($ext, MEDIA_VIDEO_EXTS, true) &&
            !in_array($ext, MEDIA_AUDIO_EXTS, true)) {
            continue;
        }

        $relativePath = 'upload/' . str_replace('\\', '/', substr($file->getPathname(), strlen($baseDir) + 1));
        if (isset($existing[$relativePath])) {
            continue;
        }

        $mime = function_exists('mime_content_type') && mime_content_type($file->getPathname())
            ? mime_content_type($file->getPathname())
            : 'application/octet-stream';
        addMediaRecord($pdo, null, $relativePath, $file->getFilename(), $mime, $file->getSize());
        $existing[$relativePath] = true;
    }

    // 3) 清理孤儿记录（文件已不存在）
    $stmt = $pdo->query("SELECT id, path FROM pt_media");
    $rows = $stmt ? $stmt->fetchAll() : [];
    $orphans = [];
    foreach ($rows as $row) {
        $rel = preg_replace('#^upload/#', '', str_replace('\\', '/', $row['path']));
        $abs = rtrim(UPLOAD_DIR, '/\\') . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $rel);
        if (!is_file($abs)) {
            $orphans[] = (int)$row['id'];
        }
    }
    if (!empty($orphans)) {
        $in = implode(',', array_fill(0, count($orphans), '?'));
        $del = $pdo->prepare("DELETE FROM pt_media WHERE id IN ($in)");
        $del->execute($orphans);
    }
}