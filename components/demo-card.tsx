import { Download, FileCode, Play } from 'lucide-react';
import type { DemoItem } from '@/types/content';
import { buttonStyles } from '@/components/ui';

export function DemoCard({ item }: { item: DemoItem }) {
  const icon =
    item.type === 'video' ? (
      <Play className="size-4" />
    ) : item.type === 'code' ? (
      <FileCode className="size-4" />
    ) : (
      <Download className="size-4" />
    );

  return (
    <article className="rounded-lg border border-line bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft dark:border-zinc-800 dark:bg-zinc-950 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-medium text-ink dark:text-zinc-100">
            {item.title}
          </h2>
          <p className="mt-1 truncate text-sm text-muted">{item.name}</p>
        </div>
        <a
          className={buttonStyles({ tone: item.type === 'video' ? 'primary' : 'secondary' })}
          href={item.href}
          target="_blank"
          rel="noreferrer"
        >
          {icon}
          {item.type === 'video' ? '播放视频' : item.type === 'code' ? '查看代码' : '下载文件'}
        </a>
      </div>
      {item.type === 'video' && (
        <video
          className="mt-5 aspect-video w-full rounded-lg bg-zinc-950 object-contain"
          controls
          preload="metadata"
        >
          <source src={item.href} />
        </video>
      )}
    </article>
  );
}
