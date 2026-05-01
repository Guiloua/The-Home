const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 8000;

const server = http.createServer((req, res) => {
    // 处理跨域 (CORS)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // 静态文件服务
    if (req.method === 'GET') {
        let filePath = '.' + req.url;
        if (filePath === './') filePath = './index.html';
        
        const extname = path.extname(filePath);
        const contentType = {
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpg',
            '.pdf': 'application/pdf',
        }[extname] || 'text/plain';

        fs.readFile(filePath, (error, content) => {
            if (error) {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content, 'utf-8');
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
    console.log(`管理服务器已启动: http://localhost:${PORT}`);
    console.log(`访问管理页面: http://localhost:${PORT}/admin/index.html`);
});
