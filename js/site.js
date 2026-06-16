(() => {
    const currentScript = document.currentScript;
    const scriptUrl = currentScript ? new URL(currentScript.src) : new URL('js/site.js', location.href);
    const siteRootPath = scriptUrl.pathname.replace(/\/js\/site\.js$/, '/');

    function relativeSiteRoot() {
        const currentPath = location.pathname.endsWith('/')
            ? location.pathname
            : location.pathname.slice(0, location.pathname.lastIndexOf('/') + 1);

        if (!currentPath.startsWith(siteRootPath)) return './';

        const nestedPath = currentPath.slice(siteRootPath.length).replace(/\/$/, '');
        const depth = nestedPath ? nestedPath.split('/').filter(Boolean).length : 0;
        return depth ? '../'.repeat(depth) : './';
    }

    const rootPrefix = relativeSiteRoot();
    const $ = id => document.getElementById(id);
    const escapeHtml = text => {
        const node = document.createElement('div');
        node.textContent = text || '';
        return node.innerHTML;
    };
    const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    function resolveSiteUrl(path) {
        return rootPrefix + path.replace(/^\.\//, '');
    }

    function initMobileMenu() {
        const mobileMenuBtn = $('mobileMenuBtn');
        const mobileMenu = $('mobileMenu');
        if (!mobileMenuBtn || !mobileMenu) return;

        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    function highlight(text, query) {
        if (!query) return escapeHtml(text);
        const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
        return String(text || '')
            .split(regex)
            .map(part => part.toLowerCase() === query.toLowerCase()
                ? `<mark class="bg-yellow-200 rounded px-1">${escapeHtml(part)}</mark>`
                : escapeHtml(part))
            .join('');
    }

    function initSearch() {
        const searchInput = $('searchInput');
        const searchResults = $('searchResults');
        const searchContent = $('searchContent');
        if (!searchInput || !searchResults || !searchContent) return;

        let posts = [];
        let selectedIndex = -1;

        fetch(resolveSiteUrl('search.json'))
            .then(response => response.json())
            .then(data => {
                posts = Array.isArray(data) ? data : [];
            })
            .catch(error => {
                console.log('加载搜索索引失败:', error);
            });

        const updateSelection = () => {
            document.querySelectorAll('.search-result-item').forEach((item, index) => {
                item.classList.toggle('active', index === selectedIndex);
            });
        };

        const displayResults = (results, query) => {
            if (results.length === 0) {
                searchContent.innerHTML = '<div class="px-4 py-3 text-sm text-gray-400">未找到相关内容</div>';
                searchResults.classList.remove('hidden');
                return;
            }

            searchContent.innerHTML = results.map((post, index) => `
                <a href="${resolveSiteUrl(post.url)}" class="search-result-item block px-4 py-3 border-b border-gray-50 ${index === selectedIndex ? 'active' : ''}">
                    <div class="font-medium text-gray-800 text-sm mb-1">${highlight(post.title, query)}</div>
                    <div class="text-xs text-gray-400 mb-1">${escapeHtml(post.date)}</div>
                    <div class="text-xs text-gray-500 line-clamp-1">${escapeHtml(post.excerpt)}</div>
                </a>
            `).join('');
            searchResults.classList.remove('hidden');
        };

        const performSearch = query => {
            if (!query.trim()) {
                searchResults.classList.add('hidden');
                selectedIndex = -1;
                return;
            }

            const lowerQuery = query.toLowerCase();
            const results = posts.filter(post =>
                String(post.title || '').toLowerCase().includes(lowerQuery) ||
                String(post.excerpt || '').toLowerCase().includes(lowerQuery)
            );

            selectedIndex = results.length > 0 ? 0 : -1;
            displayResults(results, lowerQuery);
            updateSelection();
        };

        searchInput.addEventListener('keydown', event => {
            const items = document.querySelectorAll('.search-result-item');
            if (items.length === 0) return;

            if (event.key === 'ArrowDown') {
                event.preventDefault();
                selectedIndex = (selectedIndex + 1) % items.length;
                updateSelection();
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                selectedIndex = selectedIndex <= 0 ? items.length - 1 : selectedIndex - 1;
                updateSelection();
            } else if (event.key === 'Enter') {
                event.preventDefault();
                if (selectedIndex >= 0) window.location.href = items[selectedIndex].getAttribute('href');
            } else if (event.key === 'Escape') {
                searchResults.classList.add('hidden');
                searchInput.value = '';
                selectedIndex = -1;
            }
        });

        searchInput.addEventListener('input', () => performSearch(searchInput.value));
        searchInput.addEventListener('focus', () => {
            if (searchInput.value.trim()) performSearch(searchInput.value);
        });
        document.addEventListener('click', event => {
            if (!event.target.closest('.search-container')) searchResults.classList.add('hidden');
        });
    }

    function renderMath() {
        if (!window.renderMathInElement) return;
        renderMathInElement(document.body, {
            delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '$', right: '$', display: false },
                { left: '\\(', right: '\\)', display: false },
                { left: '\\[', right: '\\]', display: true },
            ],
            throwOnError: false,
        });
    }

    function init() {
        initMobileMenu();
        initSearch();
        renderMath();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.addEventListener('load', renderMath);
})();
