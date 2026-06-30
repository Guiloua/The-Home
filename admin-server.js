const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = Number(process.env.PORT || 8000);
const ROOT_DIR = __dirname;
const NOTES_DIR = path.join(ROOT_DIR, 'notes');
const WRITING_DIR = path.join(ROOT_DIR, 'writing');
const DEMO_DIR = path.join(ROOT_DIR, 'demo');
const PUBLIC_DEMO_DIR = path.join(ROOT_DIR, 'public', 'demo');
const PROFILE_DIR = path.join(ROOT_DIR, 'profile');
const PROFILE_HTML = path.join(PROFILE_DIR, 'profile.html');
const CONTENT_DIR = path.join(ROOT_DIR, 'content');
const PROFILE_DATA = path.join(CONTENT_DIR, 'profile.json');
const SEARCH_INDEX = path.join(ROOT_DIR, 'search.json');
const CONTENT_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.py': 'text/plain; charset=utf-8',
};

const VIDEO_EXTS = new Set(['.mp4', '.webm', '.mov', '.avi', '.mkv', '.flv', '.wmv']);
const PDF_EXTS = new Set(['.pdf']);
const CODE_EXTS = new Set(['.py', '.js', '.jsx', '.ts', '.tsx']);

const jsonResponse = (res, status, payload) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(payload, null, 2));
};

const readJsonFile = filePath => {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
        return [];
    }
};

const escapeMarkdownFrontmatter = value => String(value || '').replace(/\r?\n/g, ' ').trim();
const stripTags = html => String(html || '').replace(/<[^>]+>/g, '').trim();
const decodeHtml = value => String(value || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const readRequestJson = req => new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
        if (body.length > 50 * 1024 * 1024) {
            reject(new Error('请求体过大'));
            req.destroy();
        }
    });
    req.on('end', () => {
        try {
            resolve(body ? JSON.parse(body) : {});
        } catch (error) {
            reject(error);
        }
    });
    req.on('error', reject);
});

const sanitizeAssetFilename = filename => path.basename(String(filename || '')).replace(/[^a-zA-Z0-9._-]/g, '-');

const htmlToMarkdown = html => decodeHtml(String(html || '')
    .replace(/\r/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n\n')
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n\n')
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n\n')
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?strong[^>]*>/gi, '**')
    .replace(/<\/?b[^>]*>/gi, '**')
    .replace(/<\/?em[^>]*>/gi, '*')
    .replace(/<\/?i[^>]*>/gi, '*')
    .replace(/<[^>]+>/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim());

const parsePublishedHtml = filePath => {
    const html = fs.readFileSync(filePath, 'utf8');
    const title = decodeHtml(stripTags(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || path.basename(filePath, '.html')).replace(/\s*\|\s*NekoChan\s*$/, ''));
    const date = decodeHtml(stripTags(html.match(/<header[\s\S]*?<div[^>]*class="[^"]*text-sm text-gray-400[^"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1] || ''));
    const excerpt = decodeHtml(stripTags(html.match(/<header[\s\S]*?<p[^>]*class="[^"]*text-gray-500[^"]*"[^>]*>([\s\S]*?)<\/p>/i)?.[1] || ''));
    const contentHtml = html.match(/<div[^>]*class="[^"]*article-content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<!--[\s\S]*?-->\s*)*<footer/i)?.[1] || '';
    const tagsText = decodeHtml(stripTags(html.match(/<footer[\s\S]*?<span>([\s\S]*?)<\/span>/i)?.[1] || ''));
    const tags = tagsText.split('#').map(tag => tag.trim()).filter(Boolean).join(', ');

    return {
        title,
        date,
        excerpt,
        tags,
        body: htmlToMarkdown(contentHtml),
    };
};

const parseFrontmatter = content => {
    const match = String(content || '').match(/^\s*---([\s\S]*?)---/);
    const metadata = { title: '', date: '', excerpt: '', tags: '', publish: false };
    if (!match) return { metadata, body: String(content || '').trim() };

    match[1].split('\n').forEach(line => {
        const [key, ...valueParts] = line.split(':');
        if (!key || valueParts.length === 0) return;
        const value = valueParts.join(':').trim();
        metadata[key.trim()] = value === 'true' ? true : (value === 'false' ? false : value);
    });

    return {
        metadata,
        body: String(content || '').slice(match[0].length).trim(),
    };
};

const sanitizeNoteFilename = filename => {
    const safeName = path.basename(String(filename || '')).replace(/[^a-zA-Z0-9._-]/g, '-');
    if (!safeName.endsWith('.md')) return `${safeName || 'untitled'}.md`;
    return safeName;
};

const slugify = value => String(value || '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .trim() || 'untitled';

const notePathFor = filename => path.join(NOTES_DIR, sanitizeNoteFilename(filename));

const markdownFromNote = ({ metadata = {}, body = '' }) => [
    '---',
    `title: ${escapeMarkdownFrontmatter(metadata.title)}`,
    `date: ${escapeMarkdownFrontmatter(metadata.date)}`,
    `excerpt: ${escapeMarkdownFrontmatter(metadata.excerpt)}`,
    `tags: ${escapeMarkdownFrontmatter(metadata.tags)}`,
    `publish: ${metadata.publish === true || metadata.publish === 'true'}`,
    '---',
    '',
    body || '',
    '',
].join('\n');

const noteRecordFromFile = filename => {
    const safeName = sanitizeNoteFilename(filename);
    const filePath = notePathFor(safeName);
    const { metadata, body } = parseFrontmatter(fs.readFileSync(filePath, 'utf8'));
    return {
        filename: safeName,
        metadata,
        content: body,
    };
};

const listNotes = () => {
    fs.mkdirSync(NOTES_DIR, { recursive: true });
    return fs.readdirSync(NOTES_DIR)
        .filter(name => name.endsWith('.md') && !name.startsWith('.'))
        .map(name => {
            const note = noteRecordFromFile(name);
            return {
                filename: note.filename,
                metadata: note.metadata,
                name: note.filename,
            };
        })
        .sort((a, b) => (b.metadata.date || '').localeCompare(a.metadata.date || '') || (a.metadata.title || a.filename).localeCompare(b.metadata.title || b.filename));
};

const escapeHtml = value => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const markdownToHtml = markdown => String(markdown || '')
    .split(/\n{2,}/)
    .map(block => {
        const escaped = escapeHtml(block).replace(/\n/g, '<br>');
        if (block.startsWith('### ')) return `<h3>${escapeHtml(block.slice(4))}</h3>`;
        if (block.startsWith('## ')) return `<h2>${escapeHtml(block.slice(3))}</h2>`;
        if (block.startsWith('# ')) return `<h1>${escapeHtml(block.slice(2))}</h1>`;
        return `<p>${escaped}</p>`;
    })
    .join('\n');

const renderPostHtml = ({ metadata, body }) => {
    const tagsHtml = String(metadata.tags || '').split(',').map(tag => tag.trim()).filter(Boolean).map(tag => `#${escapeHtml(tag)}`).join(' ');
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(metadata.title)} | NekoChan</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="../css/style.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js"></script>
</head>
<body>
    <nav class="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-gray-100 z-50 h-16 flex items-center px-8">
        <a href="../home.html" class="text-xl font-medium text-gray-800">Me</a>
        <div class="ml-auto flex items-center space-x-8">
            <a href="../writing/writing.html" class="text-gray-600 hover:text-gray-900 text-sm font-light">随笔</a>
            <a href="../profile/profile.html" class="text-gray-600 hover:text-gray-900 text-sm font-light">简介</a>
            <a href="../demo/demo.html" class="text-gray-600 hover:text-gray-900 text-sm font-light">Demo</a>
        </div>
    </nav>
    <article class="max-w-2xl mx-auto pt-24 pb-16 px-4">
        <header class="mb-10 text-center">
            <div class="text-sm text-gray-400 mb-3 font-light">${escapeHtml(metadata.date)}</div>
            <h1 class="text-3xl md:text-4xl font-light text-gray-800 mb-4 leading-tight">${escapeHtml(metadata.title)}</h1>
            <p class="text-gray-500 text-lg font-light">${escapeHtml(metadata.excerpt)}</p>
        </header>
        <div class="article-content text-gray-700 text-base leading-relaxed">${markdownToHtml(body)}</div>
        <footer class="mt-12 pt-8 border-t border-gray-100 text-sm text-gray-400 flex justify-between">
            <a href="../home.html" class="hover:text-gray-600 transition-colors">← 返回首页</a>
            <span>${tagsHtml}</span>
        </footer>
    </article>
    <script src="../js/site.js?v=20260616.1" defer></script>
</body></html>`;
};

const syncWritingIndexFromNotes = () => {
    const published = listNotes()
        .filter(note => note.metadata.publish === true || note.metadata.publish === 'true')
        .map(note => ({
            metadata: note.metadata,
            slug: note.filename.replace(/\.md$/i, ''),
        }))
        .sort((a, b) => (b.metadata.date || '').localeCompare(a.metadata.date || ''));

    const search = published.map(note => ({
        title: note.metadata.title,
        url: `./writing/${note.slug}.html`,
        excerpt: note.metadata.excerpt,
        date: note.metadata.date,
    }));
    fs.writeFileSync(SEARCH_INDEX, JSON.stringify(search, null, 2), 'utf8');

    const writingIndex = path.join(WRITING_DIR, 'writing.html');
    if (fs.existsSync(writingIndex)) {
        const indexHtml = fs.readFileSync(writingIndex, 'utf8');
        const items = published.map(note => `<div class="post-item bg-white rounded-xl p-6 border border-gray-100 shadow-sm"><a href="./${note.slug}.html"><div class="flex items-center justify-between mb-2"><h2 class="text-xl font-medium text-gray-800 hover:text-gray-600 transition-colors">${escapeHtml(note.metadata.title)}</h2><span class="text-xs text-gray-400">${escapeHtml(note.metadata.date)}</span></div><p class="text-gray-500 text-sm line-clamp-2">${escapeHtml(note.metadata.excerpt)}</p></a></div>`).join('\n');
        fs.writeFileSync(writingIndex, indexHtml.replace(/(<div class="space-y-6" id="postList">)[\s\S]*?(<\/div>\s*<\/main>)/, `$1\n${items}\n$2`), 'utf8');
    }
};

const publishNoteFile = filename => {
    const note = noteRecordFromFile(filename);
    const slug = note.filename.replace(/\.md$/i, '') || slugify(note.metadata.title);
    fs.mkdirSync(WRITING_DIR, { recursive: true });
    fs.writeFileSync(path.join(WRITING_DIR, `${slug}.html`), renderPostHtml({
        metadata: note.metadata,
        body: note.content,
    }), 'utf8');
    syncWritingIndexFromNotes();
    return { ...note, slug, url: `./writing/${slug}.html` };
};

const listPublishedPages = () => {
    const searchItems = readJsonFile(SEARCH_INDEX);
    const byFile = new Map();

    if (Array.isArray(searchItems)) {
        searchItems.forEach(item => {
            const relativeUrl = String(item.url || '').replace(/^\.\//, '');
            if (!relativeUrl.startsWith('writing/') || !relativeUrl.endsWith('.html')) return;
            byFile.set(path.basename(relativeUrl), {
                title: item.title || '',
                date: item.date || '',
                excerpt: item.excerpt || '',
                url: `./${relativeUrl}`,
            });
        });
    }

    if (fs.existsSync(WRITING_DIR)) {
        fs.readdirSync(WRITING_DIR)
            .filter(name => name.endsWith('.html') && !name.startsWith('.') && !['index.html', 'writing.html', 'post-template.html'].includes(name))
            .forEach(name => {
                if (!byFile.has(name)) byFile.set(name, { url: `./writing/${name}` });
            });
    }

    return [...byFile.entries()].map(([filename, item]) => {
        const htmlPath = path.join(WRITING_DIR, filename);
        const notePath = path.join(NOTES_DIR, filename.replace(/\.html$/, '.md'));
        const parsed = fs.existsSync(htmlPath) ? parsePublishedHtml(htmlPath) : {};
        return {
            filename,
            noteFilename: path.basename(notePath),
            url: item.url || `./writing/${filename}`,
            title: item.title || parsed.title || filename.replace(/\.html$/, ''),
            date: item.date || parsed.date || '',
            excerpt: item.excerpt || parsed.excerpt || '',
            hasNote: fs.existsSync(notePath),
        };
    }).sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.title.localeCompare(b.title));
};

const syncPublishedPages = ({ overwrite = false } = {}) => {
    fs.mkdirSync(NOTES_DIR, { recursive: true });
    const results = [];

    listPublishedPages().forEach(page => {
        const htmlPath = path.join(WRITING_DIR, page.filename);
        const notePath = path.join(NOTES_DIR, page.noteFilename);
        if (!fs.existsSync(htmlPath)) return;
        const noteExists = fs.existsSync(notePath);
        if (noteExists && !overwrite) {
            results.push({ ...page, action: 'skipped' });
            return;
        }

        const parsed = parsePublishedHtml(htmlPath);
        const metadata = {
            title: page.title || parsed.title,
            date: page.date || parsed.date,
            excerpt: page.excerpt || parsed.excerpt,
            tags: parsed.tags,
            publish: true,
        };
        const markdown = [
            '---',
            `title: ${escapeMarkdownFrontmatter(metadata.title)}`,
            `date: ${escapeMarkdownFrontmatter(metadata.date)}`,
            `excerpt: ${escapeMarkdownFrontmatter(metadata.excerpt)}`,
            `tags: ${escapeMarkdownFrontmatter(metadata.tags)}`,
            `publish: ${metadata.publish}`,
            '---',
            '',
            parsed.body || '',
            '',
        ].join('\n');

        fs.writeFileSync(notePath, markdown, 'utf8');
        results.push({ ...page, hasNote: true, action: noteExists ? 'synced' : 'created' });
    });

    return results;
};

const demoTypeFor = filename => {
    const ext = path.extname(filename).toLowerCase();
    if (VIDEO_EXTS.has(ext)) return 'video';
    if (PDF_EXTS.has(ext)) return 'pdf';
    if (CODE_EXTS.has(ext)) return 'code';
    return 'file';
};

const demoTitleFor = filename => {
    const ext = path.extname(filename);
    return path.basename(filename, ext).replace(/^[\d]+-/, '').replace(/[-_]/g, ' ');
};

const listDemoFiles = () => {
    fs.mkdirSync(PUBLIC_DEMO_DIR, { recursive: true });
    return fs.readdirSync(PUBLIC_DEMO_DIR, { withFileTypes: true })
        .filter(entry => entry.isFile() && !entry.name.startsWith('.'))
        .map(entry => ({
            name: entry.name,
            title: demoTitleFor(entry.name),
            type: demoTypeFor(entry.name),
            href: `/demo/${entry.name}`,
            size: fs.statSync(path.join(PUBLIC_DEMO_DIR, entry.name)).size,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
};

const syncPublicDemosFromLegacy = ({ overwrite = false } = {}) => {
    fs.mkdirSync(PUBLIC_DEMO_DIR, { recursive: true });
    if (!fs.existsSync(DEMO_DIR)) return [];

    return fs.readdirSync(DEMO_DIR, { withFileTypes: true })
        .filter(entry => entry.isFile() && !entry.name.startsWith('.') && !['index.html', 'demo.html'].includes(entry.name))
        .map(entry => {
            const source = path.join(DEMO_DIR, entry.name);
            const target = path.join(PUBLIC_DEMO_DIR, entry.name);
            const exists = fs.existsSync(target);
            if (!exists || overwrite) {
                fs.copyFileSync(source, target);
                return { name: entry.name, action: exists ? 'synced' : 'created' };
            }
            return { name: entry.name, action: 'skipped' };
        });
};

const defaultProfile = {
    name: 'Neko',
    title: 'MaHoShaojyu',
    avatar: '/photo/toma.jpg',
    background: '/photo/background.jpeg',
    about: ["saving world's neko chan", 'This is neko chan no secrete world!'],
    skills: ['Fighting', 'Saving', 'Feeling'],
};

const normalizeTextArray = value => {
    if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean);
    return String(value || '').split(/\r?\n/).map(item => item.trim()).filter(Boolean);
};

const parseProfileHtml = () => {
    if (!fs.existsSync(PROFILE_HTML)) return defaultProfile;
    const html = fs.readFileSync(PROFILE_HTML, 'utf8');
    const name = decodeHtml(stripTags(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] || defaultProfile.name));
    const title = decodeHtml(stripTags(html.match(/<p class="text-gray-500 font-light">([\s\S]*?)<\/p>/)?.[1] || defaultProfile.title));
    const aboutHtml = html.match(/<div class="text-gray-600 space-y-4 leading-relaxed">([\s\S]*?)<\/div>/)?.[1] || '';
    const aboutMatches = [...aboutHtml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map(match => decodeHtml(stripTags(match[1])).trim()).filter(Boolean);
    const skillHtml = html.match(/<div class="flex flex-wrap gap-2">([\s\S]*?)<\/div>/)?.[1] || '';
    const skills = [...skillHtml.matchAll(/<span[^>]*>([^<]+)<\/span>/g)].map(match => decodeHtml(match[1]).trim()).filter(Boolean);

    return {
        ...defaultProfile,
        name,
        title,
        about: aboutMatches.length ? aboutMatches : defaultProfile.about,
        skills: skills.length ? skills : defaultProfile.skills,
    };
};

const readProfile = () => {
    fs.mkdirSync(CONTENT_DIR, { recursive: true });
    if (!fs.existsSync(PROFILE_DATA)) {
        const parsed = parseProfileHtml();
        fs.writeFileSync(PROFILE_DATA, JSON.stringify(parsed, null, 2), 'utf8');
        return parsed;
    }

    try {
        const profile = JSON.parse(fs.readFileSync(PROFILE_DATA, 'utf8'));
        return {
            ...defaultProfile,
            ...profile,
            about: normalizeTextArray(profile.about).length ? normalizeTextArray(profile.about) : defaultProfile.about,
            skills: normalizeTextArray(profile.skills).length ? normalizeTextArray(profile.skills) : defaultProfile.skills,
        };
    } catch {
        return parseProfileHtml();
    }
};

const renderProfileHtml = profile => `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>简介 | NekoChan</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="../css/style.css">
</head>
<body>
    <nav class="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-gray-100 z-50 h-16 flex items-center px-8">
        <a href="../home.html" class="text-xl font-medium text-gray-800">NekoChan</a>
        <div class="ml-auto flex items-center space-x-8">
            <a href="../writing/writing.html" class="text-gray-600 hover:text-gray-900 text-sm font-light">随笔</a>
            <a href="../profile/profile.html" class="text-gray-600 hover:text-gray-900 text-sm font-light">简介</a>
            <a href="../demo/demo.html" class="text-gray-600 hover:text-gray-900 text-sm font-light">Demo</a>
        </div>
    </nav>
    <main class="pt-24 pb-16 px-4">
        <div class="max-w-2xl mx-auto">
            <div class="text-center mb-10">
                <img src="../photo/toma.jpg" alt="头像" class="w-32 h-32 rounded-full object-cover border-4 border-white shadow-md mx-auto mb-6">
                <h1 class="text-3xl md:text-4xl font-light text-gray-800 mb-2">${escapeHtml(profile.name)}</h1>
                <p class="text-gray-500 font-light">${escapeHtml(profile.title)}</p>
            </div>
            <div class="bg-white rounded-xl p-8 border border-gray-100 shadow-sm">
                <h2 class="text-xl font-medium text-gray-800 mb-4">Who am I?</h2>
                <div class="text-gray-600 space-y-4 leading-relaxed">
${profile.about.map(item => `                    <p>${escapeHtml(item)}</p>`).join('\n')}
                </div>
                <div class="mt-8">
                    <h3 class="text-lg font-medium text-gray-800 mb-3">Skill</h3>
                    <div class="flex flex-wrap gap-2">
${profile.skills.map(skill => `                        <span class="px-3 py-1 bg-gray-50 border border-gray-200 rounded-full text-sm text-gray-600">${escapeHtml(skill)}</span>`).join('\n')}
                    </div>
                </div>
            </div>
        </div>
    </main>
</body>
</html>`;

const writeProfile = payload => {
    const profile = {
        ...defaultProfile,
        name: String(payload.name || defaultProfile.name).trim(),
        title: String(payload.title || defaultProfile.title).trim(),
        avatar: String(payload.avatar || defaultProfile.avatar).trim(),
        background: String(payload.background || defaultProfile.background).trim(),
        about: normalizeTextArray(payload.about),
        skills: normalizeTextArray(payload.skills),
    };
    fs.mkdirSync(CONTENT_DIR, { recursive: true });
    fs.mkdirSync(PROFILE_DIR, { recursive: true });
    fs.writeFileSync(PROFILE_DATA, JSON.stringify(profile, null, 2), 'utf8');
    fs.writeFileSync(PROFILE_HTML, renderProfileHtml(profile), 'utf8');
    return profile;
};

const runCommand = command => new Promise(resolve => {
    exec(command, { cwd: ROOT_DIR }, (error, stdout, stderr) => {
        resolve({
            success: !error,
            output: stdout,
            error: stderr || (error ? error.message : ''),
        });
    });
});

const syncNextSite = async ({ build = false } = {}) => {
    const demoResults = syncPublicDemosFromLegacy({ overwrite: false });
    const profile = readProfile();
    syncWritingIndexFromNotes();

    const result = {
        demos: listDemoFiles(),
        demoSynced: demoResults.filter(item => item.action === 'synced' || item.action === 'created').length,
        demoSkipped: demoResults.filter(item => item.action === 'skipped').length,
        profile,
        notes: listNotes(),
    };

    if (build) {
        result.build = await runCommand('CI=true pnpm build');
        if (!result.build.success) throw new Error(result.build.error || 'Next 构建失败');
    }

    return result;
};

const server = http.createServer((req, res) => {
    // 处理跨域 (CORS)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'GET' && requestUrl.pathname === '/api/notes') {
        try {
            jsonResponse(res, 200, { success: true, notes: listNotes() });
        } catch (error) {
            jsonResponse(res, 500, { success: false, error: error.message });
        }
        return;
    }

    if (req.method === 'GET' && requestUrl.pathname.startsWith('/api/notes/')) {
        try {
            const filename = decodeURIComponent(requestUrl.pathname.replace('/api/notes/', ''));
            jsonResponse(res, 200, { success: true, note: noteRecordFromFile(filename) });
        } catch (error) {
            jsonResponse(res, 404, { success: false, error: error.message });
        }
        return;
    }

    if (req.method === 'POST' && requestUrl.pathname === '/api/notes') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const metadata = payload.metadata || {};
                const filename = sanitizeNoteFilename(payload.filename || `${slugify(metadata.title)}.md`);
                fs.mkdirSync(NOTES_DIR, { recursive: true });
                fs.writeFileSync(notePathFor(filename), markdownFromNote({
                    metadata,
                    body: payload.content || '',
                }), 'utf8');
                jsonResponse(res, 200, { success: true, note: noteRecordFromFile(filename) });
            } catch (error) {
                jsonResponse(res, 500, { success: false, error: `保存失败：${error.message}` });
            }
        });
        return;
    }

    if (req.method === 'DELETE' && requestUrl.pathname.startsWith('/api/notes/')) {
        try {
            const filename = decodeURIComponent(requestUrl.pathname.replace('/api/notes/', ''));
            const filePath = notePathFor(filename);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            jsonResponse(res, 200, { success: true });
        } catch (error) {
            jsonResponse(res, 500, { success: false, error: error.message });
        }
        return;
    }

    if (req.method === 'POST' && requestUrl.pathname.startsWith('/api/publish-note/')) {
        try {
            const filename = decodeURIComponent(requestUrl.pathname.replace('/api/publish-note/', ''));
            jsonResponse(res, 200, { success: true, published: publishNoteFile(filename) });
        } catch (error) {
            jsonResponse(res, 500, { success: false, error: error.message });
        }
        return;
    }

    if (req.method === 'POST' && requestUrl.pathname === '/api/sync-indexes') {
        try {
            syncWritingIndexFromNotes();
            jsonResponse(res, 200, { success: true });
        } catch (error) {
            jsonResponse(res, 500, { success: false, error: error.message });
        }
        return;
    }

    if (req.method === 'POST' && requestUrl.pathname === '/api/sync-site') {
        readRequestJson(req)
            .then(options => syncNextSite(options))
            .then(result => jsonResponse(res, 200, { success: true, ...result }))
            .catch(error => jsonResponse(res, 500, { success: false, error: error.message }));
        return;
    }

    if (req.method === 'GET' && requestUrl.pathname === '/api/published-pages') {
        jsonResponse(res, 200, { success: true, pages: listPublishedPages() });
        return;
    }

    if (req.method === 'POST' && requestUrl.pathname === '/api/sync-published-pages') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const options = body ? JSON.parse(body) : {};
                const pages = syncPublishedPages(options);
                jsonResponse(res, 200, {
                    success: true,
                    pages,
                    synced: pages.filter(page => page.action === 'synced' || page.action === 'created').length,
                    skipped: pages.filter(page => page.action === 'skipped').length,
                });
            } catch (error) {
                jsonResponse(res, 500, { success: false, error: error.message });
            }
        });
        return;
    }

    if (req.method === 'GET' && requestUrl.pathname === '/api/demos') {
        try {
            syncPublicDemosFromLegacy({ overwrite: false });
            jsonResponse(res, 200, { success: true, demos: listDemoFiles() });
        } catch (error) {
            jsonResponse(res, 500, { success: false, error: error.message });
        }
        return;
    }

    if (req.method === 'POST' && requestUrl.pathname === '/api/sync-demos') {
        readRequestJson(req)
            .then(options => {
                const results = syncPublicDemosFromLegacy(options);
                jsonResponse(res, 200, {
                    success: true,
                    demos: listDemoFiles(),
                    synced: results.filter(item => item.action === 'synced' || item.action === 'created').length,
                    skipped: results.filter(item => item.action === 'skipped').length,
                });
            })
            .catch(error => jsonResponse(res, 500, { success: false, error: error.message }));
        return;
    }

    if (req.method === 'POST' && requestUrl.pathname === '/api/demos') {
        readRequestJson(req)
            .then(payload => {
                const filename = sanitizeAssetFilename(payload.filename);
                if (!filename) throw new Error('缺少文件名');
                if (!payload.contentBase64) throw new Error('缺少文件内容');
                fs.mkdirSync(PUBLIC_DEMO_DIR, { recursive: true });
                fs.writeFileSync(path.join(PUBLIC_DEMO_DIR, filename), Buffer.from(payload.contentBase64, 'base64'));
                jsonResponse(res, 200, { success: true, demos: listDemoFiles() });
            })
            .catch(error => jsonResponse(res, 500, { success: false, error: error.message }));
        return;
    }

    if (req.method === 'DELETE' && requestUrl.pathname.startsWith('/api/demos/')) {
        try {
            const filename = sanitizeAssetFilename(decodeURIComponent(requestUrl.pathname.replace('/api/demos/', '')));
            const filePath = path.join(PUBLIC_DEMO_DIR, filename);
            if (filename && fs.existsSync(filePath)) fs.unlinkSync(filePath);
            jsonResponse(res, 200, { success: true, demos: listDemoFiles() });
        } catch (error) {
            jsonResponse(res, 500, { success: false, error: error.message });
        }
        return;
    }

    if (req.method === 'GET' && requestUrl.pathname === '/api/profile') {
        try {
            jsonResponse(res, 200, { success: true, profile: readProfile() });
        } catch (error) {
            jsonResponse(res, 500, { success: false, error: error.message });
        }
        return;
    }

    if (req.method === 'POST' && requestUrl.pathname === '/api/profile') {
        readRequestJson(req)
            .then(payload => {
                jsonResponse(res, 200, { success: true, profile: writeProfile(payload.profile || payload) });
            })
            .catch(error => jsonResponse(res, 500, { success: false, error: error.message }));
        return;
    }

    // 静态文件服务
    if (req.method === 'GET' || req.method === 'HEAD') {
        let pathname = decodeURIComponent(requestUrl.pathname);
        if (pathname === '/') pathname = '/home.html';
        if (pathname.endsWith('/')) pathname += 'index.html';

        const filePath = path.normalize(path.join(ROOT_DIR, pathname));
        if (!filePath.startsWith(ROOT_DIR + path.sep)) {
            res.writeHead(403);
            res.end('Forbidden');
            return;
        }

        const extname = path.extname(filePath);
        const contentType = CONTENT_TYPES[extname] || 'text/plain; charset=utf-8';

        fs.readFile(filePath, (error, content) => {
            if (error) {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(req.method === 'HEAD' ? undefined : content, 'utf-8');
            }
        });
        return;
    }

    // Git 操作 API
    if (req.method === 'POST' && requestUrl.pathname === '/git-sync') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            let payload;
            try {
                payload = body ? JSON.parse(body) : {};
            } catch (error) {
                jsonResponse(res, 400, { success: false, error: 'Git 请求格式无效' });
                return;
            }

            const { action, message } = payload;
            let command = '';
            if (action === 'commit') {
                const safeMessage = String(message || 'Update from admin').replace(/"/g, '\\"');
                command = `git add . && git commit -m "${safeMessage}"`;
            } else if (action === 'push') {
                command = 'git push -u origin main';
            } else {
                jsonResponse(res, 400, { success: false, error: '未知 Git 操作' });
                return;
            }

            console.log(`执行命令: ${command}`);
            exec(command, (err, stdout, stderr) => {
                jsonResponse(res, err ? 500 : 200, {
                    success: !err,
                    output: stdout,
                    error: stderr,
                });
            });
        });
        return;
    }
});

server.listen(PORT, () => {
    const url = `http://localhost:${PORT}/admin/admin.html`;
    console.log(`管理服务器已启动: ${url}`);
    if (process.env.NO_AUTO_OPEN === '1') return;
    
    // 自动打开 Chrome 浏览器
    let command;
    if (process.platform === 'darwin') {
        command = `open -a "Google Chrome" ${url}`;
    } else if (process.platform === 'win32') {
        command = `start chrome ${url}`;
    } else {
        command = `google-chrome ${url}`;
    }
    
    exec(command, (err) => {
        if (err) {
            console.log("无法自动启动 Chrome，请手动访问。");
            // 如果启动 Chrome 失败，尝试用默认方式打开
            const fallback = (process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open');
            exec(`${fallback} ${url}`);
        }
    });
});
