import { createServer } from 'http';
import { Server } from 'socket.io';
import { registerSocketHandlers } from './socket/handlers';

const PORT = 3000;

// Crea un server HTTP semplice (Socket.io ha bisogno di un server HTTP)
const httpServer = createServer();

// Crea il server Socket.io con CORS abilitato per il dev server Vite
const io = new Server(httpServer, {
	cors: {
		origin: 'http://localhost:5173', // il dev server Vite
		methods: ['GET', 'POST'],
	},
});

// Quando un client si connette, registra tutti gli handler
io.on('connection', (socket) => {
	registerSocketHandlers(io, socket);
});

httpServer.listen(PORT, () => {
	console.log(`🚀 Socket.io server running on http://localhost:${PORT}`);
});
