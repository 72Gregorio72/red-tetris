<script setup lang="ts">
    import { computed } from 'vue';
    import { useMultiplayerStore } from '../../stores/multiplayer';

    const multiplayerStore = useMultiplayerStore();

    const emptyGrid = Array.from({ length: 20 }, () => Array(10).fill(0));

	const grid = computed(() => multiplayerStore.myDisplayGrid || emptyGrid);

	const isAlive = computed(() => multiplayerStore.isAlive);

    const getBlockClass = (cellValue: number) => {
        if (cellValue === 0) return 'empty';
        if (cellValue === 8) return 'penalty';
        return `piece-${cellValue}`;
    };

	const isPlatformer = computed(() => multiplayerStore.player ? multiplayerStore.player.isPlatformer : false);
	const charPos = computed(() => multiplayerStore.charPos);
	const charStyle = computed(() => {
		if (!charPos.value) return {};
		return {
			left: `${charPos.value.x * 30}px`,
			top: `${charPos.value.y * 30}px`
		};
	});

	const charParts = computed(() => {
		if (!charPos.value || !multiplayerStore.myGameState?.platformerChar?.shape) return [];
		// Mappiamo la posizione base + gli offset della forma
		return multiplayerStore.myGameState.platformerChar.shape.map((part: any) => ({
			x: charPos.value.x + part.dx,
			y: charPos.value.y + part.dy
		}));
	});
</script>

<template>
    <div class="grid-wrapper">
		<div class="grid" :class="{ 'dimmed': !isAlive }">
			<template v-if="isPlatformer && charParts.length">
				<div v-for="(part, index) in charParts" 
					:key="index"
					class="character-block"
					:style="{ 
						left: `${part.x * 30}px`, 
						top: `${part.y * 30}px` 
					}">
					<template v-if="index === 1">
						<div class="eye-left"></div>
						<div class="eye-right"></div>
					</template>
				</div>
			</template>
		</div>
	</div>
</template>

<style scoped>
    .game-container {
        display: flex;
        justify-content: center;
        align-items: center;
        background-color: #222;
        padding: 20px;
        position: relative;
    }

    .grid {
        display: grid;
        grid-template-columns: repeat(10, 30px);
        grid-template-rows: repeat(20, 30px);
        background-color: #000;
        border: 2px solid #555;
    }

    .dimmed {
        opacity: 0.3;
    }

    .block {
        width: 30px;
        height: 30px;
        box-sizing: border-box;
    }

    .empty {
        background-color: transparent;
        border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .penalty {
        background-color: #666;
        border: 1px solid #888;
    }

    .piece-1 { background-color: #00FFFF; border: 1px solid white; border-radius: 4px; }
    .piece-2 { background-color: #FFFF00; border: 1px solid white; border-radius: 4px; }
    .piece-3 { background-color: #800080; border: 1px solid white; border-radius: 4px; }
    .piece-4 { background-color: #00FF00; border: 1px solid white; border-radius: 4px; }
    .piece-5 { background-color: #FF0000; border: 1px solid white; border-radius: 4px; }
    .piece-6 { background-color: #0000FF; border: 1px solid white; border-radius: 4px; }
    .piece-7 { background-color: #FFA500; border: 1px solid white; border-radius: 4px; }

    .game-over {
        position: absolute;
        color: red;
        background: rgba(0,0,0,0.8);
        padding: 20px;
        border: 2px solid red;
        border-radius: 8px;
    }

	.character-block {
		position: absolute;
		width: 30px;
		height: 30px;
		background: #FF00FF;
		border: 2px solid #fff;
		box-sizing: border-box;
		z-index: 20;
		transition: all 0.05s linear;
		display: flex;
		justify-content: space-around;
		align-items: center;
	}
</style>