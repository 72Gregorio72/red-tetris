export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

const ALL_PIECES: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

function shuffleArray<T>(array: T[]): T[] {
	const arr = [...array];
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[j]] = [arr[j]!, arr[i]!];
	}
	return arr;
}

export class PieceGenerator {
	private sequence: PieceType[] = [];
	private index: number = 0;

	constructor() {
		this.addBag();
		this.addBag();
		this.addBag();
	}

	private addBag() {
		this.sequence.push(...shuffleArray(ALL_PIECES));
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