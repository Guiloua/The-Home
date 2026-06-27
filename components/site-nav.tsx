'use client';

import Link from 'next/link';
import { Menu, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { PostSummary } from '@/types/content';
import { ThemeToggle } from '@/components/theme-toggle';
import { buttonStyles } from '@/components/ui';

const navItems = [
  { href: '/writing', label: '随笔' },
  { href: '/profile', label: '简介' },
  { href: '/demo', label: 'Demo' },
  { href: '/docs/notice/tech-stack', label: '技术栈' },
] as const;

export function SiteNav({ posts }: { posts: PostSummary[] }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return [];
    return posts
      .filter(
        (post) =>
          post.title.toLowerCase().includes(keyword) ||
          post.excerpt.toLowerCase().includes(keyword),
      )
      .slice(0, 6);
  }, [posts, query]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-white/85 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/85">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="mr-auto text-lg font-semibold text-ink transition hover:text-muted dark:text-zinc-100"
        >
          NekoChan
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="nav-link text-sm text-muted transition hover:text-ink dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="relative hidden sm:block">
          <div className="flex items-center rounded-full border border-line bg-gray-50 px-3 py-1.5 transition focus-within:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900">
            <Search className="size-4 text-muted dark:text-zinc-400" />
            <input
              aria-label="搜索随笔"
              className="w-32 bg-transparent pl-2 text-sm text-ink outline-none transition focus:w-48 dark:text-zinc-100"
              placeholder="搜索随笔..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          {results.length > 0 && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border border-line bg-white p-2 shadow-soft dark:border-zinc-800 dark:bg-zinc-950">
              {results.map((post) => (
                <Link
                  key={post.slug}
                  href={post.url}
                  className="block rounded-md px-3 py-2 transition hover:bg-gray-50 dark:hover:bg-zinc-900"
                  onClick={() => setQuery('')}
                >
                  <div className="truncate text-sm font-medium text-ink dark:text-zinc-100">
                    {post.title}
                  </div>
                  <div className="mt-1 line-clamp-1 text-xs text-muted">
                    {post.excerpt}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <ThemeToggle />

        <button
          aria-label="打开菜单"
          className={buttonStyles({ tone: 'secondary', className: 'px-2 md:hidden' })}
          type="button"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-line bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950 md:hidden">
          <nav className="mx-auto grid max-w-6xl gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-2 py-2 text-sm text-muted hover:bg-gray-50 hover:text-ink dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
