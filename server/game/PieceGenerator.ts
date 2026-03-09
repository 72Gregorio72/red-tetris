export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

const ALL_PIECES: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

// Simple seeded PRNG (mulberry32)
function createSeededRng(seed: string): () => number {
	let h = 0;
	for (let i = 0; i < seed.length; i++) {
		h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
	}
	let s = h >>> 0;
	return () => {
		s |= 0;
		s = s + 0x6D2B79F5 | 0;
		let t = Math.imul(s ^ s >>> 15, 1 | s);
		t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
}

export class PieceGenerator {
	private sequence: PieceType[] = [];
	private index: number = 0;
	private rng: () => number;

	constructor(seed?: string) {
		this.rng = seed ? createSeededRng(seed) : Math.random;
		this.addBag();
		this.addBag();
		this.addBag();
	}

	private addBag() {
		const arr = [...ALL_PIECES];
		for (let i = arr.length - 1; i > 0; i--) {
			const j = Math.floor(this.rng() * (i + 1));
			[arr[i], arr[j]] = [arr[j]!, arr[i]!];
		}
		this.sequence.push(...arr);
	}

	public next(): PieceType {
		if (this.index >= this.sequence.length) {
			this.addBag();
		}
		return this.sequence[this.index++]!;
	}

	peek(count: number = 5): PieceType[] {
		while (this.index + count > this.sequence.length) {
			this.addBag();
		}
		return this.sequence.slice(this.index, this.index + count);
	}
	
	getSequence(): PieceType[] {
		return this.sequence;
	}

	getIndex(): number {
		return this.index;
	}
}