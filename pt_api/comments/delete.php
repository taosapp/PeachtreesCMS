<?php
/**
 * PeachtreesCMS API - Delete Comment
 * DELETE /api/comments/delete.php
 * Requires authentication
 */

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../response.php';
require_once __DIR__ . '/../auth.php';

// Only accept DELETE and POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'DELETE' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    error('Method not allowed', 405);
}

// Verify authentication
requireAuth();

// Get request parameters
$input = getJsonInput();
$id = intval($input['id'] ?? 0);

// Validate input
if ($id <= 0) {
    error('Invalid comment ID');
}

try {
    $pdo = getDB();
    
    // Check if comment exists
    $checkStmt = $pdo->prepare("SELECT id FROM pt_comments WHERE id = ?");
    $checkStmt->execute([$id]);
    if (!$checkStmt->fetch()) {
        notFound('Comment not found');
    }
    
    // Delete comment (cascade delete will automatically delete child comments)
    $sql = "DELETE FROM pt_comments WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$id]);
    
    success([
        'id' => $id
    ], 'Comment deleted successfully');
    
} catch (PDOException $e) {
    serverError('Failed to delete comment: ' . $e->getMessage());
}
