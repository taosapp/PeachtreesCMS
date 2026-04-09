<?php
/**
 * PeachtreesCMS API - Captcha Interface
 * GET /api/captcha.php
 */

require_once __DIR__ . '/config.php';

// Start session
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Set response headers
header('Content-Type: image/png');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

// Generate four-digit numeric captcha
$code = '';
for ($i = 0; $i < 4; $i++) {
    $code .= mt_rand(0, 9);
}

// Save to session
$_SESSION['captcha'] = $code;

// Image dimensions
$width = 120;
$height = 40;

// Create canvas
$image = imagecreatetruecolor($width, $height);

// Set background color (random light color)
$bgColor = imagecolorallocate($image, mt_rand(220, 240), mt_rand(220, 240), mt_rand(220, 240));
imagefill($image, 0, 0, $bgColor);

// Add interference lines
for ($i = 0; $i < 5; $i++) {
    $lineColor = imagecolorallocate($image, mt_rand(150, 200), mt_rand(150, 200), mt_rand(150, 200));
    imageline($image, mt_rand(0, $width), mt_rand(0, $height), mt_rand(0, $width), mt_rand(0, $height), $lineColor);
}

// Add interference dots
for ($i = 0; $i < 50; $i++) {
    $dotColor = imagecolorallocate($image, mt_rand(150, 200), mt_rand(150, 200), mt_rand(150, 200));
    imagesetpixel($image, mt_rand(0, $width), mt_rand(0, $height), $dotColor);
}

// Draw captcha (using built-in font)
$fontSize = 5;
$fontWidth = imagefontwidth($fontSize);

// Calculate position for each character
$charWidth = $width / 4;

for ($i = 0; $i < 4; $i++) {
    // Random color
    $textColor = imagecolorallocate($image, mt_rand(50, 120), mt_rand(50, 120), mt_rand(50, 120));
    
    // Calculate character position (ensure integer)
    $x = intval($i * $charWidth + ($charWidth - $fontWidth) / 2);
    $y = mt_rand(10, 20);
    
    // Draw character
    imagestring($image, $fontSize, $x, $y, $code[$i], $textColor);
}

// Output image
imagepng($image);

// Free memory
imagedestroy($image);
exit;
