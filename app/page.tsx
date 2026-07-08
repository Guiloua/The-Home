import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BookOpen, FolderKanban, UserRound } from 'lucide-react';
import { SiteNav } from '@/components/site-nav';
import { PostCard } from '@/components/post-card';
import { badgeStyles, buttonStyles } from '@/components/ui';
import { getDemoItems } from '@/lib/demos';
import { getAllPosts } from '@/lib/mdx';
import { withBasePath } from '@/lib/site';

export default function HomePage() {
  const posts = getAllPosts();
  const demos = getDemoItems();
  const featuredPosts = posts.slice(0, 3);
  const featuredDemos = demos.slice(0, 3);

  return (
    <>
      <SiteNav posts={posts} />
      <main className="bg-paper dark:bg-zinc-950">
        <section className="relative min-h-[92vh] overflow-hidden pt-16">
          <Image
            src={withBasePath('/photo/profile.png')}
            alt="NekoChan"
            fill
            priority
            sizes="100vw"
            className="object-cover object-[center_38%] sm:object-[center_42%]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/28 to-black/64" />
          <div className="relative z-10 mx-auto flex min-h-[calc(92vh-4rem)] max-w-6xl flex-col justify-end px-4 pb-14 sm:px-6 lg:px-8">
            <div className="max-w-2xl text-white">
              <p className="mb-4 text-sm font-medium uppercase tracking-normal text-white/75">
                Personal Site
              </p>
              <h1 className="text-4xl font-light leading-tight sm:text-6xl">
                NekoChan
              </h1>
              <p className="mt-5 max-w-xl text-base leading-8 text-white/85 sm:text-lg">
                写代码，也写文字。这里收纳随笔、实验 Demo 和一些持续演进的小工具。
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/writing" className={buttonStyles({ tone: 'primary' })}>
                  阅读随笔
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/profile"
                  className="inline-flex items-center justify-center rounded-md border border-white/60 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
                >
                  了解更多
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
          <div>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm text-muted">Latest writing</p>
                <h2 className="mt-2 text-3xl font-light text-ink dark:text-zinc-100">
                  最近随笔
                </h2>
              </div>
              <Link
                href="/writing"
                className="hidden text-sm text-muted transition hover:text-ink dark:hover:text-zinc-100 sm:inline"
              >
                查看全部
              </Link>
            </div>
            <div className="mt-6 space-y-4">
              {featuredPosts.map((post) => (
                <PostCard key={post.slug} post={post} compact />
              ))}
            </div>
          </div>

          <div className="grid content-start gap-4">
            <Link
              href="/profile"
              className="group rounded-lg border border-line bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="flex items-center gap-3">
                <UserRound className="size-5 text-muted transition group-hover:text-ink dark:group-hover:text-zinc-100" />
                <div>
                  <h2 className="font-medium text-ink dark:text-zinc-100">简介</h2>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    个人介绍、背景图片和技能标签。
                  </p>
                </div>
              </div>
            </Link>
            <Link
              href="/demo"
              className="group rounded-lg border border-line bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="flex items-center gap-3">
                <FolderKanban className="size-5 text-muted transition group-hover:text-ink dark:group-hover:text-zinc-100" />
                <div>
                  <h2 className="font-medium text-ink dark:text-zinc-100">Demo</h2>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    {demos.length} 个公开实验资源。
                  </p>
                </div>
              </div>
            </Link>
            <div className="rounded-lg border border-line bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center gap-3">
                <BookOpen className="size-5 text-muted" />
                <div>
                  <h2 className="font-medium text-ink dark:text-zinc-100">内容源</h2>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    posts 中的 Markdown/MDX 会直接生成静态页面。
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {['Next.js', 'MDX', 'Tailwind CSS'].map((item) => (
                  <span key={item} className={badgeStyles({ tone: 'accent' })}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {featuredDemos.length > 0 && (
          <section className="border-t border-line bg-white py-14 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm text-muted">Demo archive</p>
                  <h2 className="mt-2 text-3xl font-light text-ink dark:text-zinc-100">
                    最近 Demo
                  </h2>
                </div>
                <Link
                  href="/demo"
                  className="text-sm text-muted transition hover:text-ink dark:hover:text-zinc-100"
                >
                  查看全部
                </Link>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {featuredDemos.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    className="rounded-lg border border-line p-5 transition hover:-translate-y-0.5 hover:shadow-soft dark:border-zinc-800"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <p className="text-sm text-muted">{item.type}</p>
                    <h3 className="mt-2 font-medium text-ink dark:text-zinc-100">
                      {item.title}
                    </h3>
                    <p className="mt-3 truncate text-sm text-muted">{item.name}</p>
                  </a>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
