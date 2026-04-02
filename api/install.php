<?php
/**
 * PeachtreesCMS - 安装向导
 * 访问 /pt_api/install.php
 */

ini_set('display_errors', '0');

function h(string $value): string {
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function normalizePrefix(string $prefix): string {
    $prefix = trim($prefix);
    if ($prefix === '') {
        return 'pt_';
    }
    if (!preg_match('/^[a-zA-Z0-9_]+$/', $prefix)) {
        throw new RuntimeException('表前缀只能包含字母、数字和下划线');
    }
    if (substr($prefix, -1) !== '_') {
        $prefix .= '_';
    }
    return $prefix;
}

function makeEnv(array $config): string {
    $lines = [];
    $lines[] = 'DB_HOST=' . $config['DB_HOST'];
    $lines[] = 'DB_NAME=' . $config['DB_NAME'];
    $lines[] = 'DB_USER=' . $config['DB_USER'];
    $lines[] = 'DB_PASS=' . $config['DB_PASS'];
    $lines[] = 'DB_CHARSET=utf8mb4';
    $lines[] = 'JWT_SECRET=' . $config['JWT_SECRET'];
    $lines[] = 'JWT_EXPIRE=86400';
    $lines[] = 'APP_ENV=production';
    $lines[] = 'TIMEZONE=Asia/Shanghai';
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
        $errors[] = '连接失败：' . $result['error'];
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
        $errors[] = '连接失败：' . $result['error'];
        $step = 1;
    } else {
        $pdo = $result['pdo'];
        $sqlPath = dirname(__DIR__) . '/database.sql';
        if (!is_file($sqlPath)) {
            $errors[] = '未找到 database.sql，请确认文件存在。';
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
                    'JWT_SECRET' => bin2hex(random_bytes(16))
                ]);
                file_put_contents($envPath, $env);

                $success = '安装完成，数据库已导入。';
                $step = 4;
            } catch (PDOException $e) {
                $errors[] = '导入失败：' . $e->getMessage();
                $step = 2;
            }
        }
    }
}

$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$baseUrl = $scheme . '://' . $host;
?>
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>PeachtreesCMS 安装向导</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f7f7f7; padding: 30px; }
    .container { max-width: 720px; margin: 0 auto; background: #fff; padding: 24px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,.06); }
    h1 { margin-top: 0; font-size: 22px; }
    .hint { color: #666; margin-bottom: 16px; }
    .field { margin-bottom: 12px; }
    .field label { display: block; font-weight: bold; margin-bottom: 6px; }
    .field input { width: 100%; padding: 8px 10px; border: 1px solid #ddd; border-radius: 4px; }
    .actions { margin-top: 16px; display: flex; gap: 12px; }
    .btn { padding: 10px 16px; border: none; border-radius: 4px; cursor: pointer; }
    .btn-primary { background: #1e66f5; color: #fff; }
    .btn-secondary { background: #eee; color: #333; }
    .alert { padding: 10px 12px; border-radius: 4px; margin-bottom: 12px; }
    .alert-error { background: #ffe8e8; color: #a40000; }
    .alert-success { background: #e7f7e7; color: #1a7f1a; }
    code { background: #f2f2f2; padding: 2px 6px; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>PeachtreesCMS 安装向导</h1>
    <p class="hint">请先在数据库中创建 <code>peachtrees</code>（或自定义）数据库，再继续安装。</p>

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
      <form method="post">
        <input type="hidden" name="action" value="check" />
        <div class="field">
          <label>数据库地址</label>
          <input name="db_host" value="<?php echo h($form['db_host']); ?>" />
        </div>
        <div class="field">
          <label>数据库名</label>
          <input name="db_name" value="<?php echo h($form['db_name']); ?>" />
        </div>
        <div class="field">
          <label>数据库用户名</label>
          <input name="db_user" value="<?php echo h($form['db_user']); ?>" />
        </div>
        <div class="field">
          <label>数据库密码</label>
          <input type="password" name="db_pass" value="<?php echo h($form['db_pass']); ?>" />
        </div>
        <div class="field">
          <label>表前缀（默认 pt_）</label>
          <input name="db_prefix" value="<?php echo h($form['db_prefix']); ?>" />
        </div>
        <div class="actions">
          <button class="btn btn-primary" type="submit">下一步：测试连接</button>
        </div>
      </form>
    <?php elseif ($step === 2): ?>
      <form method="post">
        <input type="hidden" name="action" value="install" />
        <input type="hidden" name="db_host" value="<?php echo h($form['db_host']); ?>" />
        <input type="hidden" name="db_name" value="<?php echo h($form['db_name']); ?>" />
        <input type="hidden" name="db_user" value="<?php echo h($form['db_user']); ?>" />
        <input type="hidden" name="db_pass" value="<?php echo h($form['db_pass']); ?>" />
        <input type="hidden" name="db_prefix" value="<?php echo h($form['db_prefix']); ?>" />
        <div class="alert alert-success">数据库连接成功，可以开始导入数据。</div>
        <div class="actions">
          <button class="btn btn-primary" type="submit">开始安装</button>
          <a class="btn btn-secondary" href="install.php">返回修改</a>
        </div>
      </form>
    <?php elseif ($step === 4): ?>
      <div class="alert alert-success">安装完成。</div>
      <p>进入前台首页：<a href="<?php echo h($baseUrl . '/'); ?>"><?php echo h($baseUrl . '/'); ?></a></p>
      <p>进入后台登录：<a href="<?php echo h($baseUrl . '/admin.html#/admin/login'); ?>"><?php echo h($baseUrl . '/admin.html#/admin/login'); ?></a></p>
      <p class="alert alert-error">安装完成后请删除 <code>api/install.php</code> 文件，避免安全风险。</p>
    <?php endif; ?>
  </div>
</body>
</html>
