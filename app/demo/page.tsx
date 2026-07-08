import type { Metadata } from 'next';
import { DemoCard } from '@/components/demo-card';
import { SiteNav } from '@/components/site-nav';
import { getDemoItems } from '@/lib/demos';
import { getAllPosts } from '@/lib/mdx';

export const metadata: Metadata = {
  title: 'Demo',
  description: 'NekoChan demo archive.',
};

export default function DemoPage() {
  const posts = getAllPosts();
  const demos = getDemoItems();

  return (
    <>
      <SiteNav posts={posts} />
      <main className="mx-auto max-w-4xl px-4 pb-16 pt-28 sm:px-6">
        <header className="mb-10 border-b border-line pb-8 dark:border-zinc-800">
          <p className="text-sm text-muted">Demo archive</p>
          <h1 className="mt-2 text-4xl font-light text-ink dark:text-zinc-100">
            Demo
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">
            视频、代码和文件资源会从 public/demo 自动生成展示列表。
          </p>
        </header>

        <div className="space-y-5">
          {demos.map((item) => (
            <DemoCard key={item.name} item={item} />
          ))}
        </div>
      </main>
    </>
  );
}
