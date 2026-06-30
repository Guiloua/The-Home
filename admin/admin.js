let rootDirHandle, notesDirHandle, writingDirHandle, demoDirHandle;
let notesFiles = [], currentNote = null, currentFileHandle = null, currentTab = 'notes';
let markedParser = null;
let backendMode = false;
const ADMIN_VERSION = '20260701.1';
window.NekoAdmin = { version: ADMIN_VERSION };

const PATHS = Object.freeze({
    home: '../home.html',
    writingIndex: 'writing.html',
    profileIndex: 'profile.html',
    demoIndex: 'demo.html',
});
const DEMO_INDEX_FILES = new Set(['index.html', PATHS.demoIndex]);
const ENABLE_AFTER_CONNECT = ['btnNewNote', 'btnPublishAll', 'btnAddDemo', 'btnGitCommit', 'btnGitPush'];

const $ = id => document.getElementById(id);
const escapeHtml = t => { const d = document.createElement('div'); d.textContent = t || ''; return d.innerHTML; };
const escapeAttr = escapeHtml;
const slugify = t => t ? t.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').trim() : 'untitled';
const setDisabled = (ids, disabled) => ids.forEach(id => { $(id).disabled = disabled; });
const hasDirectoryPicker = () => typeof window.showDirectoryPicker === 'function';
const apiJson = async (url, options = {}) => {
    const response = await fetch(url, options);
    const result = await response.json();
    if (!result.success) throw new Error(result.error || '请求失败');
    return result;
};

import('https://cdn.jsdelivr.net/npm/marked@11/lib/marked.esm.js')
    .then(module => {
        markedParser = module.marked;
        updatePreview();
    })
    .catch(error => {
        console.warn('Markdown parser failed to load, using fallback renderer.', error);
    });

const POST_TEMPLATE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} | NekoChan</title>
    <script src="https://cdn.tailwindcss.com"><\/script>
    <link rel="stylesheet" href="../css/style.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"><\/script>
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js"><\/script>
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
    <div class="text-sm text-gray-400 mb-3 font-light">{date}</div>
    <h1 class="text-3xl md:text-4xl font-light text-gray-800 mb-4 leading-tight">{title}</h1>
    <p class="text-gray-500 text-lg font-light">{excerpt}</p>
</header>
<div class="article-content text-gray-700 text-base leading-relaxed">{content}</div>
<footer class="mt-12 pt-8 border-t border-gray-100 text-sm text-gray-400 flex justify-between">
    <a href="../home.html" class="hover:text-gray-600 transition-colors">← 返回首页</a>
    <span>{tagsHtml}</span>
</footer>
    </article>
    <script src="../js/site.js?v=20260616.1" defer><\/script>
</body></html>`;

const DB_NAME = 'NekoChanAdmin';
const STORE_NAME = 'Handles';
const getDB = () => new Promise(r => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => r(req.result);
});
const saveHandle = async h => { const db = await getDB(); db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(h, 'rootDir'); };
const loadHandle = async () => { const db = await getDB(); return new Promise(r => { const req = db.transaction(STORE_NAME).objectStore(STORE_NAME).get('rootDir'); req.onsuccess = () => r(req.result); }); };

async function verifyPermission(handle) {
    if (await handle.queryPermission({ mode: 'readwrite' }) === 'granted') return true;
    return await handle.requestPermission({ mode: 'readwrite' }) === 'granted';
}

async function setupDirectories(handle) {
    backendMode = false;
    rootDirHandle = handle;
    notesDirHandle = await rootDirHandle.getDirectoryHandle('notes', { create: true });
    writingDirHandle = await rootDirHandle.getDirectoryHandle('writing', { create: true });
    demoDirHandle = await rootDirHandle.getDirectoryHandle('demo', { create: true });
    $('dirStatus').textContent = '已连接: ' + rootDirHandle.name;
    setDisabled(ENABLE_AFTER_CONNECT, false);
    loadNotesList(); loadDemos(); loadProfile(); saveHandle(handle);
}

async function selectRootDir() {
    if (!hasDirectoryPicker()) {
        $('dirStatus').textContent = '请使用 Chrome 连接项目目录';
        return;
    }
    try {
        const handle = await window.showDirectoryPicker();
        await setupDirectories(handle);
    } catch (e) {
        console.error(e);
    }
}

async function restoreSavedDirectory() {
    try {
        await apiJson('/api/notes');
        backendMode = true;
        $('dirStatus').textContent = '后端管理模式';
        $('btnSelectRoot').disabled = true;
        setDisabled(['btnNewNote', 'btnPublishAll', 'btnAddDemo', 'btnGitCommit', 'btnGitPush'], false);
        await loadNotesList();
        await loadDemos();
        await loadProfile();
        return;
    } catch (error) {
        backendMode = false;
    }

    if (!hasDirectoryPicker()) {
        $('dirStatus').textContent = '当前浏览器不支持目录连接';
        $('btnSelectRoot').disabled = true;
        return;
    }
    const savedHandle = await loadHandle();
    if (savedHandle) {
        $('dirStatus').textContent = '点击连接恢复 My_home';
        $('btnSelectRoot').onclick = async () => {
            if (await verifyPermission(savedHandle)) await setupDirectories(savedHandle);
            else selectRootDir();
        };
    } else {
        $('dirStatus').textContent = '未连接项目目录';
        $('btnSelectRoot').onclick = selectRootDir;
    }
}

async function loadNotesList() {
    if (backendMode) {
        const result = await apiJson('/api/notes');
        notesFiles = result.notes.map(note => ({
            ...note,
            backend: true,
            name: note.filename,
            filename: note.filename,
        }));
        renderNotesList();
        return;
    }

    if (!notesDirHandle) return;
    notesFiles = [];
    for await (const entry of notesDirHandle.values()) {
        if (entry.kind === 'file' && entry.name.endsWith('.md')) {
            const f = await entry.getFile();
            const { metadata } = parseFrontmatter(await f.text());
            notesFiles.push({ name: entry.name, handle: entry, metadata, filename: entry.name });
        }
    }
    notesFiles.sort((a, b) => (b.metadata.date || '').localeCompare(a.metadata.date || ''));
    renderNotesList();
}

function renderNotesList() {
            const query = $('searchInput').value.toLowerCase();
            $('notesList').innerHTML = notesFiles.filter(n => (n.metadata.title || n.name).toLowerCase().includes(query)).map(note => `
                <div class="note-item p-2 cursor-pointer text-sm rounded ${currentNote?.filename === note.filename ? 'active' : 'hover:bg-gray-50'}" data-note-filename="${escapeAttr(note.filename)}">
                    <div class="font-medium truncate">${escapeHtml(note.metadata.title || note.filename)}</div>
                    <div class="text-[10px] text-gray-400">${note.metadata.date || ''} ${note.metadata.publish ? '[已发布]' : ''}</div>
                </div>`).join('');
        }

function parseFrontmatter(c) {
    const m = c.match(/^\s*---([\s\S]*?)---/);
    const meta = { title: '', date: '', excerpt: '', publish: false, tags: '' };
    if (m) {
        m[1].split('\n').forEach(l => {
            const [k, ...v] = l.split(':');
            if (k && v.length) { meta[k.trim()] = v.join(':').trim() === 'true' ? true : (v.join(':').trim() === 'false' ? false : v.join(':').trim()); }
        });
    }
    return { metadata: meta, body: m ? c.slice(m[0].length).trim() : c.trim() };
}

async function openNote(fn) {
    const n = notesFiles.find(i => i.filename === fn);
    if (!n) return;
    if (backendMode || n.backend) {
        const result = await apiJson(`/api/notes/${encodeURIComponent(fn)}`);
        const { metadata, content } = result.note;
        currentNote = { metadata, content, filename: fn };
        currentFileHandle = { name: fn, backend: true };
        $('currentNoteTitle').textContent = metadata.title || fn;
        $('metaTitle').value = metadata.title;
        $('metaDate').value = metadata.date;
        $('metaExcerpt').value = metadata.excerpt;
        $('metaTags').value = metadata.tags;
        $('publishCheck').checked = !!metadata.publish;
        $('editorContent').value = content;
        $('editorContent').disabled = false;
        setDisabled(['btnSaveNote', 'btnPublishCurrent', 'btnDeleteNote'], false);
        updatePreview();
        renderNotesList();
        return;
    }

    const file = await n.handle.getFile();
    const { metadata, body } = parseFrontmatter(await file.text());
    currentNote = { metadata, content: body, filename: fn }; currentFileHandle = n.handle;
    $('metaTitle').value = metadata.title; $('metaDate').value = metadata.date;
    $('metaExcerpt').value = metadata.excerpt; $('metaTags').value = metadata.tags;
    $('publishCheck').checked = !!metadata.publish; $('editorContent').value = body;
    $('editorContent').disabled = false; ['btnSaveNote', 'btnPublishCurrent', 'btnDeleteNote'].forEach(id => $(id).disabled = false);
    updatePreview(); renderNotesList();
}

function protectLatex(text) {
    const blocks = []; let idx = 0;
    // 使用不会被 Markdown 解析的占位符（避免使用下划线）
    text = text.replace(/\$\$([\s\S]*?)\$\$/g, (m, content) => {
        const id = `MATHBLOCK${idx}MATH`;
        blocks.push({ id, content: `$$${content}$$` }); idx++; return id;
    });
    text = text.replace(/\$([^\$\n]+?)\$/g, (m, content) => {
        const id = `MATHINLINE${idx}MATH`;
        blocks.push({ id, content: `$${content}$` }); idx++; return id;
    });
    return { text, blocks };
}
function restoreLatex(html, blocks) {
    // 按索引降序替换，防止出现 MATHBLOCK10 包含 MATHBLOCK1 的情况（虽然此处有 MATH 结尾，但降序更稳健）
    const sortedBlocks = [...blocks].sort((a, b) => b.id.length - a.id.length);
    sortedBlocks.forEach(b => {
        // 使用 split/join 实现全局替换
        html = html.split(b.id).join(b.content);
    });
    return html;
}
        function parseMarkdownWithLatex(text) {
            const { text: pt, blocks } = protectLatex(text);
            const html = markedParser ? markedParser.parse(pt) : fallbackMarkdown(pt);
            return restoreLatex(html, blocks);
        }
        function fallbackMarkdown(text) {
            return escapeHtml(text)
                .split(/\n{2,}/)
                .map(block => {
                    if (block.startsWith('### ')) return `<h3>${block.slice(4)}</h3>`;
                    if (block.startsWith('## ')) return `<h2>${block.slice(3)}</h2>`;
                    if (block.startsWith('# ')) return `<h1>${block.slice(2)}</h1>`;
                    return `<p>${block.replace(/\n/g, '<br>')}</p>`;
                })
                .join('\n');
        }
const updatePreview = () => {
    $('previewArea').innerHTML = `<div class="article-content">${parseMarkdownWithLatex($('editorContent').value)}</div>`;
    if (window.renderMathInElement) renderMathInElement($('previewArea'), {delimiters: [{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}], throwOnError: false});
};

async function saveNote() {
    const meta = { title: $('metaTitle').value, date: $('metaDate').value, excerpt: $('metaExcerpt').value, tags: $('metaTags').value, publish: $('publishCheck').checked };

    if (backendMode) {
        const filename = currentFileHandle?.name || `${slugify(meta.title)}.md`;
        const result = await apiJson('/api/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                filename,
                metadata: meta,
                content: $('editorContent').value,
            }),
        });
        currentFileHandle = { name: result.note.filename, backend: true };
        currentNote = {
            metadata: result.note.metadata,
            content: result.note.content,
            filename: result.note.filename,
        };
        $('saveStatus').textContent = '✓ 已保存 ' + result.note.filename;
        await loadNotesList();
        return result.note.filename;
    }

    if (!notesDirHandle) return;
    const text = '---\n' + Object.entries(meta).map(([k,v])=>`${k}: ${v}`).join('\n') + '\n---\n\n' + $('editorContent').value;
    const fn = currentFileHandle?.name || `${slugify(meta.title)}.md`;
    const h = currentFileHandle || await notesDirHandle.getFileHandle(fn, {create:true});
    const w = await h.createWritable(); await w.write(text); await w.close();
    $('saveStatus').textContent = '✓ 已保存 ' + fn;
    await loadNotesList(); if (!currentFileHandle) await openNote(fn);
    return fn;
}

async function publishNote() {
    const savedFilename = await saveNote();
    if (backendMode) {
        await apiJson(`/api/publish-note/${encodeURIComponent(savedFilename)}`, { method: 'POST' });
        alert('发布成功');
        return;
    }

    const slug = currentFileHandle?.name?.replace(/\.md$/i, '') || slugify($('metaTitle').value);
    const html = POST_TEMPLATE.replace(/{title}/g, escapeHtml($('metaTitle').value)).replace(/{date}/g, $('metaDate').value).replace(/{excerpt}/g, escapeHtml($('metaExcerpt').value)).replace(/{content}/g, parseMarkdownWithLatex($('editorContent').value)).replace(/{tagsHtml}/g, ($('metaTags').value || '').split(',').map(t=>`#${t.trim()}`).join(' '));
    const w = await (await writingDirHandle.getFileHandle(`${slug}.html`, {create:true})).createWritable();
    await w.write(html); await w.close();
    await syncIndexes();
    alert('发布成功');
}

async function syncIndexes() {
    if (backendMode) {
        const result = await apiJson('/api/sync-site', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ build: true }),
        });
        $('publishStatus').textContent = `✓ 新版前端同步完成：${result.notes.length} 篇随笔，${result.demos.length} 个 Demo`;
        await loadNotesList();
        await loadDemos();
        await loadProfile();
        return;
    }

    const pub = [];
    for await (const e of notesDirHandle.values()) {
        if (e.name.endsWith('.md')) {
            const { metadata } = parseFrontmatter(await (await e.getFile()).text());
            if (metadata.publish) pub.push({ metadata, slug: e.name.replace(/\.md$/i, '') });
        }
    }
    pub.sort((a,b) => (b.metadata.date || '').localeCompare(a.metadata.date || ''));
    const search = pub.map(p => ({ title: p.metadata.title, url: `./writing/${p.slug}.html`, excerpt: p.metadata.excerpt, date: p.metadata.date }));
    const sw = await (await rootDirHandle.getFileHandle('search.json', {create:true})).createWritable();
    await sw.write(JSON.stringify(search, null, 2)); await sw.close();
            const ih = await writingDirHandle.getFileHandle(PATHS.writingIndex);
    let ic = await (await ih.getFile()).text();
    const items = pub.map(p => `<div class="post-item bg-white rounded-xl p-6 border border-gray-100 shadow-sm"><a href="./${p.slug}.html"><div class="flex items-center justify-between mb-2"><h2 class="text-xl font-medium text-gray-800 hover:text-gray-600 transition-colors">${escapeHtml(p.metadata.title)}</h2><span class="text-xs text-gray-400">${p.metadata.date}</span></div><p class="text-gray-500 text-sm line-clamp-2">${escapeHtml(p.metadata.excerpt)}</p></a></div>`).join('\n');
    const newIc = ic.replace(/(<div class="space-y-6" id="postList">)[\s\S]*?(<\/div>\s*<\/main>)/, `$1\n${items}\n$2`);
    const iw = await ih.createWritable(); await iw.write(newIc); await iw.close();
    await updateDemoIndex();
}

async function syncPublishedPages() {
    const btn = $('btnSyncPublished');
    const oldText = btn.textContent;
    btn.disabled = true;
    btn.textContent = '同步中...';
    $('publishStatus').textContent = '';

    try {
        const response = await fetch('/api/sync-published-pages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ overwrite: false }),
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error || '同步失败');

        $('publishStatus').textContent = `已同步 ${result.synced} 个，跳过 ${result.skipped} 个`;
        if (backendMode || notesDirHandle) {
            await loadNotesList();
        } else {
            $('dirStatus').textContent = '已同步，请连接项目目录后管理';
        }
    } catch (error) {
        $('publishStatus').textContent = '同步已发布失败';
        alert('同步已发布失败: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = oldText;
    }
}

async function updateDemoIndex() {
    if (backendMode) {
        const result = await apiJson('/api/sync-demos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ overwrite: false }),
        });
        $('publishStatus').textContent = `Demo 已同步 ${result.synced} 个，跳过 ${result.skipped} 个`;
        await loadDemos();
        return;
    }

    if (!demoDirHandle) return;
    const files = [];
    const videoExts = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.flv', '.wmv'];
    const pdfExts = ['.pdf'];
    for await (const e of demoDirHandle.values()) {
                if (DEMO_INDEX_FILES.has(e.name) || e.name.startsWith('.')) continue;
        const ext = '.' + e.name.split('.').pop().toLowerCase();
        let type = 'other';
        if (videoExts.includes(ext)) type = 'video';
        else if (pdfExts.includes(ext)) type = 'pdf';
        const title = e.name.replace(new RegExp(ext + '$', 'i'), '').replace(/^[\d]+\-/, '').replace(/[-_]/g, ' ');
        files.push({ name: e.name, title, type, ext });
    }
    files.sort((a,b) => a.name.localeCompare(b.name));
            const ih = await demoDirHandle.getFileHandle(PATHS.demoIndex);
    let c = await (await ih.getFile()).text();
    const items = files.map(f => {
        let buttonHtml, previewHtml = '';
        if (f.type === 'pdf') buttonHtml = `<a href="./${f.name}" target="_blank" class="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">查看 PDF</a>`;
        else if (f.type === 'video') {
            buttonHtml = `<a href="./${f.name}" target="_blank" class="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600">播放视频</a>`;
            previewHtml = `<div class="mt-4"><video controls class="w-full rounded-lg max-h-64 object-contain bg-gray-900" preload="metadata"><source src="./${f.name}">您的浏览器不支持视频播放</video></div>`;
        } else buttonHtml = `<a href="./${f.name}" target="_blank" class="px-4 py-2 bg-gray-500 text-white rounded-lg text-sm hover:bg-gray-600">下载文件</a>`;
        return `<div class="demo-item bg-white rounded-xl p-6 border border-gray-100 shadow-sm fade-in"><div class="flex items-center justify-between"><div><h2 class="text-xl font-medium text-gray-800 mb-1">${escapeHtml(f.title)}</h2><p class="text-sm text-gray-500">${f.name}</p></div>${buttonHtml}</div>${previewHtml}</div>`;
    }).join('\n');
    const nc = c.replace(/(<div class="space-y-4" id="demoList">)[\s\S]*?(<\/div>\s*<\/main>)/, `$1\n${items}\n$2`);
    const w = await ih.createWritable(); await w.write(nc); await w.close();
}

const switchTab = t => {
    currentTab = t;
    ['Notes', 'Demos', 'Profile'].forEach(i => {
        $(`tab${i}`).className = i.toLowerCase() === t ? 'flex-1 py-3 text-sm font-medium tab-active' : 'flex-1 py-3 text-sm font-medium';
        $(`panel${i}`).classList.toggle('hidden', i.toLowerCase() !== t);
    });
    if (t === 'profile' && (backendMode || rootDirHandle)) loadProfile();
    if (t === 'demos' && (backendMode || rootDirHandle)) loadDemos();
};

async function loadDemos() {
    if (backendMode) {
        const result = await apiJson('/api/demos');
        $('demoFilesList').innerHTML = result.demos.map(f => `<div class="flex justify-between p-2 text-sm border-b hover:bg-gray-50"><span>${escapeHtml(f.name)} <span class="text-[10px] text-gray-400">(${escapeHtml(f.type)})</span></span><button class="text-red-400 hover:text-red-600" data-demo-name="${escapeAttr(f.name)}">删除</button></div>`).join('');
        return;
    }

            if (!demoDirHandle) return;
            const files = []; for await (const e of demoDirHandle.values()) if (e.kind === 'file' && !DEMO_INDEX_FILES.has(e.name) && !e.name.startsWith('.')) files.push(e.name);
            $('demoFilesList').innerHTML = files.sort().map(f => `<div class="flex justify-between p-2 text-sm border-b hover:bg-gray-50"><span>${escapeHtml(f)}</span><button class="text-red-400 hover:text-red-600" data-demo-name="${escapeAttr(f)}">删除</button></div>`).join('');
        }

async function loadProfile() {
    if (backendMode) {
        try {
            const result = await apiJson('/api/profile');
            const profile = result.profile;
            $('profileName').value = profile.name || '';
            $('profileTitle').value = profile.title || '';
            $('profileContent').value = (profile.about || []).join('\n\n');
            $('profileSkills').value = (profile.skills || []).join(', ');
            $('profileStatus').textContent = '个人简介加载成功';
        } catch (e) {
            $('profileStatus').textContent = '个人简介加载失败';
            console.error(e);
        }
        return;
    }

    try {
        const pDir = await rootDirHandle.getDirectoryHandle('profile');
                const c = await (await (await pDir.getFileHandle(PATHS.profileIndex)).getFile()).text();
        $('profileName').value = c.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1].trim() || '';
        $('profileTitle').value = c.match(/<p class="text-gray-500 font-light">([\s\S]*?)<\/p>/)?.[1].trim() || '';
        $('profileContent').value = c.match(/<div class="text-gray-600 space-y-4 leading-relaxed">([\s\S]*?)<\/div>/)?.[1].trim() || '';
        const skills = []; const skillMatch = c.match(/<div class="flex flex-wrap gap-2">([\s\S]*?)<\/div>/)?.[1] || '';
        const skillRegex = /<span[^>]*>([^<]+)<\/span>/g; let m; while(m = skillRegex.exec(skillMatch)) skills.push(m[1].trim());
        $('profileSkills').value = skills.join(', ');
        $('profileStatus').textContent = '个人简介加载成功';
    } catch (e) { console.error(e); }
}

async function saveProfile() {
    try {
        const name = $('profileName').value, title = $('profileTitle').value, about = $('profileContent').value, skills = $('profileSkills').value.split(',').map(s=>s.trim()).filter(s=>s);
        if (backendMode) {
            await apiJson('/api/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    profile: {
                        name,
                        title,
                        about: about.split(/\n{2,}|\n/).map(item => item.trim()).filter(Boolean),
                        skills,
                        avatar: '/photo/toma.jpg',
                        background: '/photo/background.jpeg',
                    },
                }),
            });
            $('profileStatus').textContent = '✓ 已保存';
            alert('简介保存成功');
            return;
        }

        const pDir = await rootDirHandle.getDirectoryHandle('profile');
                const h = await pDir.getFileHandle(PATHS.profileIndex);
        let c = await (await h.getFile()).text();
        c = c.replace(/(<h1[^>]*>)[\s\S]*?(<\/h1>)/, `$1${name}$2`).replace(/(<p class="text-gray-500 font-light">)[\s\S]*?(<\/p>)/, `$1${title}$2`).replace(/(<div class="text-gray-600 space-y-4 leading-relaxed">)[\s\S]*?(<\/div>)/, `$1\n${about}\n$2`);
        const sHtml = skills.map(s => `<span class="px-3 py-1 bg-gray-50 border border-gray-200 rounded-full text-sm text-gray-600">${s}</span>`).join('\n');
        c = c.replace(/(<div class="flex flex-wrap gap-2">)[\s\S]*?(<\/div>)/, `$1\n${sHtml}\n$2`);
        const w = await h.createWritable(); await w.write(c); await w.close();
        $('profileStatus').textContent = '✓ 已保存'; alert('简介保存成功');
    } catch (e) { alert('保存失败: ' + e.message); }
}

async function gitAction(action) {
    const btn = action === 'commit' ? $('btnGitCommit') : $('btnGitPush');
    const ot = btn.textContent; btn.disabled = true; btn.textContent = '执行中...';
    try {
        const response = await fetch('/git-sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, message: action === 'commit' ? `Admin update: ${currentNote?.metadata?.title || 'site content'}` : '' }) });
        const result = await response.json();
        if (result.success) alert(action === 'commit' ? '本地备份成功' : '远程推送成功');
        else alert('Git 操作失败: ' + (result.error || '未知错误'));
    } catch (e) { alert('无法连接服务器，请运行 node admin-server.js'); } finally { btn.disabled = false; btn.textContent = ot; }
}

function resetEditorForNewNote() {
    currentNote = null;
    currentFileHandle = null;
    $('currentNoteTitle').textContent = '新建随笔';
    $('metaTitle').value = '';
    $('metaDate').value = new Date().toISOString().slice(0, 10);
    $('metaExcerpt').value = '';
    $('metaTags').value = '';
    $('publishCheck').checked = false;
    $('editorContent').value = '';
    $('editorContent').disabled = false;
    setDisabled(['btnSaveNote', 'btnPublishCurrent'], false);
    $('btnDeleteNote').disabled = true;
    updatePreview();
}

async function deleteCurrentNote() {
    if (!currentFileHandle || !confirm('确认删除?')) return;
    if (backendMode) {
        await apiJson(`/api/notes/${encodeURIComponent(currentFileHandle.name)}`, { method: 'DELETE' });
        currentNote = null;
        currentFileHandle = null;
        $('currentNoteTitle').textContent = '未选择随笔';
        $('editorContent').value = '';
        $('editorContent').disabled = true;
        setDisabled(['btnSaveNote', 'btnPublishCurrent', 'btnDeleteNote'], true);
        await loadNotesList();
        return;
    }

    await notesDirHandle.removeEntry(currentFileHandle.name);
    currentNote = null;
    currentFileHandle = null;
    $('currentNoteTitle').textContent = '未选择随笔';
    $('editorContent').value = '';
    $('editorContent').disabled = true;
    setDisabled(['btnSaveNote', 'btnPublishCurrent', 'btnDeleteNote'], true);
    await loadNotesList();
}

async function addDemoFile() {
    try {
        const [h] = await window.showOpenFilePicker();
        const f = await h.getFile();
        if (backendMode) {
            const bytes = new Uint8Array(await f.arrayBuffer());
            let binary = '';
            bytes.forEach(byte => { binary += String.fromCharCode(byte); });
            await apiJson('/api/demos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: f.name,
                    contentBase64: btoa(binary),
                }),
            });
            await loadDemos();
            $('publishStatus').textContent = '✓ Demo 已添加';
            return;
        }

        const nh = await demoDirHandle.getFileHandle(f.name, {create:true});
        const w = await nh.createWritable();
        await w.write(f);
        await w.close();
        await loadDemos();
        await updateDemoIndex();
    } catch (e) {}
}

function bindEvents() {
    $('tabNotes').onclick = () => switchTab('notes');
    $('tabDemos').onclick = () => switchTab('demos');
    $('tabProfile').onclick = () => switchTab('profile');
    $('btnPreviewHome').onclick = () => window.open(PATHS.home, '_blank');
    $('btnSaveNote').onclick = saveNote;
    $('btnPublishCurrent').onclick = publishNote;
    $('btnPublishAll').onclick = syncIndexes;
    $('btnSyncPublished').onclick = syncPublishedPages;
    $('btnGitCommit').onclick = () => gitAction('commit');
    $('btnGitPush').onclick = () => gitAction('push');
    $('btnSaveProfile').onclick = saveProfile;
    $('btnDeleteNote').onclick = deleteCurrentNote;
    $('btnNewNote').onclick = resetEditorForNewNote;
    $('btnAddDemo').onclick = addDemoFile;
    $('editorContent').oninput = updatePreview;
    $('searchInput').oninput = renderNotesList;
    $('notesList').onclick = e => {
        const item = e.target.closest('[data-note-filename]');
        if (item) openNote(item.dataset.noteFilename);
    };
    $('demoFilesList').onclick = async e => {
        const button = e.target.closest('[data-demo-name]');
        if (!button || !confirm(`删除 ${button.dataset.demoName}?`)) return;
        if (backendMode) {
            await apiJson(`/api/demos/${encodeURIComponent(button.dataset.demoName)}`, { method: 'DELETE' });
            await loadDemos();
            $('publishStatus').textContent = '✓ Demo 已删除';
            return;
        }
        await demoDirHandle.removeEntry(button.dataset.demoName);
        await loadDemos();
        await updateDemoIndex();
    };
}

function init() {
    bindEvents();
    switchTab('notes');
    restoreSavedDirectory();
}

init();
