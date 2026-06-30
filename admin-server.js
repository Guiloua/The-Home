const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = Number(process.env.PORT || 8000);
const ROOT_DIR = __dirname;
const POSTS_DIR = path.join(ROOT_DIR, 'posts');
const WRITING_DIR = path.join(ROOT_DIR, 'writing');
const DEMO_DIR = path.join(ROOT_DIR, 'demo');
const PUBLIC_DEMO_DIR = path.join(ROOT_DIR, 'public', 'demo');
const CONTENT_DIR = path.join(ROOT_DIR, 'content');
const PROFILE_DATA = path.join(CONTENT_DIR, 'profile.json');
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

const notePathFor = filename => path.join(POSTS_DIR, sanitizeNoteFilename(filename));

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
    fs.mkdirSync(POSTS_DIR, { recursive: true });
    return fs.readdirSync(POSTS_DIR)
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

const syncWritingIndexFromNotes = () => {
    return listNotes()
        .filter(note => note.metadata.publish === true || note.metadata.publish === 'true')
        .map(note => ({
            metadata: note.metadata,
            slug: note.filename.replace(/\.md$/i, ''),
        }))
        .sort((a, b) => (b.metadata.date || '').localeCompare(a.metadata.date || ''));
};

const publishNoteFile = filename => {
    const note = noteRecordFromFile(filename);
    const slug = note.filename.replace(/\.md$/i, '') || slugify(note.metadata.title);
    return { ...note, slug, url: `/writing/${slug}/` };
};

const listPublishedPages = () => {
    return listNotes().map(note => {
        const slug = note.filename.replace(/\.md$/i, '');
        return {
            filename: `${slug}/`,
            noteFilename: note.filename,
            url: `/writing/${slug}/`,
            title: note.metadata.title || slug,
            date: note.metadata.date || '',
            excerpt: note.metadata.excerpt || '',
            hasNote: true,
        };
    }).sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.title.localeCompare(b.title));
};

const syncPublishedPages = ({ overwrite = false } = {}) => {
    return listPublishedPages().map(page => ({ ...page, action: overwrite ? 'synced' : 'skipped' }));
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
        .filter(entry => entry.isFile() && !entry.name.startsWith('.') && !['index.html', 'index.txt'].includes(entry.name))
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

const readProfile = () => {
    fs.mkdirSync(CONTENT_DIR, { recursive: true });
    if (!fs.existsSync(PROFILE_DATA)) {
        fs.writeFileSync(PROFILE_DATA, JSON.stringify(defaultProfile, null, 2), 'utf8');
        return defaultProfile;
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
        return defaultProfile;
    }
};

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
    fs.writeFileSync(PROFILE_DATA, JSON.stringify(profile, null, 2), 'utf8');
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
    const published = syncWritingIndexFromNotes();

    const posts = listNotes();
    const result = {
        demos: listDemoFiles(),
        demoSynced: demoResults.filter(item => item.action === 'synced' || item.action === 'created').length,
        demoSkipped: demoResults.filter(item => item.action === 'skipped').length,
        profile,
        published,
        posts,
        notes: posts,
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
    const apiPath = requestUrl.pathname.replace(/^\/api\/notes(?=\/|$)/, '/api/posts');

    if (req.method === 'GET' && apiPath === '/api/posts') {
        try {
            const posts = listNotes();
            jsonResponse(res, 200, { success: true, posts, notes: posts });
        } catch (error) {
            jsonResponse(res, 500, { success: false, error: error.message });
        }
        return;
    }

    if (req.method === 'GET' && apiPath.startsWith('/api/posts/')) {
        try {
            const filename = decodeURIComponent(apiPath.replace('/api/posts/', ''));
            const post = noteRecordFromFile(filename);
            jsonResponse(res, 200, { success: true, post, note: post });
        } catch (error) {
            jsonResponse(res, 404, { success: false, error: error.message });
        }
        return;
    }

    if (req.method === 'POST' && apiPath === '/api/posts') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const metadata = payload.metadata || {};
                const filename = sanitizeNoteFilename(payload.filename || `${slugify(metadata.title)}.md`);
                fs.mkdirSync(POSTS_DIR, { recursive: true });
                fs.writeFileSync(notePathFor(filename), markdownFromNote({
                    metadata,
                    body: payload.content || '',
                }), 'utf8');
                const post = noteRecordFromFile(filename);
                jsonResponse(res, 200, { success: true, post, note: post });
            } catch (error) {
                jsonResponse(res, 500, { success: false, error: `保存失败：${error.message}` });
            }
        });
        return;
    }

    if (req.method === 'DELETE' && apiPath.startsWith('/api/posts/')) {
        try {
            const filename = decodeURIComponent(apiPath.replace('/api/posts/', ''));
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
        if (pathname === '/') pathname = '/index.html';
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
