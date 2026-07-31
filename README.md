# PeachtreesCMS

一个基于前后端分离架构、开箱即用、自适应部署的开源轻量级内容管理系统。

> 📖 在线文档：[https://taotaotao-studio.github.io/PeachtreesCMS/](https://taotaotao-studio.github.io/PeachtreesCMS/)

## 技术栈

### 后端
- PHP 8.1+ (PDO)
- MySQL 5.7+ (支持 5.7/8.0 及以上，已解决 1215 约束顺序问题)
- RESTful API
- JWT 认证

### 前端
- Vite 6.x / 8.x (Rolldown)
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
- Nginx 或 Apache (提供 `.htaccess` 默认安全保护)


## 功能特性

- **开箱即用，免 Node 编译**：提供免编译的发布包，前端静态资源采用自适应路径设计，解压即用。
- **多语言内置支持**：系统安装器与管理后台完美支持 **简体中文、English、日本語、Deutsch、Français、Español** 六国语言，并支持根据浏览器语言自动切换。
- **数据导入导出**：支持 WordPress WXR 格式 XML 一键导入导出，完美同步分类、文章和评论。
- **RSS 订阅**：内置 RSS Feed 自动生成。
- **评论管理**：支持审核制、可信邮箱自动通过白名单、敏感邮箱封禁。
- **主题与风格管理**：支持自定义页面风格与主题布局。

---

## 安装部署 (面向使用者)

本系统采用 **“构建一次，到处运行（Build Once, Deploy Anywhere）”** 的架构设计。您**完全不需要**在生产服务器上安装 Node.js、pnpm 或执行任何编译指令。

### 1. 下载与上传
下载预编译的 `release.zip` 压缩包，解压后将其中的所有文件上传至您的 Web 服务器目录（支持主域名根目录或任意子目录，如 `/blog/`）。

解压后的标准目录树结构如下：
```markdown
/var/www/html/                    # 您的 Web 根目录（或子目录）
├── index.html                    # 前端入口
├── admin.html                    # 后台管理入口
├── assets/                       # 静态 JS/CSS 资源
├── imgs/                         # 静态图片，含用户头像
├── languages/                    # 前端多语言包 (.json)
├── theme/                        # 主题文件
├── pattern/                      # 风格文件
├── upload/                       # 附件上传文件夹（已带 .gitkeep 确保打包完整）
├── .htaccess                     # Apache 安全防护与重写规则
└── pt_api/                       # PHP 后端
    ├── install.php               # 安装向导
    ├── .env.example              # 分离安装路径覆盖模板
    └── ...                       # 其他后端核心代码
```

### 2. 运行安装程序
在浏览器中访问：`http://your-domain.com/your-path/pt_api/install.php`
* **环境检测**：安装器会自动对 PHP 版本、PDO 扩展、Fileinfo 扩展，以及 `pt_api/`、`upload/`、`theme/`、`pattern/` 文件夹的可写权限进行绿灯检测。
* **安全配置**：安装程序在写入配置时，会自动为您的站点生成 256 位的高强度随机 `JWT_SECRET`。
* **完成清理**：安装成功后，请根据页面提示，**删除 `pt_api/install.php`** 以及 **根目录下的 `data-init.sql`** 文件，以确保生产环境安全。

### 3. Nginx 敏感文件防护
如果您使用的是 Nginx 服务器，请在您的 Nginx `server {}` 块中加入以下黄金规则，以彻底阻断 `.env` 或 `.git` 等隐藏敏感文件被公开下载：

```nginx
# 拒绝访问所有以点 (.) 开头的隐藏敏感文件或目录（如 .env, .installed, .git）
location ~ /\. {
    deny all;
    return 404;
    log_not_found off;
    access_log off;
}
```

---

## 开发指南 (面向开发者)

> 📁 **前端路径体系（theme / pattern / upload）请先阅读** [docs/path-architecture.md](docs/path-architecture.md)，了解前后端路径约定与开发代理原理。

本工程实现了极简的工作流，允许前端独立开发、一键热更新及一键自动化发布。

### 1. 克隆项目并安装依赖
```bash
git clone <repository-url>
cd PeachtreesCMS
pnpm install # 在根目录安装工作区依赖
```

### 2. 启动开发服务器
在根目录下直接运行：
```bash
pnpm dev
```
前端开发服务器将运行在 `http://localhost:5173`。
* **自动映射代理**：开发服务器会自动加载 `pt_frontend` 下的环境变量，并将本地接口、上传及主题请求通过反向代理映射至您的本地 PHP 路径下。

### 3. 开发路径自定义 (.env.local)
默认情况下，Vite 代理期望您的本地 PHP 服务运行在 `http://localhost/PeachtreesCMS/pt_api/` 下。
如果您的本地 PHP 文件夹名不同（例如为 `http://localhost/my-blog/`）：
1. 进入 `pt_frontend/` 目录。
2. 将 `.env.example` 复制一份并命名为 `.env.local` (该文件已被 git 忽略)。
3. 修改变量为您的实际本地路径：
   ```ini
   VITE_API_BASE_URL=/my-blog/pt_api/
   ```
4. 重新运行 `pnpm dev`，所有的代理重写和前端开发接口将完美自适应适配到新路径。

### 4. 自动化构建与打包（Release）
当您完成修改并准备发布时，无需手动拼装文件，只需在项目根目录下运行：
```bash
pnpm package
```
该脚本会自动：
1. 安装并编译前端，输出生产资源。
2. 创建暂存区，自动拼装、合并前端 HTML/CSS/JS、公共资源和 `pt_api/` 后端文件。
3. **安全过滤**：自动剔除开发产生的 `pt_api/.env`、安装锁文件 `pt_api/.installed` 以及会话日志。
4. **一键压缩**：调用系统原生 zip 工具，在项目根目录下生成开箱即用的 `release.zip`。

---
This project uses a custom non-commercial license. See LICENSE file for details.

本项目使用了非商业性授权协议。请查看 LICENSE 文件以获得更多信息。
