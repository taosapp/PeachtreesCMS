<?php
/**
 * PeachtreesCMS API - Rate Limiting Utilities
 * Simple file-based rate limiter for login attempts
 */

/**
 * Get rate limit storage path
 */
function getRateLimitDir(): string {
    $dir = __DIR__ . '/rate_limits';
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
    return $dir;
}

/**
 * Check if action is rate limited
 * @param string $key Unique identifier (e.g., IP address)
 * @param string $action Action name (e.g., 'login')
 * @param int $maxAttempts Maximum attempts allowed
 * @param int $timeWindow Time window in seconds
 * @return array ['allowed' => bool, 'remaining' => int, 'retry_after' => int]
 */
function checkRateLimit(string $key, string $action, int $maxAttempts = 5, int $timeWindow = 900): array {
    $dir = getRateLimitDir();
    $file = $dir . '/' . md5($key . '_' . $action) . '.json';
    
    $now = time();
    $attempts = [];
    
    // Load existing attempts
    if (file_exists($file)) {
        $content = file_get_contents($file);
        $data = json_decode($content, true);
        if ($data && isset($data['attempts'])) {
            $attempts = $data['attempts'];
        }
    }
    
    // Remove expired attempts
    $attempts = array_filter($attempts, function($timestamp) use ($now, $timeWindow) {
        return ($now - $timestamp) < $timeWindow;
    });
    
    $count = count($attempts);
    
    if ($count >= $maxAttempts) {
        // Rate limited
        $oldestAttempt = min($attempts);
        $retryAfter = $timeWindow - ($now - $oldestAttempt);
        return [
            'allowed' => false,
            'remaining' => 0,
            'retry_after' => max(0, $retryAfter)
        ];
    }
    
    // Add current attempt
    $attempts[] = $now;
    
    // Save to file
    file_put_contents($file, json_encode([
        'attempts' => $attempts,
        'updated_at' => $now
    ]));
    
    return [
        'allowed' => true,
        'remaining' => $maxAttempts - $count - 1,
        'retry_after' => 0
    ];
}

/**
 * Clear rate limit for a key/action
 */
function clearRateLimit(string $key, string $action): void {
    $dir = getRateLimitDir();
    $file = $dir . '/' . md5($key . '_' . $action) . '.json';
    if (file_exists($file)) {
        @unlink($file);
    }
}

/**
 * Clean up expired rate limit files
 */
function cleanExpiredRateLimits(int $maxAge = 86400): void {
    $dir = getRateLimitDir();
    $now = time();
    
    $files = glob($dir . '/*.json');
    foreach ($files as $file) {
        if ($now - filemtime($file) > $maxAge) {
            @unlink($file);
        }
    }
}
