<?php
/**
 * Add page_pattern column to pt_posts table
 * Run this script once to add the new column
 * Access: http://your-domain.com/pt_api/migration-add-pattern.php
 */

require_once __DIR__ . '/config.php';

try {
    $pdo = getDB();
    
    // Check if column already exists
    $stmt = $pdo->query("SHOW COLUMNS FROM pt_posts LIKE 'page_pattern'");
    if ($stmt && $stmt->fetch()) {
        echo "Column 'page_pattern' already exists.\n";
        exit(0);
    }
    
    // Add column
    $pdo->exec("ALTER TABLE pt_posts ADD COLUMN page_pattern VARCHAR(10) DEFAULT NULL COMMENT '页面样式模板' AFTER post_type");
    
    echo "Successfully added 'page_pattern' column to pt_posts table.\n";
    
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
