<?php
/**
 * PeachtreesCMS API - Internationalization Helper
 */

/**
 * Get translated string by key
 * 
 * @param string $key Translation key (e.g., 'install.title')
 * @param string $default Default value if key not found
 * @return string Translated string
 */
function __(string $key, string $default = ''): string {
    static $lang = null;
    
    if ($lang === null) {
        $langFile = __DIR__ . '/languages/' . detectAPILanguage() . '.php';
        if (!file_exists($langFile)) {
            $langFile = __DIR__ . '/languages/en.php';
        }
        $lang = file_exists($langFile) ? include $langFile : [];
    }
    
    return $lang[$key] ?? ($default ?: $key);
}

/**
 * Detect API language based on parameter, Accept-Language header or default setting
 * 
 * @return string Language code (e.g., 'en', 'zh')
 */
function detectAPILanguage(): string {
    static $detected = null;
    
    if ($detected !== null) {
        return $detected;
    }
    
    // Check for explicit lang parameter (GET or POST)
    $langParam = $_GET['lang'] ?? $_POST['lang'] ?? '';
    if ($langParam !== '' && in_array($langParam, ['en', 'zh'], true)) {
        $detected = $langParam;
        return $detected;
    }
    
    // Check Accept-Language header
    $acceptLanguage = $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '';
    if ($acceptLanguage !== '') {
        // Parse Accept-Language header
        $langs = [];
        foreach (explode(',', $acceptLanguage) as $langPart) {
            $parts = explode(';', $langPart);
            $lang = trim($parts[0]);
            $q = 1.0;
            if (count($parts) > 1 && strpos($parts[1], 'q=') === 0) {
                $q = floatval(substr($parts[1], 2));
            }
            $langs[$lang] = $q;
        }
        arsort($langs);
        
        // Match supported languages
        foreach ($langs as $lang => $q) {
            $lang = strtolower(substr($lang, 0, 2));
            if (in_array($lang, ['en', 'zh'], true)) {
                $detected = $lang;
                return $detected;
            }
        }
    }
    
    // Default to English
    $detected = 'en';
    return $detected;
}

/**
 * Get current language code
 * 
 * @return string Current language code
 */
function getCurrentLanguage(): string {
    return detectAPILanguage();
}

/**
 * Get available languages
 * 
 * @return array List of available languages
 */
function getAvailableLanguages(): array {
    return [
        'en' => 'English',
        'zh' => '中文',
    ];
}
