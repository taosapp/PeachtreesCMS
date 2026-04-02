# PeachtreesCMS

一个基于前后端分离架构的内容管理系统。

## 技术栈

### 后端
- PHP 8.1+ (PDO)
- MySQL 5.7+
- RESTful API
- JWT 认证

### 前端
- Vite 7.x
- React 19.x
- React Router 7.x (HashRouter)
- Bootstrap 5.x
- Bootstrap Icons
- Axios
- TipTap (富文本编辑器)
- Swiper (轮播组件)

## 功能特性

- 文章管理 (CRUD)，支持普通文章和大图文章两种布局
- 分类标签管理
- 用户管理
- 评论管理（支持审核和白名单）
- 多语言支持 (中文/英文)
- 主题管理（支持自定义布局）
- RSS 订阅
- 数据导入导出（支持 WordPress WXR 格式）
- 分页功能

## 安装要求

- PHP >= 8.1
  - 必需扩展：`pdo`, `pdo_mysql`, `fileinfo`（文件上传必需）
- MySQL >= 5.7
- Node.js >= 16.0
- pnpm >= 8.0
- Nginx (推荐) 或 Apache

## 快速开始

### 1. 克隆项目并安装依赖

```bash
git clone <repository-url>
cd PeachtreesCMS
pnpm install
```

### 2. 初始化数据库

```bash
mysql -u root -p < database.sql
```

### 3. 配置后端环境变量

```bash
cd api
cp .env.example .env
# 编辑 .env 文件，配置数据库连接信息
```

### 4. 启动开发服务器

```bash
# 启动前端开发服务器
pnpm dev

# 或分别启动
pnpm dev:home    # 只启动前台页面
pnpm dev:admin   # 只启动后台页面
```

开发环境访问地址：
- 前台：`http://localhost:5173`
- 后台：`http://localhost:5173/admin.html`

## 静态导出（命令行）

当你已经在项目根目录（`PeachtreesCMS/`）时，手动运行 Node 导出命令如下：

```bash
node scripts/ssg-export.mjs --data static_html/.export_payload.json --out static_html --status static_html/.export_status.json
```

说明：
- `static_html/.export_payload.json` 会在点击后台“导出静态网站”时由 API 自动生成。
- `static_html/.export_payload.json` 是导出时由 API 临时生成的文件，导出结束后会被删除。
- 该命令会覆盖并重新生成 `static_html/`。

## 生产环境部署

### 部署架构

```
/var/www/html/                    # Nginx 根目录
├── index.html                    # 前端入口（pnpm build 生成）
├── admin.html                    # 后台入口
├── assets/                       # 静态资源
└── upload/                       # 上传文件目录

/var/www/php/peachtreescms/       # PHP API 目录
├── .env                          # 环境变量配置文件（敏感信息）
├── .env.example                  # 环境变量示例
├── config.php                    # 主配置文件
├── auth.php                      # 认证模块
├── response.php                  # 响应辅助函数
└── ...                           # 其他 API 文件
```

### 部署步骤

#### 1. 构建前端

```bash
# 确保 .env.production 配置正确
cat .env.production
# VITE_API_BASE_URL=/api_php_peachtreescms/
# VITE_UPLOAD_URL=/upload/

# 执行构建
pnpm build
```

#### 2. 部署前端文件

将 `dist/` 目录下的所有文件上传到服务器 `/var/www/html/`：

```bash
# 使用 rsync 或 scp
rsync -avz dist/ user@server:/var/www/html/
```

#### 3. 部署后端 API

将 `api/` 目录上传到服务器 `/var/www/php/peachtreescms/`：

```bash
rsync -avz api/ user@server:/var/www/php/peachtreescms/
```

#### 4. 配置后端环境变量

在服务器上创建并编辑 `.env` 文件：

```bash
ssh user@server
cd /var/www/php/peachtreescms/
cp .env.example .env
nano .env
```

`.env` 文件示例：
```bash
# 数据库配置
DB_HOST=localhost
DB_NAME=peachtrees
DB_USER=your_db_user
DB_PASS=your_secure_password
DB_CHARSET=utf8mb4

# JWT 配置（使用强随机密钥，至少32字符）
JWT_SECRET=your-256-bit-secret-key-here-change-this-in-production
JWT_EXPIRE=86400

# 环境模式
APP_ENV=production

# 时区
TIMEZONE=Asia/Shanghai
```

#### 5. 创建上传目录并设置权限

```bash
# 创建上传目录
mkdir -p /var/www/html/upload

# 设置权限（www-data 为常见的 web 服务器用户，根据实际情况调整）
chown -R www-data:www-data /var/www/html/upload
chmod 755 /var/www/html/upload

# PHP API 目录权限
chown -R www-data:www-data /var/www/php/peachtreescms
chmod -R 755 /var/www/php/peachtreescms

# 保护 .env 文件（重要！）
chmod 600 /var/www/php/peachtreescms/.env
```

#### 6. 配置 Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/html;
    index index.html;

    # 前端路由支持（React HashRouter 模式）
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 阻止访问 .env 文件（安全必需）
    location ~ /\.env {
        deny all;
        return 404;
    }

    # 阻止访问隐藏文件
    location ~ /\. {
        deny all;
        return 404;
    }

    # API 转发到 PHP 目录
    location /api_php_peachtreescms/ {
        alias /var/www/php/peachtreescms/;
        try_files $uri $uri/ =404;
        
        location ~ \.php$ {
            fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;  # 根据实际 PHP 版本调整
            fastcgi_index index.php;
            include fastcgi_params;
            fastcgi_param SCRIPT_FILENAME $request_filename;
        }
    }

    # 上传文件访问
    location /upload/ {
        alias /var/www/html/upload/;
        # 可选：添加缓存控制
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # 文件上传大小限制
    client_max_body_size 50M;
}
```

#### 7. 重启服务

```bash
# 测试 Nginx 配置
nginx -t

# 重启 Nginx
systemctl restart nginx

# 确保 PHP-FPM 运行
systemctl restart php8.1-fpm  # 根据实际 PHP 版本调整
systemctl enable php8.1-fpm
```

### 部署后验证

| 路径 | 预期结果 |
|------|---------|
| `http://your-domain.com/` | 前台首页 |
| `http://your-domain.com/admin.html` | 后台登录页 |
| `http://your-domain.com/api_php_peachtreescms/auth/check.php` | JSON 响应（未登录状态） |
| `http://your-domain.com/upload/` | 403 Forbidden 或目录列表（建议禁止） |

## 安全配置

### 1. 环境变量保护

- **永远不要**将 `.env` 文件提交到 Git 仓库
- 生产环境的 `.env` 文件权限应设置为 `600`
- 使用强随机字符串作为 `JWT_SECRET`：
  ```bash
  openssl rand -base64 32
  ```

### 2. 数据库安全

- 使用独立的数据库用户，限制权限（SELECT, INSERT, UPDATE, DELETE）
- 避免使用 root 用户
- 定期备份数据库

### 3. 文件上传安全

- 上传目录不应允许执行 PHP 脚本
- 建议的 Nginx 配置：
  ```nginx
  location /upload/ {
      alias /var/www/html/upload/;
      # 禁止执行 PHP
      location ~ \.php$ {
          return 403;
      }
  }
  ```

### 4. JWT Secret 安全

- 生产环境必须修改默认的 JWT Secret
- 定期轮换密钥（会导致所有用户需要重新登录）

### 5. HTTPS 配置（强烈推荐）

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # ... 其他配置
}

# HTTP 重定向到 HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

## 目录结构

```
PeachtreesCMS/
├── api/                          # PHP API 目录
│   ├── .env                      # 环境变量（不提交到 Git）
│   ├── .env.example              # 环境变量示例
│   ├── config.php                # 主配置文件
│   ├── auth.php                  # 认证模块
│   ├── response.php              # 响应辅助
│   ├── cors.php                  # CORS 配置
│   ├── posts/                    # 文章相关 API
│   ├── users/                    # 用户相关 API
│   ├── tags/                     # 标签相关 API
│   ├── comments/                 # 评论相关 API
│   ├── themes/                   # 主题相关 API
│   └── data/                     # 数据导入导出
├── src/                          # 前端源码
│   ├── components/               # 公共组件
│   ├── pages/                    # 页面组件
│   │   ├── Home/                 # 前台首页
│   │   ├── PostDetail/           # 文章详情
│   │   └── admin/                # 后台页面
│   ├── contexts/                 # React Context
│   ├── services/                 # API 服务
│   ├── layouts/                  # 布局组件
│   └── utils/                    # 工具函数
├── upload/                       # 开发环境上传目录
├── database.sql                  # 数据库初始化脚本
├── vite.config.js                # Vite 配置
├── package.json                  # 项目依赖
├── .env.development              # 开发环境变量
├── .env.production               # 生产环境变量
└── README.md                     # 本文件
```

## 开发指南

### API 响应格式

```php
// 成功响应
success(['data' => $data], '操作成功');
// {"success": true, "message": "操作成功", "data": {...}}

// 错误响应
error('错误信息', 400);
// {"success": false, "message": "错误信息"}
```

### 添加新 API 端点

1. 在 `api/{模块}/` 下创建 PHP 文件
2. 引入必要文件：`cors.php`, `config.php`, `response.php`, `auth.php`
3. 使用 `requireAuth()` 或 `requireAdmin()` 保护端点
4. 使用 `success()` 或 `error()` 返回响应

### 前端 API 调用

```javascript
import { postsAPI } from '@/services/api'

// 获取文章列表
const { data } = await postsAPI.getList({ page: 1, pageSize: 10 })

// 创建文章
await postsAPI.create({ title: '标题', content: '内容' })
```

## 故障排除

### 数据库连接失败

- 检查 `api/.env` 中的数据库配置
- 确认 MySQL 服务运行正常
- 检查数据库用户权限

### 文件上传失败

- 检查 `upload/` 目录权限（web 服务器用户需要有写入权限）
- 检查 PHP `upload_max_filesize` 和 `post_max_size` 配置
- 检查 Nginx `client_max_body_size` 配置
- 确认 `fileinfo` PHP 扩展已启用

### API 返回 404

- 检查 Nginx 配置中的 `location /api_php_peachtreescms/` 路径
- 确认 PHP-FPM 运行正常
- 检查 `fastcgi_pass` 配置的 socket 路径

### JWT 认证失败

- 检查 `api/.env` 中的 `JWT_SECRET` 配置
- 确认服务器时间准确（JWT 对时间敏感）
- 清除浏览器 Cookie 后重新登录

## 许可证

MIT License
