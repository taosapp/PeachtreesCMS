-- PeachtreesCMS Database Initialization Schema
-- Optimized for MySQL 5.7+ & 8.0+ Compatibility with correct FK dependency order

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

CREATE DATABASE IF NOT EXISTS `peachtrees` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `peachtrees`;

-- =================================-----------------------
-- 1. Tables without any Foreign Keys (Base Dependencies)
-- =================================-----------------------

-- Table: pt_tags
CREATE TABLE IF NOT EXISTS `pt_tags` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tag` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `page_style` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `post_count` int DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `tag` (`tag`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `pt_tags` (`id`, `tag`, `display_name`, `page_style`, `post_count`) VALUES
	(1, 'news', '新闻', NULL, 1),
	(2, 'tech', '技术', NULL, 1),
	(3, 'life', '生活', NULL, 0);

-- Table: pt_users
CREATE TABLE IF NOT EXISTS `pt_users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nickname` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` tinyint NOT NULL DEFAULT '2' COMMENT '1-管理员 2-普通用户',
  `created_at` datetime DEFAULT NULL,
  `last_login_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `pt_users` (`id`, `username`, `nickname`, `email`, `password_hash`, `role`, `created_at`, `last_login_at`) VALUES
	(1, 'admin', '管理员', 'admin@peachtrees.com', '$2y$12$YBnqh4Wjt6sEqYZkaKb7LOqx.k460jVm5aasKSwAQdfSAOSylGPLm', 1, '2026-03-24 17:18:51', '2026-06-11 21:54:48');

-- Table: pt_media
CREATE TABLE IF NOT EXISTS `pt_media` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL COMMENT '上传者ID，关联 pt_users.id',
  `filename` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '保存在服务器的实际随机文件名',
  `original_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户上传时的原始文件名',
  `path` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '文件在服务器上的相对路径',
  `mime_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '媒体MIME类型',
  `file_size` bigint NOT NULL COMMENT '文件大小（字节数）',
  `alt_text` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '图片的SEO替代文本',
  `created_at` datetime NOT NULL COMMENT '上传时间',
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `idx_mime` (`mime_type`),
  KEY `idx_created` (`created_at`),
  KEY `idx_original_name` (`original_name`),
  CONSTRAINT `pt_media_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `pt_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: pt_comment_users
CREATE TABLE IF NOT EXISTS `pt_comment_users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nickname` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `website` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: pt_options
CREATE TABLE IF NOT EXISTS `pt_options` (
  `id` int NOT NULL AUTO_INCREMENT,
  `option_key` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `option_value` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `option_key` (`option_key`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `pt_options` (`id`, `option_key`, `option_value`, `created_at`, `updated_at`) VALUES
	(1, 'site_title', 'PeachtreesCMS', '2026-03-24 17:18:52', '2026-03-24 17:18:52'),
	(2, 'footer_text', '', '2026-03-24 17:18:52', '2026-03-24 17:25:13'),
	(3, 'default_lang', 'zh-CN', '2026-03-24 17:18:52', '2026-06-11 21:58:53'),
	(4, 'plugin_enabled_mail-publish', '0', '2026-03-30 17:36:44', '2026-03-30 17:36:48'),
	(13, 'show_logo', '1', '2026-04-10 00:57:05', '2026-04-10 00:57:05');

-- Table: pt_patterns
CREATE TABLE IF NOT EXISTS `pt_patterns` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '主题目录名',
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '主题描述',
  `version` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '版本号',
  `author` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '作者',
  `entry_css` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'style.css' COMMENT '入口CSS文件',
  `thumbnail` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'thumbnail.svg' COMMENT '主题缩略图文件名',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `uniq_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=95 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

INSERT INTO `pt_patterns` (`id`, `name`, `description`, `version`, `author`, `entry_css`, `thumbnail`) VALUES
	(1, '01', '经典蓝色背景，适合商务和正式场合', '1.0', 'PeachtreesCMS', 'style.css', '/pattern/01/bg.svg'),
	(2, '02', '温暖的橙色渐变背景，适合生活和旅行类文章', '1.0', 'PeachtreesCMS', 'style.css', NULL);

-- Table: pt_themes
CREATE TABLE IF NOT EXISTS `pt_themes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `slug` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '主题目录名',
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '主题描述',
  `version` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '版本号',
  `author` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '作者',
  `entry_css` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'style.css' COMMENT '入口CSS文件',
  `thumbnail` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'thumbnail.svg' COMMENT '主题缩略图文件名',
  `is_active` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否当前激活',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_slug` (`slug`),
  KEY `idx_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=1415 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `pt_themes` (`id`, `slug`, `description`, `version`, `author`, `entry_css`, `thumbnail`, `is_active`) VALUES
	(1, 'default', 'System Default Theme', '1.0.0', 'PeachtreesCMS', 'style.css', 'thumbnail.svg', 1),
	(2, 'peachtrees-two-column', 'Two Column Theme', '1.0.0', 'PeachtreesCMS', 'style.css', 'thumbnail.svg', 0);


-- =================================-----------------------
-- 2. Tables with Foreign Keys (Reference Base Tables)
-- =================================-----------------------

-- Table: pt_posts (References pt_tags)
CREATE TABLE IF NOT EXISTS `pt_posts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `tag` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `post_type` enum('normal','big-picture') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'normal' COMMENT '文章类型',
  `page_style` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '自定义URL标识',
  `summary` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '文章简介（大片文章展示在封面底部）',
  `cover_media` json DEFAULT NULL COMMENT '大图文章封面媒体列表（图片 or mp4）',
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `allow_comments` tinyint(1) DEFAULT '1' COMMENT '是否允许评论 0-不允许 1-允许',
  `active` tinyint(1) DEFAULT '1' COMMENT '是否发布 0-下架 1-发布',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `tag` (`tag`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `pt_posts_ibfk_1` FOREIGN KEY (`tag`) REFERENCES `pt_tags` (`tag`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `pt_posts_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `pt_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `pt_posts` (`id`, `user_id`, `tag`, `post_type`, `page_style`, `title`, `slug`, `summary`, `cover_media`, `content`, `allow_comments`, `active`, `created_at`, `updated_at`) VALUES
	(1, 1, 'news', 'normal', '01', '欢迎使用 PeachtreesCMS', NULL, '', '[]', '<p>这是一个 PHP 内容管理系统。</p>', 1, 1, '2026-03-24 17:18:51', '2026-06-11 22:45:56'),
	(2, 1, 'tech', 'normal', NULL, '系统功能介绍', NULL, '', NULL, '<p>系统支持以下功能：</p><ul><li>文章管理</li><li>分类标签</li><li>用户管理</li><li>RSS 订阅</li></ul>', 1, 1, '2026-03-24 17:18:51', '2026-03-24 17:18:51');

-- Table: pt_commenter_whitelist (References pt_comment_users and pt_users)
CREATE TABLE IF NOT EXISTS `pt_commenter_whitelist` (
  `id` int NOT NULL AUTO_INCREMENT,
  `comment_user_id` int NOT NULL COMMENT '关联 comment_users.id',
  `status` enum('trusted','blocked') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'trusted' COMMENT 'trusted=可信自动通过, blocked=禁止留言',
  `reason` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '原因备注',
  `expires_at` datetime DEFAULT NULL COMMENT '到期时间，NULL 表示永久',
  `created_by` int DEFAULT NULL COMMENT '操作人 users.id',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_comment_user_id` (`comment_user_id`),
  KEY `idx_status_expires` (`status`,`expires_at`),
  KEY `idx_created_by` (`created_by`),
  CONSTRAINT `pt_commenter_whitelist_ibfk_1` FOREIGN KEY (`comment_user_id`) REFERENCES `pt_comment_users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `pt_commenter_whitelist_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `pt_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: pt_comments (References pt_posts and pt_comment_users)
CREATE TABLE IF NOT EXISTS `pt_comments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `post_id` int NOT NULL,
  `user_id` int NOT NULL,
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` tinyint(1) DEFAULT '0' COMMENT '评论状态 0-待审核 1-已通过 2-已拒绝',
  `parent_id` int DEFAULT NULL COMMENT '父评论ID，用于回复评论',
  `ip` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '评论者IP地址',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `post_id` (`post_id`),
  KEY `user_id` (`user_id`),
  KEY `status` (`status`),
  CONSTRAINT `pt_comments_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `pt_posts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `pt_comments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `pt_comment_users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
