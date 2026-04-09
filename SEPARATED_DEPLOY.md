# 前后端分离部署指南

本文档说明如何将后端 API 和前端静态文件部署在不同的目录下。

## 目录结构

```
www/                          # 网站根目录
├── pt_api/                   # 后端 PHP（独立目录）
│   ├── auth/
│   ├── posts/
│   ├── config.php
│   ├── .env                  # 后端环境变量
│   └── ...
│
└── html/                     # 前端静态文件（Vite 构建产物）
    ├── index.html            # 前台入口
    ├── admin.html            # 后台入口
    ├── assets/               # JS/CSS 文件
    └── pt_upload/            # 上传文件目录
```

## 部署步骤

### 1. 构建前端

```bash
# 修改 vite.config.js
const deployBase = '/'  # 前端在 html/ 目录下，使用根路径

# 构建
pnpm build
```

### 2. 上传文件

**后端（pt_api/）：**
```bash
# 上传到 www/pt_api/
# 设置权限
chmod 755 www/pt_api/
chmod 644 www/pt_api/*.php
chmod 700 www/pt_api/sessions/
chmod 600 www/pt_api/.env
```

**前端（html/）：**
```bash
# 将 dist/ 目录下所有文件上传到 www/html/
# 创建上传目录
mkdir -p www/html/pt_upload/
chmod 755 www/html/pt_upload/
```

### 3. 配置后端环境变量

编辑 `www/pt_api/.env`：

```env
# 数据库配置
DB_HOST=localhost
DB_NAME=your_database
DB_USER=your_user
DB_PASS=your_password

# JWT 密钥（必须修改）
JWT_SECRET=your_very_long_random_string_here

# 上传目录 URL（分离部署必需）
# 前端在 html/ 目录，上传文件路径相对于 html/ 目录
UPLOAD_URL_BASE=/pt_upload/
```

### 4. 配置 Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    root /var/www/html;  # 指向 html/ 目录
    
    # ===== 前端静态文件 =====
    location / {
        try_files $uri $uri/ /index.html;
        
        # 安全响应头
        add_header X-Content-Type-Options nosniff;
        add_header X-Frame-Options DENY;
        add_header X-XSS-Protection "1; mode=block";
    }
    
    # ===== 后端 API =====
    location /pt_api/ {
        alias /var/www/pt_api/;  # 指向 pt_api/ 目录
        try_files $uri $uri/ =404;
        
        # 限制上传大小
        client_max_body_size 10M;
    }
    
    # PHP 处理
    location ~ ^/pt_api/(.+\.php)$ {
        include fastcgi_params;
        fastcgi_pass 127.0.0.1:9000;
        fastcgi_param SCRIPT_FILENAME /var/www/pt_api/$1;
        fastcgi_param SCRIPT_NAME /pt_api/$1;
    }
    
    # ===== 上传文件目录 =====
    location /pt_upload/ {
        alias /var/www/html/pt_upload/;  # 在 html/ 目录下
        
        # 禁止执行 PHP
        location ~ \.php$ {
            deny all;
        }
    }
    
    # ===== 安全保护 =====
    location ~ /\.env {
        deny all;
        return 404;
    }
    
    location ~ /\.installed {
        deny all;
        return 404;
    }
    
    location ~ /\.git {
        deny all;
        return 404;
    }
    
    # 错误页面
    error_page 404 /404.html;
    error_page 500 502 503 504 /50x.html;
}
```

### 5. 运行安装程序

访问：`http://your-domain.com/pt_api/install.php`

按提示完成数据库配置。

## 关键点说明

### 前端访问流程

```
浏览器请求: http://your-domain.com/
    ↓
Nginx root: /var/www/html
    ↓
返回文件: /var/www/html/index.html
```

### API 访问流程

```
前端请求: /pt_api/posts/index.php
    ↓
Nginx alias: /var/www/pt_api/posts/index.php
    ↓
PHP-FPM 处理并返回 JSON
```

### 上传文件访问流程

```
前端请求: /pt_upload/media/2024/04/xxx.jpg
    ↓
Nginx alias: /var/www/html/pt_upload/media/2024/04/xxx.jpg
    ↓
返回静态文件
```

## 后端路径自动检测

`pt_api/config.php` 会自动检测部署路径：

```php
// 自动检测逻辑
$scriptDir = dirname($_SERVER['SCRIPT_NAME'] ?? '/');
// /pt_api/ => 移除后得到 /
// /subdir/pt_api/ => 移除后得到 /subdir/
```

如果自动检测失败，可以在 `pt_api/.env` 中显式设置：

```env
UPLOAD_URL_BASE=/pt_upload/
```

## 跨域部署（不同域名）

如果前端和后端在不同的域名上：

```
前端: https://www.example.com
后端: https://api.example.com
```

### 1. 修改前端环境变量

创建 `.env.production`：

```env
VITE_API_BASE_URL=https://api.example.com/pt_api/
```

### 2. 修改后端 CORS 配置

编辑 `pt_api/.env`（添加环境变量）：

```env
# 不允许在此文件中设置，需要在 PHP 环境变量中设置
# 或者修改 pt_api/cors.php 添加允许的域名
```

编辑 `pt_api/cors.php`：

```php
$allowedOrigins = [
    'http://localhost:5173',
    'https://www.example.com',  # 添加前端域名
];
```

### 3. Nginx 配置（后端服务器）

```nginx
server {
    listen 80;
    server_name api.example.com;
    
    root /var/www/pt_api;
    
    location /pt_api/ {
        alias /var/www/pt_api/;
        try_files $uri $uri/ =404;
    }
    
    location ~ ^/pt_api/(.+\.php)$ {
        include fastcgi_params;
        fastcgi_pass 127.0.0.1:9000;
        fastcgi_param SCRIPT_FILENAME /var/www/pt_api/$1;
    }
}
```

## 常见问题

### 1. API 请求 404

**原因**：Nginx alias 路径不正确

**解决**：
```nginx
# 检查 alias 是否指向正确的目录
location /pt_api/ {
    alias /var/www/pt_api/;  # 确保路径正确
}
```

### 2. 上传文件无法访问

**原因**：`UPLOAD_URL_BASE` 配置错误

**解决**：
```env
# pt_api/.env
UPLOAD_URL_BASE=/pt_upload/  # 相对于前端根目录
```

### 3. CORS 错误（跨域部署时）

**原因**：后端未允许前端域名

**解决**：
```php
// pt_api/cors.php
$allowedOrigins = [
    'https://www.example.com',  # 添加前端域名
];
```

### 4. 安装后无法登录

**原因**：Session cookie 路径问题

**解决**：确保 `pt_api/config.php` 中 session 配置正确：
```php
session_set_cookie_params([
    'path' => '/',  // 根路径，前后端共享
    'httponly' => true,
    'samesite' => 'Lax'
]);
```

## 部署检查清单

- [ ] 前端已构建（`pnpm build`）
- [ ] `vite.config.js` 的 `deployBase` 设置为 `/`
- [ ] 后端 `pt_api/.env` 已配置
- [ ] `UPLOAD_URL_BASE=/pt_upload/` 已设置
- [ ] Nginx 配置中 `root` 指向 `html/` 目录
- [ ] Nginx 配置中 `alias` 指向 `pt_api/` 目录
- [ ] `pt_upload/` 目录权限为 755
- [ ] `pt_api/sessions/` 目录权限为 700
- [ ] 已测试 API 访问
- [ ] 已测试文件上传
- [ ] 已测试登录功能
