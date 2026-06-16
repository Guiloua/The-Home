const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 8000;
const ROOT_DIR = __dirname;
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

const server = http.createServer((req, res) => {
    // 处理跨域 (CORS)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // 静态文件服务
    if (req.method === 'GET' || req.method === 'HEAD') {
        const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
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
    }

    // Git 操作 API
    if (req.method === 'POST' && req.url === '/git-sync') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            const { action, message } = JSON.parse(body);
            
            let command = '';
            if (action === 'commit') {
                command = `git add . && git commit -m "${message || 'Update from admin'}"`;
            } else if (action === 'push') {
                command = `git push -u origin main`;
            }

            console.log(`执行命令: ${command}`);
            exec(command, (err, stdout, stderr) => {
                res.writeHead(err ? 500 : 200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: !err, 
                    output: stdout, 
                    error: stderr 
                }));
            });
        });
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
