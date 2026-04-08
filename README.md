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


## 安装要求

- PHP >= 8.1
  - 必需扩展：`pdo`, `pdo_mysql`, `fileinfo`（文件上传必需）
- MySQL >= 5.7
- Node.js >= 16.0
- pnpm >= 8.0
- Nginx (推荐) 或 Apache


## 功能特性

- 数据导入导出（支持 WordPress WXR 格式）
- 可生成静态网站
- RSS 订阅
- 评论管理（支持审核和白名单）
- 多语言支持 (中文/英文)
- 主题管理（支持自定义布局）

## 安装

### 1. 上传
- api 目录
- dist下所有文件，保持和 api 在同一级目录内

```markdown
/var/www/html/                    # Nginx 根目录
├── api/                          # PHP api 目录
├── index.html                    # 前端入口
├── admin.html                    # 后台入口
├── assets/                       # 静态资源
├── languages/                    # 语言文件
├── theme/                        # 主题文件
└── pt_upload/                    # 上传文件目录
```

#### 2. 配置 Nginx

```nginx

http {
    server {
        listen       80;
        server_name  your-domain.com;
        root         /var/www/html;

        # 拒绝访问敏感文件
        location ~ /\.env {
            deny all;
            return 404;
        }

        location ~ /\.installed {
            deny all;
            return 404;
        }

        # PeachtreesCMS
        location ~ ^/pt_api/(.+\.php)$ {
            fastcgi_pass unix:/var/run/php/php-fpm.sock;
            index index.php;
            # windows
            # fastcgi_pass 127.0.0.1:9000;
            # linux
            fastcgi_param SCRIPT_FILENAME /var/www/pt_api/$1;
            include fastcgi_params;
        }

        # upload follder alias
        location /pt_upload/ {
            alias /var/www/html/pt_upload/;
        }
    }

}
```

### 3. 运行安装程序

- 运行 http://your-domain.com/api/install.php


## 开发指南

### 1. 克隆项目并安装依赖

```bash
git clone <repository-url>
cd PeachtreesCMS
pnpm i # 安装依赖
pnpm dev # 启动开发服务器
```

### 2. 开发环境访问地址：
- 前台：`http://localhost:5173`
- 后台：`http://localhost:5173/admin.html`

### 3. 主题文件夹 `public\theme`
- default 为内置一栏主题
- peachtrees-two-column 为内置两栏主题

## 支持命令行导出静态网站

本地安装好后，命令行进入项目根目录 `PeachtreesCMS/`，运行 Node 导出命令如下：

```bash
node scripts/ssg-export.mjs --data static_html/.export_payload.json --out static_html --status static_html/.export_status.json
```

然后上传 `static_html` 目录下所有文件即可。

说明：
- `static_html/.export_payload.json` 会在点击后台“导出静态网站”时由 API 自动生成。
- `static_html/.export_payload.json` 是导出时由 API 临时生成的文件，导出结束后会被删除。
- 该命令会覆盖并重新生成 `static_html/`。

---
This project uses a custom non-commercial license. See LICENSE file for details.

本项目使用了非商业性授权协议。请查看 LICENSE 文件以获得更多信息。