import { ref } from 'vue';
import { io, type Socket } from 'socket.io-client';

const socket = ref<Socket | null>(null);
const isConnected = ref(false);

export function useSocket() {
	function connect(url: string = `http://${window.location.hostname}:3000`) {
		if (socket.value?.connected) return;
		socket.value = io(url);

		socket.value.on('connect', () => {
			isConnected.value = true;
			console.log('Connected to server: ', socket.value?.id);
		});

		socket.value.on('disconnect', () => {
			isConnected.value = false;
			console.log('Disconnected from server');
		});

	}

	function disconnect() {
		socket.value?.disconnect();
		socket.value = null;
		isConnected.value = false;
	}

	function emit(event: string, ...args: any[]) {
		socket.value?.emit(event, ...args);
	}

	function on(event: string, callback: (...args: any[]) => void) {
		socket.value?.on(event, callback);
	}

	function off(event: string, callback?: (...args: any[]) => void) {
		socket.value?.off(event, callback);
	}

	return { socket, isConnected, connect, disconnect, emit, on, off };
}