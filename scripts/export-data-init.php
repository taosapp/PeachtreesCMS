<?php
/**
 * Export current database (from api/.env) into data-init.sql
 * Usage: php scripts/export-data-init.php
 */

ini_set('display_errors', '0');

require_once __DIR__ . '/../api/config.php';

$pdo = getDB();
$dbName = DB_NAME;

$tablesStmt = $pdo->query('SHOW FULL TABLES WHERE Table_type = "BASE TABLE"');
$tables = $tablesStmt ? $tablesStmt->fetchAll(PDO::FETCH_NUM) : [];

$lines = [];
$lines[] = '-- --------------------------------------------------------';
$lines[] = '-- PeachtreesCMS data-init.sql';
$lines[] = '-- Export time: ' . date('Y-m-d H:i:s');
$lines[] = '-- --------------------------------------------------------';
$lines[] = '';
$lines[] = 'SET NAMES utf8mb4;';
$lines[] = 'SET FOREIGN_KEY_CHECKS=0;';
$lines[] = '';
$lines[] = 'CREATE DATABASE IF NOT EXISTS `' . $dbName . '` /*!40100 DEFAULT CHARACTER SET utf8mb4 */;';
$lines[] = 'USE `' . $dbName . '`;';
$lines[] = '';

foreach ($tables as $row) {
    $table = $row[0];
    $lines[] = '-- --------------------------------------------------------';
    $lines[] = '-- Table structure for `' . $table . '`';
    $lines[] = '-- --------------------------------------------------------';
    $lines[] = 'DROP TABLE IF EXISTS `' . $table . '`;';

    $createStmt = $pdo->query('SHOW CREATE TABLE `' . $table . '`');
    $createRow = $createStmt ? $createStmt->fetch(PDO::FETCH_ASSOC) : null;
    if (!$createRow || empty($createRow['Create Table'])) {
        throw new RuntimeException('Failed to read table definition for ' . $table);
    }
    $lines[] = $createRow['Create Table'] . ';';
    $lines[] = '';

    $dataStmt = $pdo->query('SELECT * FROM `' . $table . '`');
    $rows = $dataStmt ? $dataStmt->fetchAll(PDO::FETCH_ASSOC) : [];

    $lines[] = '-- Dumping data for `' . $table . '` (' . count($rows) . ' rows)';
    if (count($rows) > 0) {
        $columns = array_keys($rows[0]);
        $columnList = implode('`, `', $columns);
        $chunkSize = 200;
        $chunk = [];
        $rowCount = 0;

        foreach ($rows as $dataRow) {
            $values = [];
            foreach ($columns as $col) {
                $value = $dataRow[$col];
                if ($value === null) {
                    $values[] = 'NULL';
                } else {
                    $values[] = $pdo->quote($value);
                }
            }
            $chunk[] = '(' . implode(', ', $values) . ')';
            $rowCount++;

            if ($rowCount % $chunkSize === 0) {
                $lines[] = 'INSERT INTO `' . $table . '` (`' . $columnList . '`) VALUES';
                $lines[] = implode(",\n", $chunk) . ';';
                $lines[] = '';
                $chunk = [];
            }
        }

        if (!empty($chunk)) {
            $lines[] = 'INSERT INTO `' . $table . '` (`' . $columnList . '`) VALUES';
            $lines[] = implode(",\n", $chunk) . ';';
            $lines[] = '';
        }
    }
    $lines[] = '';
}

$lines[] = 'SET FOREIGN_KEY_CHECKS=1;';
$lines[] = '';

$outputPath = __DIR__ . '/../data-init.sql';
file_put_contents($outputPath, implode(PHP_EOL, $lines));

echo "Exported to {$outputPath}\n";
