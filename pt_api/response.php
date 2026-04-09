<?php
/**
 * PeachtreesCMS API - Unified Response Handler
 */

/**
 * Return JSON response
 * @param mixed $data Response data
 * @param int $status HTTP status code
 */
function jsonResponse(mixed $data, int $status = 200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Success response
 * @param mixed $data Data
 * @param string $message Message
 */
function success(mixed $data = null, string $message = 'Success'): never {
    jsonResponse([
        'success' => true,
        'message' => $message,
        'data' => $data
    ]);
}

/**
 * Error response
 * @param string $message Error message
 * @param int $status HTTP status code
 */
function error(string $message = 'Error', int $status = 400): never {
    jsonResponse([
        'success' => false,
        'message' => $message,
        'data' => null
    ], $status);
}

/**
 * Unauthorized response
 * @param string $message Message
 */
function unauthorized(string $message = 'Unauthorized'): never {
    error($message, 401);
}

/**
 * Forbidden response
 * @param string $message Message
 */
function forbidden(string $message = 'Forbidden'): never {
    error($message, 403);
}

/**
 * Not found response
 * @param string $message Message
 */
function notFound(string $message = 'Not Found'): never {
    error($message, 404);
}

/**
 * Server error response
 * @param string $message Message
 */
function serverError(string $message = 'Internal Server Error'): never {
    error($message, 500);
}

/**
 * Get JSON request body
 * @return array|null
 */
function getJsonInput(): ?array {
    $input = file_get_contents('php://input');
    return json_decode($input, true);
}

/**
 * Get request parameter (supports JSON body and GET/POST)
 * @param string $key Parameter name
 * @param mixed $default Default value
 * @return mixed
 */
function getParam(string $key, mixed $default = null): mixed {
    // First try JSON body
    $json = getJsonInput();
    if (isset($json[$key])) {
        return $json[$key];
    }
    // Then try GET
    if (isset($_GET[$key])) {
        return $_GET[$key];
    }
    // Finally try POST
    if (isset($_POST[$key])) {
        return $_POST[$key];
    }
    return $default;
}
