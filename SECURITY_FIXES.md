# 安全修复说明

本文档记录了 PeachtreesCMS 系统的安全性修复内容。

## 已修复的安全问题

### 🔴 P0 级别（严重）

#### 1. 安装程序锁定机制
- **文件**: `api/install.php`
- **问题**: 安装完成后可被重复访问，攻击者可重置数据库
- **修复**:
  - 安装前检查 `.installed` 锁定文件
  - 安装完成后自动创建锁定文件
  - 如已安装则返回 403 错误

#### 2. CORS 配置修复
- **文件**: `api/cors.php`
- **问题**: 对未知来源回退到 `Access-Control-Allow-Origin: *`
- **修复**:
  - 生产环境下拒绝非白名单来源（不再使用 `*` 通配符）
  - 添加环境变量 `CORS_ALLOWED_ORIGINS` 支持自定义域名
  - 本地开发环境保持兼容性

#### 3. .env 文件保护
- **文件**: `nginx-security.conf.example`
- **问题**: 环境变量文件可能被直接访问
- **修复**: 提供 Nginx 安全配置示例，拒绝访问：
  - `.env` 文件
  - `.installed` 文件
  - `.git` 目录
  - 备份文件和配置文件

### 🟠 P1 级别（高危）

#### 4. 登录暴力破解保护
- **新文件**: `api/rate_limit.php`
- **修改文件**: `api/auth/login.php`
- **问题**: 登录接口无失败次数限制
- **修复**:
  - 实现基于 IP 的速率限制
  - 默认限制：15 分钟内最多 5 次尝试
  - 超过限制后返回 429 错误和重试时间
  - 登录成功后清除速率限制记录
  - 添加会话固定攻击防护（`session_regenerate_id`）

#### 5. Session Secure 标志
- **文件**: `api/config.php`
- **问题**: Session cookie 缺少 `secure` 标志
- **修复**:
  - 自动检测 HTTPS 环境
  - 在 HTTPS 下启用 `secure` 标志
  - 支持多种 HTTPS 检测方式（直接、代理、端口）

#### 6. isAdmin 严格比较
- **文件**: `api/auth.php`
- **问题**: 使用 `==` 弱比较判断管理员
- **修复**: 改为 `===` 严格类型比较

### 🟡 P2 级别（中等）

#### 7. JWT_SECRET 生成强度
- **文件**: `api/install.php`
- **问题**: JWT 密钥熵值不足
- **修复**: 从 `random_bytes(16)` 改为 `random_bytes(32)`（256 位）

#### 8. 媒体删除权限说明
- **文件**: `api/media/delete.php`
- **状态**: 已有路径遍历保护，添加安全说明注释

## 新增文件

1. **`api/rate_limit.php`** - 速率限制工具类
2. **`nginx-security.conf.example`** - Nginx 安全配置示例
3. **`SECURITY_FIXES.md`** - 本文档

## 部署建议

### 1. 生产环境部署前

- [ ] 应用 Nginx 安全配置（参考 `nginx-security.conf.example`）
- [ ] 启用 HTTPS（推荐使用 Let's Encrypt）
- [ ] 设置环境变量 `CORS_ALLOWED_ORIGINS`（如需要）
- [ ] 确保 `.env` 文件权限正确（640 或 600）
- [ ] 删除或重命名 `install.php`（可选，已有锁定机制）

### 2. Nginx 配置示例

```nginx
# 拒绝访问敏感文件
location ~ /\.(env|installed) {
    deny all;
    return 404;
}

# 上传目录禁止执行 PHP
location /pt_upload/ {
    alias /var/www/html/pt_upload/;
    location ~ \.php$ {
        deny all;
    }
}

# 安全响应头
add_header X-Content-Type-Options nosniff;
add_header X-Frame-Options DENY;
add_header X-XSS-Protection "1; mode=block";
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### 3. 文件权限建议

```bash
# API 目录
chmod 755 api/
chmod 644 api/*.php
chmod 600 api/.env

# 上传目录
chmod 755 pt_upload/
chmod 755 pt_upload/media/

# Session 目录
chmod 700 api/sessions/

# 速率限制目录
chmod 755 api/rate_limits/
```

## 维护建议

### 定期清理

速率限制数据会自动清理，但您也可以手动清理过期文件：

```php
// 清理超过 1 天的速率限制记录
cleanExpiredRateLimits(86400);
```

### 监控建议

1. 监控 Nginx 访问日志，查找异常请求
2. 定期检查 `api/rate_limits/` 目录大小
3. 监控登录失败率
4. 设置文件完整性监控（特别是 `.env` 和 `install.php`）

## 后续改进建议

虽然当前修复解决了主要安全问题，但以下改进值得考虑：

1. **添加验证码**: 在登录页面集成图形验证码
2. **双因素认证 (2FA)**: 为管理员账户添加 TOTP
3. **审计日志**: 记录所有管理操作
4. **IP 白名单**: 为管理后台添加 IP 白名单
5. **Content Security Policy**: 添加 CSP 响应头防止 XSS
6. **定期安全更新**: 保持 PHP 和依赖包更新

## 时间线

- **2026-04-08**: 完成所有 P0 和 P1 级别安全修复

## 联系方式

如发现新的安全问题，请及时报告。
