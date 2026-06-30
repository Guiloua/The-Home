export type PostMeta = {
  title: string;
  date: string;
  excerpt: string;
  tags: string[];
  publish: boolean;
};

export type PostSummary = PostMeta & {
  slug: string;
  url: string;
};

export type Post = PostSummary & {
  content: string;
};

export type PostTreeNode = {
  name: string;
  path: string;
  children: PostTreeNode[];
  post?: PostSummary;
};

export type DemoItem = {
  name: string;
  title: string;
  href: string;
  type: 'video' | 'code' | 'file';
};
