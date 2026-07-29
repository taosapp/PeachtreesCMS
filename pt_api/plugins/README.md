# PeachtreesCMS 插件系统开发者指南 (Plugin Developer Guide)

欢迎为 PeachtreesCMS 开发扩展插件！本系统采用轻量、零侵入、物理文件夹扫描的插件架构。为了保证多插件并存时的**高兼容性、安全性与稳定性**，请在开发插件时务必遵循以下规范。

---

## 📂 插件目录结构

每一个插件必须独立存放在 `pt_api/plugins/` 的子目录下，其目录名称必须与插件的唯一标识符（`slug`）完全一致。

标准插件目录树：
```markdown
pt_api/plugins/
├── _helpers.php              # 核心框架辅助函数（系统内置，无需触碰）
├── index.php                 # 核心框架路由（系统内置，无需触碰）
├── update.php                # 核心框架路由（系统内置，无需触碰）
├── README.md                 # 本开发说明文档
└── {your-plugin-slug}/       # 插件根目录（必须与 slug 完全一致，只能包含 a-z, A-Z, 0-9, _, -）
    ├── plugin.json           # 插件元数据声明文件（必需）
    ├── ingest.php            # 插件主入口 / 数据接收脚本
    ├── README.md             # 插件说明文档
    └── ...                   # 其他插件自定义 PHP 脚本或静态资源
```

---

## 📝 1. 元数据配置文件 (`plugin.json`)

每个插件的根目录下必须放置 `plugin.json` 文件，系统后台将通过扫描并解析子目录中的此文件来加载和展示插件。

### 配置项格式与说明
```json
{
  "slug": "mail-publish",
  "name": "邮件发布",
  "name_en": "Mail Publish",
  "description": "通过向指定邮箱发送邮件，实现远程安全发布文章、同步配图等功能。",
  "description_en": "Publish posts and upload media remotely by sending emails to a configured address.",
  "version": "1.0.0",
  "admin_path": "/admin/plugins/mail-publish"
}
```

### ⚠️ 核心注意事项：
1. **标识符唯一性 (Slug Uniqueness)**: 
   * `slug` 属性是系统标识此插件的核心唯一主键。
   * **必须保证在全球开发者生态和本地目录中唯一**。如果与已有插件名称冲突，会导致其中一个插件无法被扫描或其设置被完全覆盖。
   * `slug` 必须与存放它的文件夹名称**完全一致**（大小写敏感）。
2. **多语言适配 (i18n)**:
   * 必须同时提供 `name`（默认语言展示）与 `name_en`（英文模式展示）。
   * 同理，提供 `description` 与 `description_en` 供不同语种的管理员查阅。
3. **后台配置页面路由 (`admin_path`)**:
   * 如果您的插件在管理后台（React 前端）拥有独立的配置表单页面，请在 `admin_path` 中指定。
   * If any, configure router mapping.

---

## ⚙️ 2. 插件状态管理 (Enabled/Disabled)

* **开关状态存储**：
  插件的启用（Enable）或停用（Disable）状态，由系统后台统一存储在 `pt_options` 数据库表中。
* **存储键名命名规范**：
  键名统一为：`plugin_enabled_{slug}`。
  例如 `plugin_enabled_mail-publish`。
* **状态读取**：
  在您的插件脚本中，如果需要判定当前插件是否已被管理员停用，可通过以下标准 PHP 代码进行安全校验：
  ```php
  require_once __DIR__ . '/../../config.php';
  
  $pdo = getDB();
  $stmt = $pdo->prepare("SELECT option_value FROM pt_options WHERE option_key = 'plugin_enabled_your-plugin-slug'");
  $stmt->execute();
  $option = $stmt->fetch();
  
  // 默认为未启用 (0)
  $isEnabled = $option && $option['option_value'] === '1';
  
  if (!$isEnabled) {
      http_response_code(403);
      die('Plugin is currently disabled by administrator.');
  }
  ```

---

## 🛡️ 3. 命名空间与全局隔离 (Isolation & Namespacing)

由于 PHP 在同一运行周期内共享全局作用域，为了防止多个插件共同启用时发生 **“方法重名崩溃（Fatal Error: Cannot redeclare function）”** 或 **“常量冲突”**，请严格遵守：

1. **禁用全局函数**：
   禁止直接定义全局函数，建议将所有 logic 封装在带有插件独特类名的类（Class）中：
   ```php
   // ❌ 错误做法：容易与其他插件重名
   function sendMail() { ... } 
   
   // ✔️ 正确做法：使用独一无二的类名包裹
   class MailPublishPluginService {
       public static function sendMail() { ... }
   }
   ```
2. **函数与常量前缀**：
   如果必须定义普通函数或全局常量，必须加上完整的插件 `slug` 作为前缀：
   ```php
   define('MAIL_PUBLISH_SECRET_KEY', '...');
   function mail_publish_validate_signature() { ... }
   ```

---

## 🗄️ 4. 数据库表冲突预防 (Database Safety)

如果您的插件需要创建专属的数据库表：
1. **表名前缀自适应**：
   PeachtreesCMS 在安装时支持自定义表前缀（例如 `pt_`）。插件在创建或查询表时，**禁止写死前缀**，必须通过系统常量或数据库配置动态获取（例如：`config.php` 中定义的 `DB_NAME` 及表前缀逻辑）。
2. **表名隔离防冲突**：
   插件的私有表名必须以 `{prefix}_{slug}_` 开头。
   例如，`mail-publish` 插件创建的专属配置表应命名为：`pt_mail_publish_settings`，以防与其他插件的表名冲突。

---

## 🔒 5. 安全性最佳实践 (Security First)

1. **禁止越权操作**：
   在插件的任何可对公访问的 API 脚本中（如外部 Webhook 回调），必须包含签名校验、密钥比对（Token）等安全防线，防止接口被黑客恶意请求。
2. **过滤路径遍历**：
   If file reads/writes are needed, sanitize paths using `basename()` to prevent path traversal risks.
