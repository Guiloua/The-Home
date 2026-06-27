import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SiteNav } from '@/components/site-nav';
import { buttonStyles } from '@/components/ui';
import { getAllPosts } from '@/lib/mdx';
import { withBasePath } from '@/lib/site';

export default function HomePage() {
  const posts = getAllPosts();

  return (
    <>
      <SiteNav posts={posts} />
      <main className="relative min-h-screen overflow-hidden pt-16">
        <Image
          src={withBasePath('/photo/profile.png')}
          alt="NekoChan"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/50" />
        <section className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col justify-end px-4 pb-16 sm:px-6 lg:px-8">
          <div className="max-w-2xl text-white">
            <p className="mb-4 text-sm font-medium uppercase tracking-normal text-white/75">
              Personal Site
            </p>
            <h1 className="text-4xl font-light leading-tight sm:text-6xl">
              NekoChan
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-white/80 sm:text-lg">
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
        </section>
      </main>
    </>
  );
}
