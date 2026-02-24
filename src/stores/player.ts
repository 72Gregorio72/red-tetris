import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface IPlayer {
	id: string;
	name: string;
	score: number;
	isConnected: boolean;
	isAlive: boolean;
	isReady: boolean;
}

export const usePlayerStore = defineStore('player', () => {
	const player = ref<IPlayer | null>(null);

	function setPlayer(newPlayer: IPlayer) {
		player.value = newPlayer;
	}

	function setReady(ready: boolean) {
		if (player.value) {
			player.value.isConnected = ready;
		}
	}

	function updateScore(score: number) {
		if (player.value) {
			player.value.score = score;
		}
	}

	function reset() {
		if (player.value) {
			player.value.score = 0;
			player.value.isAlive = true;
			player.value.isReady = false;
		}
	}

	return { player, setPlayer, setReady, updateScore, reset };
});