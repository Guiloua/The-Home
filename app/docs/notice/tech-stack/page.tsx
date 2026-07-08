import type { Metadata } from 'next';
import { SiteNav } from '@/components/site-nav';
import { badgeStyles } from '@/components/ui';
import { getAllPosts } from '@/lib/mdx';

export const metadata: Metadata = {
  title: '前端技术栈',
  description: 'NekoChan site frontend stack.',
};

const sections = [
  {
    title: '框架与基础库',
    items: ['React 19', 'Next.js 15 App Router', 'TypeScript', 'pnpm'],
  },
  {
    title: '组件与样式',
    items: ['Tailwind CSS', '@tailwindcss/typography', 'tailwind-variants', 'next-themes'],
  },
  {
    title: 'Markdown 与内容管理',
    items: ['next-mdx-remote', 'gray-matter', 'lib/mdx', 'posts 目录'],
  },
  {
    title: '工具链',
    items: ['ESLint', 'Prettier', 'PostCSS', 'Autoprefixer'],
  },
];

export default function TechStackPage() {
  const posts = getAllPosts();

  return (
    <>
      <SiteNav posts={posts} />
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-28 sm:px-6">
        <article className="rounded-lg border border-line bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <header>
            <p className="text-sm text-muted">2025-03-05 - 00:00</p>
            <h1 className="mt-3 text-4xl font-light leading-tight text-ink dark:text-zinc-100">
              NekoChan 前端技术栈
            </h1>
            <p className="mt-5 leading-8 text-zinc-700 dark:text-zinc-300">
              参考真红小站的技术栈说明，当前站点已迁移到 Next.js 15、React 19、
              TypeScript、Tailwind CSS 与 MDX 内容源组合。
            </p>
          </header>

          <div className="mt-10 space-y-8">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-xl font-medium text-ink dark:text-zinc-100">
                  {section.title}
                </h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {section.items.map((item) => (
                    <span key={item} className={badgeStyles({ tone: 'accent' })}>
                      {item}
                    </span>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <section className="mt-10 border-t border-line pt-8 dark:border-zinc-800">
            <h2 className="text-xl font-medium text-ink dark:text-zinc-100">总结</h2>
            <p className="mt-4 leading-8 text-zinc-700 dark:text-zinc-300">
              新前端把页面路由、内容读取、主题切换和样式系统拆到明确模块中。
              文章直接来自 posts 目录，gray-matter 读取标题、日期等 Frontmatter
              元数据，next-mdx-remote 解析并渲染 MDX 内容。
              自定义的 lib/mdx 模块负责读取文件、生成目录树，并统一封装
              MDX 组件配置。
            </p>
          </section>
        </article>
      </main>
    </>
  );
}
