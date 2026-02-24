<script setup lang="ts">
import { computed } from 'vue';
import { useMultiplayerStore } from '../../stores/multiplayer';

const multiplayerStore = useMultiplayerStore();

// Genera una griglia vuota di sicurezza 20x10
const emptyGrid = Array.from({ length: 20 }, () => Array(10).fill(0));

const opponentGrids = computed(() => {
    // multiplayerStore.opponentsState contiene già { id, state, displayGrid } inviati dal server!
    return multiplayerStore.opponentsState.map(opp => {
        
        // Cerchiamo il nome del giocatore nella stanza
        const playerInfo = multiplayerStore.currentRoom?.players.find(p => p.id === opp.id);
        
        return {
            playerId: opp.id,
            playerName: playerInfo?.name || 'Unknown',
            grid: opp.displayGrid || emptyGrid, // Usiamo la griglia già unita dal server!
            isAlive: opp.state?.isAlive ?? true
        };
    });
});
</script>

<template>
    <div class="opponents-panel" v-if="opponentGrids.length > 0">
        <div
            v-for="opp in opponentGrids"
            :key="opp.playerId"
            class="opponent-card"
            :class="{ 'dimmed': !opp.isAlive }"
        >
            <h3 class="opponent-name">
                {{ opp.playerName }} 
                <span v-if="!opp.isAlive" class="dead-indicator"> (KO)</span>
            </h3>
            
            <div class="opponent-grid">
                <div
                    v-for="(row, y) in opp.grid"
                    :key="'row-'+y"
                    class="opponent-row"
                >
                    <div
                        v-for="(cell, x) in row"
                        :key="'cell-'+x"
                        class="opponent-cell"
                        :class="{
                            empty: cell === 0,
                            filled: cell > 0 && cell <= 7, // Pezzi normali (1-7)
                            penalty: cell === 8 // Righe di penalità
                        }"
                    />
                </div>
            </div>
        </div>
    </div>
    
    <div v-else class="waiting">
        <p>Waiting for opponents...</p>
    </div>
</template>

<style scoped>
.opponents-panel {
    display: flex;
    flex-direction: column;
    gap: 20px;
    align-items: center;
}

.opponent-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    transition: opacity 0.3s ease;
}

.dimmed {
    opacity: 0.3;
}

.opponent-name {
    color: #fff;
    font-size: 0.9rem;
    margin-bottom: 6px;
}

.dead-indicator {
    color: red;
    font-weight: bold;
}

.opponent-grid {
    display: flex;
    flex-direction: column;
    border: 2px solid #555;
    background-color: #000;
}

.opponent-row {
    display: flex;
}

/* Celle più piccole per gli avversari */
.opponent-cell {
    width: 15px;
    height: 15px;
    background-color: #111;
    border: 1px solid rgba(255, 255, 255, 0.05);
}

.opponent-cell.empty {
    background-color: transparent;
}

/* Tutti i pezzi dell'avversario li facciamo rossi per semplicità visiva, ma puoi usare i colori specifici se vuoi */
.opponent-cell.filled {
    background-color: red;
    border: 1px solid rgba(255, 255, 255, 0.3);
}

.opponent-cell.penalty {
    background-color: #666;
    border: 1px solid #888;
}

.waiting {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
}

.waiting p {
    color: #888;
    font-size: 0.9rem;
}
</style>