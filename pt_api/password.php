<?php
/**
 * PeachtreesCMS API - Password Utilities
 * Unified password hashing and verification.
 */

/**
 * Generate password hash
 * @param string $password
 * @return string
 */
function hashPassword(string $password): string {
    return password_hash($password, PASSWORD_DEFAULT);
}

/**
 * Verify password
 * @param string $password Plain text password
 * @param string $storedHash Hash stored in database
 * @return bool
 */
function verifyPassword(string $password, string $storedHash): bool {
    return password_verify($password, $storedHash);
}
