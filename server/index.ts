import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import { Server } from 'socket.io';
import { registerSocketHandlers } from './socket/handlers';
import { existsSync, readFileSync, statSync } from 'fs';
import { join, extname, resolve } from 'path';
import { fileURLToPath } from 'url';

const PORT = 3000;

// ─── Static file serving ───

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');
const CLIENT_DIR = resolve(__dirname, '..', 'dist');

const MIME_TYPES: Record<string, string> = {
	'.html': 'text/html',
	'.js':   'application/javascript',
	'.mjs':  'application/javascript',
	'.css':  'text/css',
	'.json': 'application/json',
	'.png':  'image/png',
	'.jpg':  'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif':  'image/gif',
	'.svg':  'image/svg+xml',
	'.ico':  'image/x-icon',
	'.woff': 'font/woff',
	'.woff2':'font/woff2',
	'.ttf':  'font/ttf',
	'.otf':  'font/otf',
	'.ogg':  'audio/ogg',
	'.mp3':  'audio/mpeg',
	'.wav':  'audio/wav',
	'.webp': 'image/webp',
};

function serveStatic(req: IncomingMessage, res: ServerResponse): void {
	const url = req.url?.split('?')[0] ?? '/';

	// Try the requested path first, then fall back to index.html (SPA)
	let filePath = join(CLIENT_DIR, url === '/' ? 'index.html' : url);

	if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
		// For SPA client-side routing: serve index.html for any non-file route
		const indexPath = join(CLIENT_DIR, 'index.html');
		if (existsSync(indexPath)) {
			const content = readFileSync(indexPath);
			res.writeHead(200, { 'Content-Type': 'text/html' });
			res.end(content);
			return;
		}
		res.writeHead(404, { 'Content-Type': 'text/plain' });
		res.end('Not Found');
		return;
	}

	const ext = extname(filePath).toLowerCase();
	const contentType = MIME_TYPES[ext] || 'application/octet-stream';
	const content = readFileSync(filePath);
	res.writeHead(200, { 'Content-Type': contentType });
	res.end(content);
}

// ─── HTTP + Socket.io server ───

const httpServer = createServer(serveStatic);

const io = new Server(httpServer, {
	cors: {
		origin: '*',
		methods: ['GET', 'POST'],
	},
});

io.on('connection', (socket) => {
	registerSocketHandlers(io, socket);
});

httpServer.listen(PORT, '0.0.0.0', () => {
	console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
	if (existsSync(CLIENT_DIR)) {
		console.log(`📦 Serving client from ${CLIENT_DIR}`);
	} else {
		console.log(`⚠️  Client build not found at ${CLIENT_DIR} — run "npm run build" first`);
	}
});
