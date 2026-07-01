# My Home

这是一个基于 Next.js 15、React 19、TypeScript、Tailwind CSS 和 MDX 的个人主页项目。站点内容以静态导出为主，源码由 `app/`、`components/`、`lib/`、`posts/` 和 `content/` 共同组织，导出的静态页面会写入 `out/`，并同步到仓库根目录用于 GitHub Pages 展示。

## 技术栈

- `Next.js 15`：使用 App Router 组织页面，并通过 `output: 'export'` 生成静态站点。
- `React 19`：构建页面组件和交互组件。
- `TypeScript`：约束内容、组件和数据读取逻辑的类型。
- `Tailwind CSS`：负责整体视觉样式、响应式布局和暗色模式样式。
- `next-mdx-remote`：在服务端编译并渲染 `posts` 中的 Markdown/MDX 内容。
- `gray-matter`：读取文章 Frontmatter，例如标题、日期、摘要、标签和发布状态。
- `remark-gfm`、`remark-math`、`rehype-katex`：支持 GFM、数学公式和 KaTeX 渲染。
- `next-themes`：提供亮色/暗色主题切换。

## 目录结构

- `app/`：Next.js App Router 页面入口。
- `app/page.tsx`：个人主页首页。
- `app/profile/page.tsx`：个人简介页面。
- `app/demo/page.tsx`：Demo 展示页面。
- `app/writing/page.tsx`：文章列表页面。
- `app/writing/[...slug]/page.tsx`：文章详情页面，支持 `posts` 下的多级路径。
- `app/docs/notice/tech-stack/page.tsx`：技术栈说明页面。
- `components/`：复用 UI 组件。
- `lib/`：站点数据读取、MDX 解析和业务数据封装。
- `types/`：内容模型类型定义。
- `posts/`：文章源文件目录，支持 `.md` 和 `.mdx`。
- `content/profile.json`：个人简介数据。
- `public/photo/`：头像、背景图等公开图片资源。
- `public/demo/`：Demo 页面使用的视频、PDF、代码等公开资源。
- `admin/`：管理后台静态页面。
- `admin-server.js`：本地管理后端和静态文件服务器。
- `out/`：`pnpm build` 生成的静态导出目录。
- `_next/`、`writing/`、`demo/`、`docs/`、`profile/`、`index.html`：同步到仓库根目录的静态页面，用于 GitHub Pages 直接展示。

## 组件功能

- `components/site-nav.tsx`：站点主导航，负责首页、简介、随笔、Demo、文档等页面入口。
- `components/theme-provider.tsx`：封装 `next-themes`，为全站提供主题状态。
- `components/theme-toggle.tsx`：亮色/暗色模式切换按钮。
- `components/post-card.tsx`：文章列表卡片，展示文章标题、日期、摘要和标签。
- `components/demo-card.tsx`：Demo 展示卡片，根据资源类型展示视频、PDF、代码或普通文件入口。
- `components/mdx-components.tsx`：MDX 渲染组件映射，统一文章中的标题、段落、列表、代码块、链接、表格等样式。
- `components/ui.ts`：通用样式工具和可复用 UI 片段。

## 数据与内容模块

- `lib/mdx.ts`：文章内容管理核心模块。
  - 从 `posts/` 递归读取 `.md` 和 `.mdx` 文件。
  - 使用 `gray-matter` 解析 Frontmatter。
  - 生成文章 slug、文章列表和目录树。
  - 使用 `next-mdx-remote/rsc` 编译 MDX。
  - 通过 `components/mdx-components.tsx` 封装 MDX 组件样式。
- `lib/demos.ts`：读取 `public/demo/` 中的 Demo 资源，并生成 Demo 页面数据。
- `lib/profile.ts`：读取 `content/profile.json`，为简介页面提供头像、背景、介绍和技能信息。
- `lib/site.ts`：站点级配置，例如名称、描述、导航和基础信息。
- `types/content.ts`：定义文章、文章摘要、Frontmatter、目录树等类型。

## 文章 Frontmatter

`posts` 中的文章需要使用如下 Frontmatter：

```md
---
title: 文章标题
date: 2026-07-01
excerpt: 文章摘要，会显示在随笔列表中。
tags: Next.js, MDX, TypeScript
publish: true
---

这里开始写正文。
```

字段说明：

- `title`：文章标题，缺省时会使用文件名。
- `date`：文章日期，建议使用 `YYYY-MM-DD`。
- `excerpt`：文章摘要，用于列表页和详情页头部。
- `tags`：标签，可以写成逗号分隔字符串。
- `publish`：是否发布。只有 `true` 的文章会出现在公开列表和静态构建结果中。

## 在本地发布 posts 中的推文

1. 安装依赖：

```bash
pnpm install
```

2. 在 `posts/` 中创建文章文件，例如：

```bash
posts/my-first-post.md
```

如果需要多级目录，可以创建：

```bash
posts/Seminar/cheeger-colding-theory.md
```

对应访问路径会是：

```text
/writing/Seminar/cheeger-colding-theory/
```

建议文件名使用英文、小写和连字符，避免空格带来的 URL 编码问题。

3. 写入 Frontmatter，并确保 `publish: true`：

```md
---
title: My First Post
date: 2026-07-01
excerpt: 这是一篇本地发布测试文章。
tags: note, test
publish: true
---

# My First Post

正文内容写在这里。
```

4. 启动开发服务器预览：

```bash
pnpm dev
```

打开：

```text
http://localhost:3000/writing
```

5. 检查类型和代码质量：

```bash
CI=true pnpm typecheck
CI=true pnpm lint
```

6. 构建静态站点：

```bash
CI=true pnpm build
```

如果要模拟 GitHub Pages 项目页的 `basePath`，使用：

```bash
GITHUB_ACTIONS=true GITHUB_REPOSITORY=Guiloua/The-Home CI=true pnpm build
```

7. 将 `out/` 中的静态导出同步到仓库根目录：

```bash
rsync -a --delete --exclude='.DS_Store' out/_next/ _next/
rsync -a --delete --exclude='.DS_Store' out/writing/ writing/
rsync -a --delete --exclude='.DS_Store' out/docs/ docs/
rsync -a --delete --exclude='.DS_Store' out/demo/ demo/
rsync -a --delete --exclude='.DS_Store' out/profile/ profile/
rsync -a --delete --exclude='.DS_Store' out/photo/ photo/
rsync -a --delete --exclude='.DS_Store' out/404/ 404/
rsync -a --exclude='.DS_Store' out/index.html out/index.txt out/404.html ./
```

8. 用本地管理服务器检查静态结果：

```bash
PORT=8000 NO_AUTO_OPEN=1 node admin-server.js
```

打开：

```text
http://localhost:8000/writing/
```

9. 提交并推送：

```bash
git add .
git commit -m "Publish new post"
git push origin main
```

推送后，GitHub Pages 会展示同步到仓库根目录的最新静态页面。

## 使用管理后台发布文章

本地管理后台由 `admin-server.js` 提供：

```bash
PORT=8000 node admin-server.js
```

打开：

```text
http://localhost:8000/admin/admin.html
```

管理后台目前负责：

- 读取和保存 `posts/` 顶层 Markdown 文件。
- 调用 `/api/posts` 管理文章。
- 同步已发布文章列表。
- 管理 `public/demo/` 中的 Demo 文件。
- 管理 `content/profile.json` 中的个人简介。
- 触发本地构建和 Git 操作。

注意：`lib/mdx.ts` 支持递归读取 `posts` 下的多级目录；管理后台的文章编辑接口主要面向 `posts/*.md` 顶层文件。多级目录文章建议直接在编辑器中创建和维护。

## 常用命令

```bash
pnpm dev
pnpm typecheck
pnpm lint
pnpm build
PORT=8000 NO_AUTO_OPEN=1 node admin-server.js
```

## 发布检查清单

- 新文章位于 `posts/`。
- Frontmatter 包含 `title`、`date`、`excerpt`、`tags`、`publish`。
- `publish` 已设置为 `true`。
- `pnpm typecheck` 通过。
- `pnpm lint` 通过。
- `pnpm build` 通过。
- `out/` 已同步到仓库根目录。
- 变更已提交并推送到 `main`。
