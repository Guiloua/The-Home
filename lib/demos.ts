import fs from 'node:fs';
import path from 'node:path';
import { withBasePath } from '@/lib/site';
import type { DemoItem } from '@/types/content';

const demoDirectory = path.join(process.cwd(), 'public', 'demo');
const videoExtensions = new Set(['.mp4', '.webm', '.mov']);
const codeExtensions = new Set(['.py', '.ts', '.tsx', '.js', '.jsx']);

const naturalCompare = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

export const getDemoItems = (): DemoItem[] => {
  if (!fs.existsSync(demoDirectory)) return [];

  return fs
    .readdirSync(demoDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && !entry.name.startsWith('.'))
    .map((entry) => {
      const extension = path.extname(entry.name).toLowerCase();
      const type: DemoItem['type'] = videoExtensions.has(extension)
        ? 'video'
        : codeExtensions.has(extension)
          ? 'code'
          : 'file';

      return {
        name: entry.name,
        title: entry.name
          .replace(new RegExp(`${extension}$`, 'i'), '')
          .replace(/[-_]/g, ' '),
        href: withBasePath(`/demo/${entry.name}`),
        type,
      };
    })
    .sort((a, b) => naturalCompare(a.name, b.name));
};
