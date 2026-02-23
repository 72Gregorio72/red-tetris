import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { IRoom, IRoomListItem } from '../../server/types/multiplayer';
import type { IPlayer } from '../../server/types/player';

export const useMultiplayerStore = defineStore('multiplayer', () => {
  const currentRoom = ref<IRoom | null>(null);

  const rooms = ref<IRoomListItem[]>([]);

  const opponents = ref<Map<string, number[][]>>(new Map());

  const isInRoom = computed(() => currentRoom.value !== null);

  const isHost = computed(() => {
    return (playerId: string) => currentRoom.value?.host?.id === playerId;
  });

  const playerCount = computed(() => currentRoom.value?.players.length ?? 0);

  function setRooms(roomList: IRoomListItem[]) {
    rooms.value = roomList;
  }

  function joinRoom(room: IRoom) {
    currentRoom.value = room;
  }

  function leaveRoom() {
    currentRoom.value = null;
    opponents.value.clear();
  }

  function updatePlayers(players: IPlayer[]) {
    if (currentRoom.value) {
      currentRoom.value.players = players;
    }
  }

  function setOpponentGrid(playerId: string, grid: number[][]) {
    opponents.value.set(playerId, grid);
  }

  function removeOpponent(playerId: string) {
    opponents.value.delete(playerId);
  }

  function reset() {
    currentRoom.value = null;
    rooms.value = [];
    opponents.value.clear();
  }

  return {
    currentRoom, rooms, opponents,
    isInRoom, isHost, playerCount,
    setRooms, joinRoom, leaveRoom, updatePlayers,
    setOpponentGrid, removeOpponent, reset,
  };
});