<?php
/**
 * PeachtreesCMS - Installation Wizard
 * Access via /pt_api/install.php
 */

require_once __DIR__ . '/i18n.php';

ini_set('display_errors', '0');

// Check if installation is already completed
$installedFile = __DIR__ . '/.installed';
if (file_exists($installedFile)) {
    http_response_code(403);
    die('Installation already completed. Delete .installed file to reinstall.');
}

function h(string $value): string {
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function normalizePrefix(string $prefix): string {
    $prefix = trim($prefix);
    if ($prefix === '') {
        return 'pt_';
    }
    if (!preg_match('/^[a-zA-Z0-9_]+$/', $prefix)) {
        throw new RuntimeException(__('install.prefix_error'));
    }
    if (substr($prefix, -1) !== '_') {
        $prefix .= '_';
    }
    return $prefix;
}

function makeEnv(array $config): string {
    $lines = [];
    $lines[] = '# PeachtreesCMS API Environment';
    $lines[] = '';
    $lines[] = '# Database';
    $lines[] = 'DB_HOST=' . $config['DB_HOST'];
    $lines[] = 'DB_NAME=' . $config['DB_NAME'];
    $lines[] = 'DB_USER=' . $config['DB_USER'];
    $lines[] = 'DB_PASS=' . $config['DB_PASS'];
    $lines[] = '';
    $lines[] = '# JWT Secret (must be changed to a strong random string)';
    $lines[] = 'JWT_SECRET=' . $config['JWT_SECRET'];
    $lines[] = '';
    $lines[] = '# Upload directory (optional, leave empty for default)';
    $lines[] = 'UPLOAD_DIR=';
    $lines[] = '';
    $lines[] = '# Theme directory (optional, leave empty for /theme under project root)';
    $lines[] = 'THEME_DIR=';
    return implode(PHP_EOL, $lines) . PHP_EOL;
}

function splitSql(string $sql): array {
    $statements = [];
    $length = strlen($sql);
    $buffer = '';
    $inSingle = false;
    $inDouble = false;
    $inBacktick = false;
    $inLineComment = false;
    $inBlockComment = false;

    for ($i = 0; $i < $length; $i++) {
        $char = $sql[$i];
        $next = $i + 1 < $length ? $sql[$i + 1] : '';

        if ($inLineComment) {
            if ($char === "\n") {
                $inLineComment = false;
            }
            continue;
        }

        if ($inBlockComment) {
            if ($char === '*' && $next === '/') {
                $inBlockComment = false;
                $i++;
            }
            continue;
        }

        if (!$inSingle && !$inDouble && !$inBacktick) {
            if ($char === '-' && $next === '-') {
                $inLineComment = true;
                $i++;
                continue;
            }
            if ($char === '/' && $next === '*') {
                $inBlockComment = true;
                $i++;
                continue;
            }
        }

        if ($char === "'" && !$inDouble && !$inBacktick) {
            $escaped = $i > 0 && $sql[$i - 1] === '\\';
            if (!$escaped) {
                $inSingle = !$inSingle;
            }
        } elseif ($char === '"' && !$inSingle && !$inBacktick) {
            $escaped = $i > 0 && $sql[$i - 1] === '\\';
            if (!$escaped) {
                $inDouble = !$inDouble;
            }
        } elseif ($char === '`' && !$inSingle && !$inDouble) {
            $inBacktick = !$inBacktick;
        }

        if ($char === ';' && !$inSingle && !$inDouble && !$inBacktick) {
            $statement = trim($buffer);
            if ($statement !== '') {
                $statements[] = $statement;
            }
            $buffer = '';
            continue;
        }

        $buffer .= $char;
    }

    $statement = trim($buffer);
    if ($statement !== '') {
        $statements[] = $statement;
    }
    return $statements;
}

function replacePrefix(string $sql, string $prefix): string {
    $sql = preg_replace('/`pt_([a-zA-Z0-9_]+)`/i', '`' . $prefix . '$1`', $sql);
    $sql = preg_replace('/\bpt_([a-zA-Z0-9_]+)/i', $prefix . '$1', $sql);
    return $sql;
}

function testConnection(array $cfg): array {
    try {
        $dsn = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $cfg['DB_HOST'], $cfg['DB_NAME']);
        $pdo = new PDO($dsn, $cfg['DB_USER'], $cfg['DB_PASS'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
        ]);
        return ['ok' => true, 'pdo' => $pdo];
    } catch (PDOException $e) {
        return ['ok' => false, 'error' => $e->getMessage()];
    }
}

// Get current language
$currentLang = getCurrentLanguage();

$action = $_POST['action'] ?? '';
$errors = [];
$success = '';
$step = $action === 'install' ? 3 : ($action === 'check' ? 2 : 1);

$form = [
    'db_host' => $_POST['db_host'] ?? 'localhost',
    'db_name' => $_POST['db_name'] ?? 'peachtrees',
    'db_user' => $_POST['db_user'] ?? 'root',
    'db_pass' => $_POST['db_pass'] ?? '',
    'db_prefix' => $_POST['db_prefix'] ?? 'pt_'
];

if ($action === 'check' || $action === 'install') {
    try {
        $form['db_prefix'] = normalizePrefix($form['db_prefix']);
    } catch (RuntimeException $e) {
        $errors[] = $e->getMessage();
    }
}

if ($action === 'check' && empty($errors)) {
    $result = testConnection([
        'DB_HOST' => $form['db_host'],
        'DB_NAME' => $form['db_name'],
        'DB_USER' => $form['db_user'],
        'DB_PASS' => $form['db_pass']
    ]);
    if (!$result['ok']) {
        $errors[] = __('install.conn_failed') . $result['error'];
        $step = 1;
    }
}

if ($action === 'install' && empty($errors)) {
    $result = testConnection([
        'DB_HOST' => $form['db_host'],
        'DB_NAME' => $form['db_name'],
        'DB_USER' => $form['db_user'],
        'DB_PASS' => $form['db_pass']
    ]);
    if (!$result['ok']) {
        $errors[] = __('install.conn_failed') . $result['error'];
        $step = 1;
    } else {
        $pdo = $result['pdo'];
        $sqlPath = dirname(__DIR__) . '/data-init.sql';
        if (!is_file($sqlPath)) {
            $errors[] = __('install.sql_not_found');
            $step = 1;
        } else {
            $sql = file_get_contents($sqlPath);
            $sql = replacePrefix($sql, $form['db_prefix']);
            $statements = splitSql($sql);

            try {
                foreach ($statements as $statement) {
                    $pdo->exec($statement);
                }

                $envPath = __DIR__ . '/.env';
                $env = makeEnv([
                    'DB_HOST' => $form['db_host'],
                    'DB_NAME' => $form['db_name'],
                    'DB_USER' => $form['db_user'],
                    'DB_PASS' => $form['db_pass'],
                    'JWT_SECRET' => bin2hex(random_bytes(32))
                ]);
                file_put_contents($envPath, $env);

                // Create installation lock file
                file_put_contents($installedFile, date('Y-m-d H:i:s'));

                $success = __('install.complete');
                $step = 4;
            } catch (PDOException $e) {
                $errors[] = __('install.import_failed') . $e->getMessage();
                $step = 2;
            }
        }
    }
}

$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$baseUrl = $scheme . '://' . $host;
$availableLanguages = getAvailableLanguages();
?>
<!doctype html>
<html lang="<?php echo h($currentLang); ?>">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title><?php echo __('install.title'); ?></title>
  <style>
    body { font-family: Arial, sans-serif; background: #f7f7f7; padding: 30px; }
    .container { max-width: 720px; margin: 0 auto; background: #fff; padding: 24px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,.06); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
    .header h1 { margin: 0; font-size: 22px; }
    .lang-selector { display: flex; align-items: center; gap: 8px; }
    .lang-selector label { font-size: 14px; color: #666; }
    .lang-selector select { padding: 6px 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; cursor: pointer; }
    .hint { color: #666; margin-bottom: 16px; }
    .field { margin-bottom: 12px; }
    .field label { display: block; font-weight: bold; margin-bottom: 6px; }
    .field input { width: 100%; padding: 8px 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
    .actions { margin-top: 16px; display: flex; gap: 12px; }
    .btn { padding: 10px 16px; border: none; border-radius: 4px; cursor: pointer; text-decoration: none; }
    .btn-primary { background: #1e66f5; color: #fff; }
    .btn-secondary { background: #eee; color: #333; }
    .alert { padding: 10px 12px; border-radius: 4px; margin-bottom: 12px; }
    .alert-error { background: #ffe8e8; color: #a40000; }
    .alert-success { background: #e7f7e7; color: #1a7f1a; }
    code { background: #f2f2f2; padding: 2px 6px; border-radius: 4px; }
    .link-group p { margin: 8px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1><?php echo __('install.title'); ?></h1>
      <div class="lang-selector">
        <label for="lang"><?php echo __('install.language'); ?>:</label>
        <select id="lang" name="lang" onchange="changeLanguage(this.value)">
          <?php foreach ($availableLanguages as $code => $name): ?>
            <option value="<?php echo h($code); ?>" <?php echo $currentLang === $code ? 'selected' : ''; ?>><?php echo h($name); ?></option>
          <?php endforeach; ?>
        </select>
      </div>
    </div>
    <p class="hint"><?php echo __('install.hint'); ?></p>

    <?php if (!empty($errors)): ?>
      <div class="alert alert-error">
        <?php foreach ($errors as $err): ?>
          <div><?php echo h($err); ?></div>
        <?php endforeach; ?>
      </div>
    <?php endif; ?>

    <?php if ($success): ?>
      <div class="alert alert-success"><?php echo h($success); ?></div>
    <?php endif; ?>

    <?php if ($step === 1): ?>
      <form method="post" id="mainForm">
        <input type="hidden" name="action" value="check" />
        <input type="hidden" name="lang" id="langInput" value="<?php echo h($currentLang); ?>" />
        <div class="field">
          <label><?php echo __('install.db_host'); ?></label>
          <input name="db_host" value="<?php echo h($form['db_host']); ?>" />
        </div>
        <div class="field">
          <label><?php echo __('install.db_name'); ?></label>
          <input name="db_name" value="<?php echo h($form['db_name']); ?>" />
        </div>
        <div class="field">
          <label><?php echo __('install.db_user'); ?></label>
          <input name="db_user" value="<?php echo h($form['db_user']); ?>" />
        </div>
        <div class="field">
          <label><?php echo __('install.db_pass'); ?></label>
          <input type="password" name="db_pass" value="<?php echo h($form['db_pass']); ?>" />
        </div>
        <div class="field">
          <label><?php echo __('install.db_prefix'); ?></label>
          <input name="db_prefix" value="<?php echo h($form['db_prefix']); ?>" />
        </div>
        <div class="actions">
          <button class="btn btn-primary" type="submit"><?php echo __('install.next'); ?></button>
        </div>
      </form>
    <?php elseif ($step === 2): ?>
      <form method="post" id="mainForm">
        <input type="hidden" name="action" value="install" />
        <input type="hidden" name="lang" id="langInput" value="<?php echo h($currentLang); ?>" />
        <input type="hidden" name="db_host" value="<?php echo h($form['db_host']); ?>" />
        <input type="hidden" name="db_name" value="<?php echo h($form['db_name']); ?>" />
        <input type="hidden" name="db_user" value="<?php echo h($form['db_user']); ?>" />
        <input type="hidden" name="db_pass" value="<?php echo h($form['db_pass']); ?>" />
        <input type="hidden" name="db_prefix" value="<?php echo h($form['db_prefix']); ?>" />
        <div class="alert alert-success"><?php echo __('install.conn_success'); ?></div>
        <div class="actions">
          <button class="btn btn-primary" type="submit"><?php echo __('install.start'); ?></button>
          <a class="btn btn-secondary" href="install.php?lang=<?php echo h($currentLang); ?>"><?php echo __('install.back'); ?></a>
        </div>
      </form>
    <?php elseif ($step === 4): ?>
      <div class="alert alert-success"><?php echo __('install.complete'); ?></div>
      <div class="link-group">
        <p><?php echo __('install.frontend'); ?>: <a href="<?php echo h($baseUrl . '/'); ?>"><?php echo h($baseUrl . '/'); ?></a></p>
        <p><?php echo __('install.admin'); ?>: <a href="<?php echo h($baseUrl . '/admin.html#/admin/login'); ?>"><?php echo h($baseUrl . '/admin.html#/admin/login'); ?></a></p>
      </div>
      <p class="alert alert-error"><?php echo __('install.delete_hint'); ?></p>
    <?php endif; ?>
  </div>
  <script>
    function changeLanguage(lang) {
      var langInput = document.getElementById('langInput');
      if (langInput) {
        langInput.value = lang;
      }
      // Redirect with lang parameter
      window.location.href = window.location.pathname + '?lang=' + lang;
    }
  </script>
</body>
</html>
