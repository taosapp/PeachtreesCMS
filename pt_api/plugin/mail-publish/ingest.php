<?php
/**
 * POST /api/plugin/mail-publish/ingest.php
 * Publish post via email (text + optional single image)
 */

require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../../response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    error('Method not allowed', 405);
}

$rawBody = file_get_contents('php://input');
$contentType = $_SERVER['CONTENT_TYPE'] ?? '';

$payload = [];
if (stripos($contentType, 'application/json') !== false) {
    $decoded = json_decode($rawBody, true);
    if (is_array($decoded)) {
        $payload = $decoded;
    }
}

$secretHeader = $_SERVER['HTTP_X_MAIL_TOKEN'] ?? '';
$signature = $_SERVER['HTTP_X_MAIL_SIGNATURE'] ?? '';
$token = $payload['token'] ?? ($_POST['token'] ?? '') ?: $secretHeader;

$pdo = getDB();

function getOptionValue(PDO $pdo, string $key): ?string {
    $stmt = $pdo->prepare('SELECT option_value FROM pt_options WHERE option_key = ? LIMIT 1');
    $stmt->execute([$key]);
    $row = $stmt->fetch();
    return $row ? (string)$row['option_value'] : null;
}

$secret = getOptionValue($pdo, 'mail_publish_secret');
if (!$secret) {
    serverError('Mail publish secret is not configured');
}

if ($signature !== '') {
    $expected = hash_hmac('sha256', $rawBody, $secret);
    if (!hash_equals($expected, $signature)) {
        unauthorized('Invalid signature');
    }
} elseif ($token !== '') {
    if (!hash_equals($secret, $token)) {
        unauthorized('Invalid token');
    }
} else {
    unauthorized('Missing token');
}

$subject = trim((string)($payload['subject'] ?? ($_POST['subject'] ?? '')));
$from = trim((string)($payload['from'] ?? ($_POST['from'] ?? '')));
$text = trim((string)($payload['text'] ?? ($payload['plain'] ?? ($_POST['text'] ?? ($_POST['plain'] ?? '')))));

if ($subject === '' || $text === '') {
    error('Subject and text are required');
}

function extractEmail(string $from): string {
    if (preg_match('/<([^>]+)>/', $from, $matches)) {
        return trim($matches[1]);
    }
    return trim($from);
}

$sender = extractEmail($from);
if ($sender === '') {
    error('Invalid sender');
}

$whitelistRaw = getOptionValue($pdo, 'mail_publish_whitelist');
if ($whitelistRaw !== null && trim($whitelistRaw) !== '') {
    $parts = preg_split('/[\s,;]+/', $whitelistRaw);
    $allowed = array_filter(array_map('strtolower', array_map('trim', $parts)));
    if (!in_array(strtolower($sender), $allowed, true)) {
        forbidden('Sender not allowed');
    }
}

$defaultTag = getOptionValue($pdo, 'mail_publish_default_tag');
$tag = null;
if ($defaultTag) {
    $checkTag = $pdo->prepare('SELECT tag FROM pt_tags WHERE tag = ? LIMIT 1');
    $checkTag->execute([$defaultTag]);
    if ($checkTag->fetch()) {
        $tag = $defaultTag;
    }
}

$uploadImageUrl = null;
$uploadImagePath = null;

if (!function_exists('finfo_open')) {
    serverError('Server configuration error: fileinfo extension not enabled');
}

if (!empty($_FILES)) {
    $fileEntries = [];
    foreach ($_FILES as $file) {
        if (is_array($file['name'])) {
            $count = count($file['name']);
            for ($i = 0; $i < $count; $i++) {
                $fileEntries[] = [
                    'name' => $file['name'][$i],
                    'type' => $file['type'][$i],
                    'tmp_name' => $file['tmp_name'][$i],
                    'error' => $file['error'][$i],
                    'size' => $file['size'][$i]
                ];
            }
        } else {
            $fileEntries[] = $file;
        }
    }

    $fileEntries = array_values(array_filter($fileEntries, function ($entry) {
        return isset($entry['error']) && $entry['error'] !== UPLOAD_ERR_NO_FILE;
    }));

    if (count($fileEntries) > 1) {
        error('Only one image attachment is allowed');
    }

    if (count($fileEntries) === 1) {
        $file = $fileEntries[0];
        if ($file['error'] !== UPLOAD_ERR_OK) {
            error('Attachment upload failed');
        }

        $allowedMimeToExt = [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            'image/gif' => 'gif'
        ];

        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        if (!isset($allowedMimeToExt[$mime])) {
            error('Only jpg/png/webp/gif image attachments are supported');
        }

        $year = date('Y');
        $month = date('m');
        $day = date('d');
        $relativeDir = "media/{$year}/{$month}";
        $absoluteDir = UPLOAD_DIR . $relativeDir;
        $uploadRoot = UPLOAD_DIR;

        if (!is_dir($absoluteDir)) {
            if (!is_dir($uploadRoot) || !is_writable($uploadRoot)) {
                serverError('Upload directory not writable, check pt_upload permissions: ' . $uploadRoot);
            }
            if (!@mkdir($absoluteDir, 0755, true) && !is_dir($absoluteDir)) {
                serverError('Failed to create upload directory: ' . $absoluteDir);
            }
        }

        $ext = $allowedMimeToExt[$mime];
        $hash = bin2hex(random_bytes(8));
        $filename = "{$day}-{$hash}.{$ext}";
        $relativePath = "pt_upload/{$relativeDir}/{$filename}";
        $absolutePath = UPLOAD_DIR . "{$relativeDir}/{$filename}";

        if (!move_uploaded_file($file['tmp_name'], $absolutePath)) {
            serverError('Failed to save attachment');
        }

        $uploadImagePath = $relativePath;
        $uploadImageUrl = '/' . $relativePath;
    }
}

function safeTextToHtml(string $text): string {
    $escaped = htmlspecialchars($text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $escaped = preg_replace("/\r\n|\r|\n/", "\n", $escaped);
    $paragraphs = preg_split("/\n\n+/", $escaped);
    $paragraphs = array_map(function ($p) {
        $lineBreaks = nl2br($p);
        return '<p>' . $lineBreaks . '</p>';
    }, array_filter($paragraphs, fn($p) => trim($p) !== ''));
    return implode("\n", $paragraphs);
}

$contentHtml = safeTextToHtml($text);
if ($uploadImageUrl) {
    $imageHtml = '<p><img src="' . $uploadImageUrl . '" alt="" /></p>';
    $contentHtml = $imageHtml . "\n" . $contentHtml;
}

$plainSummary = strip_tags($contentHtml);
if (function_exists('mb_substr')) {
    $summary = mb_substr($plainSummary, 0, 160, 'UTF-8');
