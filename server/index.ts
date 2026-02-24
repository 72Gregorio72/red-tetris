import { createServer } from 'http';
import { Server } from 'socket.io';
import { registerSocketHandlers } from './socket/handlers';

const PORT = 3000;

const httpServer = createServer();

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
	console.log(`🚀 Socket.io server running on http://0.0.0.0:${PORT}`);
});
