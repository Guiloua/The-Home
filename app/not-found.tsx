import Link from 'next/link';
import { buttonStyles } from '@/components/ui';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4 dark:bg-zinc-950">
      <div className="text-center">
        <p className="text-sm text-muted">404</p>
        <h1 className="mt-3 text-3xl font-light text-ink dark:text-zinc-100">
          页面不存在
        </h1>
        <Link href="/" className={buttonStyles({ tone: 'primary', className: 'mt-8' })}>
          返回首页
        </Link>
      </div>
    </main>
  );
}
